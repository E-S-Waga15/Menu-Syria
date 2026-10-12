"use client";

import Image from "next/image";

import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { toast } from "@/lib/toast";
import { ApiError } from "@/lib/api/client";

import { WhatsAppIcon } from "@/components/shared/brand-icons";
import { FieldError } from "@/components/shared/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/store";
import { placeExternalOrder } from "@/features/public-menu/services";
import {
  buildWhatsAppOrderUrl,
  formatPrice,
  type StorefrontCopy,
} from "@/features/public-menu/lib/format";
import { getSupportedFulfillment } from "@/features/public-menu/lib/fulfillment";
import {
  cartDetailsSchema,
  type CartDetailsValues,
} from "@/features/public-menu/schemas";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/fmt";
import type { Business, CatalogItem, FulfillmentMode } from "@/lib/types";
import {
  lineUnitPrice,
  selectCartTotal,
  useCartStore,
} from "@/stores/cart-store";
import { useOrderHistoryStore } from "@/stores/order-history-store";
import { useUiStore } from "@/stores/ui-store";

export function CartSheet({
  business,
  copy,
  onOpenItem,
  fulfillment,
  onFulfillmentChange,
  tableNumber: initialTableNumber,
}: {
  business: Business;
  /** opens the product panel for a line, closing this sheet on the way */
  onOpenItem: (item: CatalogItem) => void;
  copy: StorefrontCopy;
  fulfillment: FulfillmentMode;
  onFulfillmentChange: (mode: FulfillmentMode) => void;
  /** table id from the `?t=` QR link, if any */
  tableNumber?: string;
}) {
  const { t, lang } = useI18n();
  const isOpen = useUiStore((s) => s.isCartSheetOpen);
  const setOpen = useUiStore((s) => s.setCartSheetOpen);
  const session = useAuthStore((s) => s.session);
  const addOrderEntry = useOrderHistoryStore((s) => s.addEntry);

  const lines = useCartStore((s) => s.lines);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeLine = useCartStore((s) => s.removeLine);
  const clear = useCartStore((s) => s.clear);
  const subtotal = useCartStore(selectCartTotal);

  const supportedModes = getSupportedFulfillment(business);

  // no submit handler here — the WhatsApp link is the action, so the form
  // validates live and the URL recomputes from watched values
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CartDetailsValues>({
    resolver: zodResolver(cartDetailsSchema(t.validation)),
    defaultValues: {
      fulfillment,
      tableNumber: initialTableNumber ?? "",
      customerName: "",
      pickupTime: undefined,
      phone: "",
      address: "",
      notes: "",
    },
    mode: "onChange",
  });
  const [
    fulfillmentValue,
    tableNumber,
    customerName,
    pickupTime,
    phone,
    address,
    notes,
  ] = useWatch({
    control,
    name: [
      "fulfillment",
      "tableNumber",
      "customerName",
      "pickupTime",
      "phone",
      "address",
      "notes",
    ],
  });

  // the fee only ever applies to a delivery order — picking it up or eating
  // in never owes it, whatever the business has it set to
  const deliveryFee =
    fulfillmentValue === "delivery" ? (business.deliveryFee ?? 0) : 0;
  const total = subtotal + deliveryFee;

  const whatsappUrl = buildWhatsAppOrderUrl({
    business,
    lines,
    lang,
    copy,
    currency: t.common.currency,
    subtotal: deliveryFee > 0 ? subtotal : undefined,
    deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
    total,
    fulfillment: fulfillmentValue,
    tableNumber:
      fulfillmentValue === "dineIn"
        ? tableNumber.trim() || undefined
        : undefined,
    customerName: customerName.trim() || undefined,
    pickupTime: fulfillmentValue === "pickup" ? pickupTime : undefined,
    phone:
      fulfillmentValue === "delivery" ? phone.trim() || undefined : undefined,
    address:
      fulfillmentValue === "delivery" ? address.trim() || undefined : undefined,
    notes: notes.trim() || undefined,
  });

  /**
   * Which routes the business's plan actually offers. Undefined means the
   * business predates the field, so both stay on — never fewer options than
   * before because of a missing value.
   */
  const channels = business.orderChannels ?? ["platform", "whatsapp"];

  const recordOrder = () => {
    if (session?.role !== "user") return;
    addOrderEntry({
      id: crypto.randomUUID(),
      customerId: session.identifier,
      businessId: business.id,
      businessSlug: business.slug,
      businessType: "cuisine" in business ? "restaurant" : "store",
      businessName: business.name,
      fulfillment: fulfillmentValue,
      lines,
      total,
      createdAt: new Date().toISOString(),
    });
  };

  /** WhatsApp hand-off: the link opens, we just log the order on the way out */
  const handleSend = () => recordOrder();

  /**
   * platform route: submit the order to the backend, then hand it over via
   * the WhatsApp link the response carries — that is how the order
   * physically reaches the business. An offer bundle in the cart (its
   * synthetic `offer-` id has no catalog item behind it for the endpoint to
   * validate) or a missing contact phone falls back to the direct WhatsApp
   * link so no order is lost on its way out.
   */
  const placeOrder = async (values: CartDetailsValues) => {
    const customerName = values.customerName.trim();
    const customerPhone = values.phone?.trim() ?? "";
    const canSubmitPlatform =
      customerName &&
      customerPhone &&
      lines.every((line) => !line.item.id.startsWith("offer-"));

    if (!canSubmitPlatform) {
      recordOrder();
      window.open(whatsappUrl, "_blank");
      toast.success(copy.orderPlacedTitle);
      clear();
      setOpen(false);
      return;
    }

    try {
      const response = await placeExternalOrder(business.slug, {
        customerName,
        customerPhone,
        notes: values.notes.trim() || undefined,
        items: lines.map((line) => ({
          itemId: line.item.id,
          quantity: line.quantity,
        })),
      });

      recordOrder();
      if (response.whatsappLink) window.open(response.whatsappLink, "_blank");
      toast.success(copy.orderPlacedTitle);
      clear();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.auth.genericError);
    }
  };

  const pickupTimeItems: Record<string, string> = {
    asap: copy.pickupTimeAsap,
    "15m": copy.pickupTime15,
    "30m": copy.pickupTime30,
    "1h": copy.pickupTime60,
  };

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="bottom"
        // scrollbar-none hides the bar but keeps overflow-y-auto, so a long
        // order still scrolls by wheel, touch drag and keyboard
        // mx-3/mb-3 lift the panel off the phone's edges (the sheet itself is
        // inset-x-0, and margin composes with that); from `sm` it goes back to
        // a centred, edge-anchored sheet
        className="mx-3 mb-3 max-h-[88dvh] overflow-y-auto rounded-3xl pb-6 scrollbar-none sm:mx-auto sm:mb-0 sm:max-w-2xl sm:rounded-b-none sm:rounded-t-3xl"
        // the header carries the close now, so the floating one would double it
        showCloseButton={false}
      >
        <SheetHeader className="rounded-t-3xl">
          <SheetTitle className="text-lg">{copy.yourOrder}</SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <ShoppingBag className="size-10 text-muted-foreground/40" />
            <p className="font-semibold">{copy.emptyCart}</p>
            <p className="text-sm text-muted-foreground">
              {copy.emptyCartBody}
            </p>
          </div>
        ) : (
          <div className="space-y-5 px-4">
            <ul className="divide-y divide-border/70">
              {lines.map((line) => (
                <li key={line.key} className="flex items-center gap-3 py-3">
                  {/* image and name both lead back to the product, for a
                      customer who wants to re-read the details before
                      confirming — the sheet closes as the panel opens */}
                  <button
                    type="button"
                    onClick={() => onOpenItem(line.item)}
                    // cursor-pointer is explicit: the UA stylesheet gives
                    // <button> `cursor: default`, and nothing in the reset
                    // overrides it — so the hand has to be asked for, and it is
                    // the main hint that this line leads somewhere
                    className="group/line flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {line.item.imageUrl ? (
                      <Image
                        src={line.item.imageUrl}
                        alt=""
                        width={56}
                        height={56}
                        className="size-14 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-berry-soft text-lg font-bold text-berry-soft-foreground">
                        {line.item.name[lang].charAt(0)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold transition-colors duration-200 group-hover/line:text-[var(--menu-primary)]">
                        {line.item.name[lang]}
                      </p>
                      {line.options.length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {line.options.map((o) => o.id).join("، ")}
                        </p>
                      )}
                      <p className="mt-0.5 text-sm font-bold text-[var(--menu-primary)]">
                        {formatPrice(
                          lineUnitPrice(line) * line.quantity,
                          t.common.currency,
                        )}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="-"
                      onClick={() => setQuantity(line.key, line.quantity - 1)}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-7 text-center text-sm font-bold">
                      {line.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="+"
                      onClick={() => setQuantity(line.key, line.quantity + 1)}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.common.delete}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeLine(line.key)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>

            {/* notes come before the fulfillment switch: what you want changed
                about the food is a thought you have while looking at the list,
                not after you have decided how to collect it */}
            <div className="space-y-1.5">
              <Label htmlFor="cart-notes">{copy.orderNotes}</Label>
              <Textarea
                id="cart-notes"
                rows={2}
                placeholder={copy.orderNotesPlaceholder}
                {...register("notes")}
              />
            </div>

            {supportedModes.length > 1 && (
              <Controller
                control={control}
                name="fulfillment"
                render={({ field }) => (
                  <div className="flex gap-2">
                    {supportedModes.map((mode) => {
                      const modeLabel =
                        mode === "dineIn"
                          ? copy.fulfillmentDineIn
                          : mode === "pickup"
                            ? copy.fulfillmentPickup
                            : copy.fulfillmentDelivery;
                      const isActive = field.value === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            field.onChange(mode);
                            onFulfillmentChange(mode);
                          }}
                          // the Sheet portals to document.body, outside the
                          // element that defines --menu-primary as an inline
                          // custom property, so the CSS var doesn't inherit
                          // here — set the business color directly instead
                          style={
                            isActive
                              ? { backgroundColor: business.theme.primaryColor }
                              : undefined
                          }
                          className={
                            isActive
                              ? "flex-1 rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors duration-200"
                              : "flex-1 rounded-full bg-surface-container px-4 py-2 text-sm font-semibold text-foreground/70 transition-colors duration-200 hover:bg-surface-container-high"
                          }
                        >
                          {modeLabel}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {fulfillmentValue === "dineIn" && (
                <div className="space-y-1.5">
                  <Label htmlFor="cart-table">
                    {copy.tableNumber}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({t.common.optional})
                    </span>
                  </Label>
                  <Input
                    id="cart-table"
                    inputMode="numeric"
                    aria-invalid={!!errors.tableNumber}
                    className="h-10"
                    {...register("tableNumber")}
                  />
                  <FieldError message={errors.tableNumber?.message} />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="cart-name">
                  {copy.customerName}{" "}
                  {fulfillmentValue === "dineIn" && (
                    <span className="font-normal text-muted-foreground">
                      ({t.common.optional})
                    </span>
                  )}
                </Label>
                <Input
                  id="cart-name"
                  aria-invalid={!!errors.customerName}
                  className="h-10"
                  {...register("customerName")}
                />
                <FieldError message={errors.customerName?.message} />
              </div>

              {fulfillmentValue === "pickup" && (
                <div className="space-y-1.5">
                  <Label>{copy.pickupTimeLabel}</Label>
                  <Controller
                    control={control}
                    name="pickupTime"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(v) => v && field.onChange(v)}
                        items={pickupTimeItems}
                      >
                        <SelectTrigger
                          className="h-10 w-full"
                          aria-invalid={!!errors.pickupTime}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(pickupTimeItems).map(
                            ([id, label]) => (
                              <SelectItem key={id} value={id}>
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError message={errors.pickupTime?.message} />
                </div>
              )}

              {fulfillmentValue === "delivery" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="cart-phone">{copy.phoneLabel}</Label>
                    <Input
                      id="cart-phone"
                      type="tel"
                      dir="ltr"
                      aria-invalid={!!errors.phone}
                      className="h-10"
                      {...register("phone")}
                    />
                    <FieldError message={errors.phone?.message} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="cart-address">{copy.addressLabel}</Label>
                    <Textarea
                      id="cart-address"
                      rows={2}
                      placeholder={copy.addressPlaceholder}
                      aria-invalid={!!errors.address}
                      {...register("address")}
                    />
                    <FieldError message={errors.address?.message} />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1.5 border-t border-border/70 pt-4">
              {/* a breakdown only appears once there is a fee to break
                  out — a single total reads cleaner for pickup/dine-in and
                  for a business that delivers for free */}
              {deliveryFee > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {copy.cartSubtotal}
                    </span>
                    <span className="font-semibold">
                      {formatPrice(subtotal, t.common.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {copy.cartDeliveryFee}
                    </span>
                    <span className="font-semibold">
                      {formatPrice(deliveryFee, t.common.currency)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">
                  {copy.cartTotal}
                </span>
                <span className="font-heading text-xl font-bold text-[var(--menu-primary)]">
                  {formatPrice(total, t.common.currency)}
                </span>
              </div>
            </div>

            {business.paymentQrCode && (
              <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-surface-container-low p-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-white p-1.5">
                  <Image
                    src={business.paymentQrCode}
                    alt=""
                    fill
                    sizes="80px"
                    unoptimized={business.paymentQrCode.startsWith("data:")}
                    className="object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold">{copy.payViaShamCash}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {copy.shamCashHint}
                  </p>
                </div>
              </div>
            )}

            {/* the plan decides which routes exist; a business on one channel
                gets one button, not a second one greyed out */}
            <div className="space-y-2">
              {business.isOpen ? (
                <>
                  <p className="text-center text-sm font-semibold text-muted-foreground">
                    {copy.confirmOrderTitle}
                  </p>

                  {channels.includes("platform") && (
                    <button
                      type="button"
                      onClick={handleSubmit(placeOrder)}
                      // the Sheet portals outside the element declaring
                      // --menu-primary, so the brand colour is set directly
                      style={{ backgroundColor: business.theme.primaryColor }}
                      className="flex w-full transform-gpu items-center justify-center gap-2.5 rounded-2xl py-4 text-base font-bold text-white transition-[scale] duration-200 ease-smooth hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <ShoppingBag className="size-5" />
                      {copy.orderViaPlatform}
                    </button>
                  )}

                  {channels.includes("whatsapp") && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleSend}
                      className="flex w-full transform-gpu items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] py-4 text-base font-bold text-white transition-[scale] duration-200 ease-smooth hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <WhatsAppIcon className="size-5" />
                      {copy.orderViaWhatsapp}
                    </a>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-2xl bg-muted py-4 text-base font-bold text-muted-foreground"
                >
                  {fmt(copy.closedCannotOrder, {
                    time: business.opensAt?.[lang] ?? "",
                  })}
                </button>
              )}

              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => clear()}
              >
                {copy.clearCart}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
