import { fmt } from "@/i18n/fmt";
import type { Dictionary } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { BusinessOpenStatus } from "@/lib/business-hours";
import { lineUnitPrice, type CartLine } from "@/stores/cart-store";
import type { Business, CurrencyCode, FulfillmentMode } from "@/lib/types";

/**
 * The storefront label pack: the `menu` dictionary section for restaurants,
 * the `storeFront` section for e-commerce stores — same keys, different words.
 */
export type StorefrontCopy = Dictionary["menu"];

/**
 * `pickupTime` is either the literal "asap" or an exact "HH:mm" (24h) the
 * customer picked from the pickup-time modal — formatted here as a 12-hour
 * clock reading ("4:30 م"/"4:30 PM") for both the on-screen summary and the
 * WhatsApp message, so the two never say the time differently.
 */
export function formatPickupTime(value: string, copy: StorefrontCopy): string {
  if (value === "asap") return copy.pickupTimeAsap;
  const [hourStr, minuteStr] = value.split(":");
  const hour24 = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour24) || Number.isNaN(minute)) return value;
  const period = hour24 >= 12 ? copy.pickupPeriodPM : copy.pickupPeriodAM;
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
}

/**
 * Turns a closed business's `BusinessOpenStatus` into one ready sentence —
 * "opens today at 4 PM" / "opens tomorrow at 9 AM" / "closed today — opens
 * Wednesday at 9 AM" — picking the wording by how many days out the next
 * published opening falls, so a customer never reads a bare time with no
 * idea whether that's later today or three days from now.
 */
export function describeClosedUntil(
  status: BusinessOpenStatus,
  copy: StorefrontCopy,
  t: Dictionary,
): string {
  if (status.opensAt === null) return copy.closedCannotOrderGeneric;
  const time = formatPickupTime(status.opensAt, copy);
  if (status.opensInDays === 0) return fmt(copy.closedOpensToday, { time });
  if (status.opensInDays === 1) return fmt(copy.closedOpensTomorrow, { time });
  if (status.opensDayIndex !== null) {
    return fmt(copy.closedOpensOnDay, {
      day: t.restaurant.dayNames[status.opensDayIndex],
      time,
    });
  }
  return copy.closedCannotOrderGeneric;
}

const fulfillmentLabel: Record<FulfillmentMode, keyof StorefrontCopy> = {
  dineIn: "fulfillmentDineIn",
  pickup: "fulfillmentPickup",
  delivery: "fulfillmentDelivery",
};

export function currencyLabel(
  currency: CurrencyCode | string,
  lang: "ar" | "en" = "ar",
): string {
  return currency === "USD"
    ? lang === "ar"
      ? "دولار"
      : "$"
    : lang === "ar"
      ? "ل.س"
      : "SYP";
}

export function formatPrice(
  price: number | null | undefined,
  currency: CurrencyCode | string,
  lang: "ar" | "en" = "ar",
): string {
  const label = currencyLabel(currency, lang);
  // shown exactly as the backend sends it — no rounding anywhere in this
  // platform; a decimal (e.g. an exact commission split) stays a decimal.
  // Every call site is responsible for wrapping this in `dir="ltr"` (an
  // isolate baked in here instead broke the order everywhere it was
  // already rendered correctly with an explicit `dir="ltr"` wrapper).
  return `${(price ?? 0).toLocaleString("en-US")} ${label}`;
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
  /** "asap", or the exact "HH:mm" (24h) time the customer picked */
  pickupTime?: string;
  phone?: string;
  address?: string;
  notes?: string;
}): string {
  const parts: string[] = [
    fmt(copy.whatsappGreeting, { restaurant: business.name[lang] }),
    "",
    ...lines.map((line) => {
      // a single-choice pick (size) reads as part of the dish's own name —
      // "Shawarma Large", not "Shawarma (Large)"; a multiple-choice pick
      // (add-ons) stays a separate "with X with Y" clause. Both price the
      // same way now — `priceDelta` adds to the base price either way —
      // this is purely a naming/grouping difference, not a pricing one
      const singleOption = line.options.find((o) => o.selectionType === "single");
      const multiOptions = line.options.filter(
        (o) => o.selectionType === "multiple",
      );
      // a "customAmount" pick (the customer typed their own final price —
      // e.g. a kilo of shawarma normally 1000, ordered worth 700 instead)
      // reads as its own clause: `1× Shawarma "worth" 700 SYP`, not the
      // usual trailing "— total", since the amount already is the total
      const customAmountOption = line.options.find(
        (o) => o.selectionType === "customAmount",
      );
      if (customAmountOption) {
        const amount = line.item.price + customAmountOption.priceDelta;
        const name = [
          line.item.name[lang],
          ...multiOptions.map((o) => `${copy.withOption} ${o.id}`),
        ].join(" ");
        return `• ${line.quantity}× ${name} "${copy.customAmountLabel}" ${formatPrice(
          amount,
          line.item.currency ?? currency,
          lang,
        )}`;
      }
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
      fmt(copy.whatsappPickupTime, { time: formatPickupTime(pickupTime, copy) }),
    );
  if (phone) parts.push(fmt(copy.whatsappPhone, { phone }));
  if (address) parts.push(fmt(copy.whatsappAddress, { address }));
  if (notes) parts.push(fmt(copy.whatsappNotes, { notes }));

  const waPhone = business.whatsapp.replace(/[+\s]/g, "");
  return `https://wa.me/${waPhone}?text=${encodeURIComponent(parts.join("\n"))}`;
}
