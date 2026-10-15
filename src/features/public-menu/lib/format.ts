import { fmt } from "@/i18n/fmt";
import type { Dictionary } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { lineUnitPrice, type CartLine } from "@/stores/cart-store";
import type { Business, CurrencyCode, FulfillmentMode } from "@/lib/types";

/**
 * The storefront label pack: the `menu` dictionary section for restaurants,
 * the `storeFront` section for e-commerce stores — same keys, different words.
 */
export type StorefrontCopy = Dictionary["menu"];

type PickupTime = "asap" | "15m" | "30m" | "1h";

const pickupTimeLabel: Record<PickupTime, keyof StorefrontCopy> = {
  asap: "pickupTimeAsap",
  "15m": "pickupTime15",
  "30m": "pickupTime30",
  "1h": "pickupTime60",
};

const fulfillmentLabel: Record<FulfillmentMode, keyof StorefrontCopy> = {
  dineIn: "fulfillmentDineIn",
  pickup: "fulfillmentPickup",
  delivery: "fulfillmentDelivery",
};

export function formatPrice(
  price: number | null | undefined,
  currency: CurrencyCode | string,
  lang: "ar" | "en" = "ar",
): string {
  const label =
    currency === "USD"
      ? lang === "ar"
        ? "دولار"
        : "$"
      : lang === "ar"
        ? "ل.س"
        : "SYP";
  // shown exactly as the backend sends it — no rounding anywhere in this
  // platform; a decimal (e.g. an exact commission split) stays a decimal.
  // Wrapped in U+2066/U+2069 (an LTR isolate): without it, a caller that
  // renders this inside RTL text without its own `dir="ltr"` gets the
  // Arabic currency word reordered in FRONT of the number by the browser's
  // bidi algorithm ("دولار 105" instead of "105 دولار") — the isolate
  // guarantees "number then currency" everywhere this string lands,
  // regardless of whether the call site remembered `dir="ltr"`.
  return `⁦${(price ?? 0).toLocaleString("en-US")} ${label}⁩`;
}

/** Builds the pre-formatted WhatsApp order message and returns a wa.me URL. */
export function buildWhatsAppOrderUrl({
  business,
  lines,
  lang,
  copy,
  currency,
  subtotal,
  deliveryFee,
  total,
  fulfillment,
  tableNumber,
  customerName,
  pickupTime,
  phone,
  address,
  notes,
}: {
  business: Pick<Business, "name" | "whatsapp">;
  lines: CartLine[];
  lang: Locale;
  copy: StorefrontCopy;
  currency: string;
  /** items-only total; omit to skip the subtotal/fee breakdown entirely
   * (no delivery fee in play) */
  subtotal?: number;
  deliveryFee?: number;
  /** what the customer actually owes — subtotal + delivery fee, when both apply */
  total: number;
  fulfillment: FulfillmentMode;
  tableNumber?: string;
  customerName?: string;
  pickupTime?: PickupTime;
  phone?: string;
  address?: string;
  notes?: string;
}): string {
  const parts: string[] = [
    fmt(copy.whatsappGreeting, { restaurant: business.name[lang] }),
    "",
    ...lines.map((line) => {
      // a single-choice pick (size) reads as part of the dish's own name —
      // "Shawarma Large", not "Shawarma (Large)" — since its price already
      // replaced the base price rather than adding to it; a multiple-choice
      // pick (add-ons) stays a separate "with X with Y" clause, since those
      // genuinely stack on whatever price came before them
      const singleOption = line.options.find((o) => o.selectionType === "single");
      const multiOptions = line.options.filter(
        (o) => o.selectionType === "multiple",
      );
      const name = [
        line.item.name[lang],
        singleOption?.id,
        ...multiOptions.map((o) => `${copy.withOption} ${o.id}`),
      ]
        .filter(Boolean)
        .join(" ");
      return `• ${line.quantity}× ${name} — ${formatPrice(
        lineUnitPrice(line) * line.quantity,
        line.item.currency ?? currency,
        lang,
      )}`;
    }),
    "",
  ];

  // a breakdown only earns its place when there is something to break down —
  // a flat total reads cleaner when delivery never entered the picture
  if (deliveryFee !== undefined && subtotal !== undefined) {
    parts.push(
      fmt(copy.whatsappSubtotal, { subtotal: formatPrice(subtotal, currency, lang) }),
      fmt(copy.whatsappDeliveryFee, {
        fee:
          deliveryFee > 0
            ? formatPrice(deliveryFee, currency, lang)
            : copy.cartFreeDelivery,
      }),
    );
  }

  parts.push(
    fmt(copy.whatsappTotal, { total: formatPrice(total, currency, lang) }),
    fmt(copy.whatsappFulfillment, {
      fulfillment: copy[fulfillmentLabel[fulfillment]],
    }),
  );

  if (tableNumber) parts.push(fmt(copy.whatsappTable, { table: tableNumber }));
  if (customerName) parts.push(fmt(copy.whatsappName, { name: customerName }));
  if (pickupTime)
    parts.push(
      fmt(copy.whatsappPickupTime, { time: copy[pickupTimeLabel[pickupTime]] }),
    );
  if (phone) parts.push(fmt(copy.whatsappPhone, { phone }));
  if (address) parts.push(fmt(copy.whatsappAddress, { address }));
  if (notes) parts.push(fmt(copy.whatsappNotes, { notes }));

  const waPhone = business.whatsapp.replace(/[+\s]/g, "");
  return `https://wa.me/${waPhone}?text=${encodeURIComponent(parts.join("\n"))}`;
}
