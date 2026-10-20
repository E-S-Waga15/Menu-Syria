"use client";

import Image from "next/image";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Check,
  Copy,
  Download,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { toast } from "@/lib/toast";
import { ApiError } from "@/lib/api/client";
import { qrFileName } from "@/lib/qr-filename";

import { WhatsAppIcon } from "@/components/shared/brand-icons";
import { FieldError } from "@/components/shared/field-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  describeClosedUntil,
  formatPickupTime,
  formatPrice,
  type StorefrontCopy,
} from "@/features/public-menu/lib/format";
import { getSupportedFulfillment } from "@/features/public-menu/lib/fulfillment";
import { getBusinessOpenStatus } from "@/lib/business-hours";
import {
  cartDetailsSchema,
  type CartDetailsValues,
} from "@/features/public-menu/schemas";
import { useI18n } from "@/i18n/client";
import type { Business, CatalogItem, FulfillmentMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  lineUnitPrice,
  selectCartTotal,
  useCartStore,
} from "@/stores/cart-store";
import { useOrderHistoryStore } from "@/stores/order-history-store";
import { useUiStore } from "@/stores/ui-store";


const PICKUP_HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const PICKUP_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

/**
 * "15 دقيقة / 30 دقيقة / ساعة" quick options didn't give the customer what
 * they actually wanted — an exact clock time ("4:30 مساءً"). This opens a
 * small modal with hour/minute/AM-PM pickers instead; the chosen time is
 * stored as "HH:mm" (24h) and only ever formatted for display, both here
 * and in the WhatsApp message, by the shared `formatPickupTime`.
 */
function PickupTimePicker({
  value,
  onChange,
  invalid,
  copy,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  invalid?: boolean;
  copy: StorefrontCopy;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const isCustomTime = !!value && value !== "asap";
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<"AM" | "PM">("PM");

  const openPicker = () => {
    if (isCustomTime) {
      const [h, m] = value.split(":").map(Number);
      setPeriod(h >= 12 ? "PM" : "AM");
      setHour(h % 12 || 12);
      setMinute(m - (m % 5));
    }
    setOpen(true);
  };

  const confirm = () => {
    const hour24 = period === "PM" ? (hour % 12) + 12 : hour % 12;
    onChange(`${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    setOpen(false);
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange("asap")}
        aria-pressed={value === "asap"}
        className={cn(
          "h-10 flex-1 rounded-lg border px-3 text-sm font-semibold transition-colors",
          value === "asap"
            ? "border-primary/40 bg-primary/5 text-primary"
            : "border-input text-foreground/80 hover:bg-accent",
        )}
      >
        {copy.pickupTimeAsap}
      </button>
      <button
        type="button"
        onClick={openPicker}
        aria-pressed={isCustomTime}
        className={cn(
          "h-10 flex-1 rounded-lg border px-3 text-sm font-semibold transition-colors",
          isCustomTime
            ? "border-primary/40 bg-primary/5 text-primary"
            : "border-input text-foreground/80 hover:bg-accent",
          invalid && "border-destructive",
        )}
      >
        {isCustomTime ? formatPickupTime(value, copy) : copy.pickupTimePickButton}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{copy.pickupTimeModalTitle}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2" dir="ltr">
            <Select
              value={String(hour)}
              onValueChange={(v) => v && setHour(Number(v))}
              items={Object.fromEntries(PICKUP_HOURS.map((h) => [String(h), String(h)]))}
            >
              <SelectTrigger className="h-11 w-full" aria-label={copy.pickupHourLabel}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PICKUP_HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(minute)}
              onValueChange={(v) => v && setMinute(Number(v))}
              items={Object.fromEntries(
                PICKUP_MINUTES.map((m) => [String(m), m.toString().padStart(2, "0")]),
              )}
            >
              <SelectTrigger className="h-11 w-full" aria-label={copy.pickupMinuteLabel}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PICKUP_MINUTES.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m.toString().padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={period}
              onValueChange={(v) => v && setPeriod(v as "AM" | "PM")}
              items={{ AM: copy.pickupPeriodAM, PM: copy.pickupPeriodPM }}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AM">{copy.pickupPeriodAM}</SelectItem>
                <SelectItem value="PM">{copy.pickupPeriodPM}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" className="mt-2 w-full" onClick={confirm}>
            {t.common.confirm}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
  const removeLineOption = useCartStore((s) => s.removeLineOption);
  const clear = useCartStore((s) => s.clear);
  const subtotal = useCartStore(selectCartTotal);

  const supportedModes = getSupportedFulfillment(business);
  // derived from the real published schedule, not a manually-toggled flag
  // the backend computes `isOpen` from the real published schedule itself —
  // trust it directly for the boolean; the backend doesn't compute a next-
  // opens-at time, so that part is still derived here from the schedule
  const businessIsOpen = business.isOpen;
  const businessOpenStatus = getBusinessOpenStatus(business.openingHours);
  const branches = business.branches ?? [];
  // null = main branch, kept as the default selection — never sent to the
  // backend as a literal "main" value, see placeOrder's `branchId ?? undefined`
  const [branchId, setBranchId] = useState<string | null>(null);
  const selectedBranch = branches.find((b) => b.id === branchId) ?? null;

  // no submit handler here — the WhatsApp link is the action, so the form
  // validates live and the URL recomputes from watched values
  const {
    register,
    control,
    handleSubmit,
    trigger,
    formState: { errors, isValid },
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
    // a selected branch's own number receives the order instead of the
    // business's main WhatsApp — nothing else about the order changes
    business: selectedBranch
      ? { ...business, whatsapp: selectedBranch.phone }
      : business,
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
    phone: phone.trim() || undefined,
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

  const paymentQrFileName = qrFileName([
    t.common.paymentCodeWord,
    "cuisine" in business ? t.common.restaurantWord : t.common.storeWord,
    business.name[lang],
  ]);

  // a plain `<a download>` only works same-origin — payment QR images now
  // live on Cloudinary (cross-origin), so the browser silently ignores
  // `download` there and just opens the image instead. Fetching it as a
  // blob first and downloading from an object URL works regardless of
  // origin, as long as the host allows the fetch (Cloudinary does).
  const downloadPaymentQr = async () => {
    if (!business.paymentQrCode) return;
    try {
      const response = await fetch(business.paymentQrCode);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = paymentQrFileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t.restaurant.shareFailed);
    }
  };

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
        branchId: branchId ?? undefined,
        items: lines.map((line) => ({
          itemId: line.item.id,
          quantity: line.quantity,
          options: line.options.length
            ? line.options.map((o) =>
                o.selectionType === "customAmount"
                  ? { id: o.id, amount: line.item.price + o.priceDelta }
                  : { id: o.id },
              )
            : undefined,
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
              {lines.map((line) => {
                // a single-choice pick (size) replaces the price and reads
                // as part of the dish's own name; a multiple-choice pick
                // (add-ons) stacks on top and gets its own removable row —
                // the split the cart needs to tell "350 total" from "+100 each"
                const singleOption = line.options.find(
                  (o) => o.selectionType === "single",
                );
                const multiOptions = line.options.filter(
                  (o) => o.selectionType === "multiple",
                );
                // a customAmount group has no predefined option — the
                // customer's typed final price is recovered from the base
                // price + its priceDelta, same way a "single" option's own
                // final price is shown everywhere else
                const customAmountOption = line.options.find(
                  (o) => o.selectionType === "customAmount",
                );
                return (
                  <li key={line.key} className="py-3">
                  <div className="flex items-center gap-3">
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
                          quality={90}
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
                          {singleOption && (
                            <span className="font-normal text-muted-foreground">
                              {" "}
                              — {singleOption.id}
                            </span>
                          )}
                          {customAmountOption && (
                            <span className="font-normal text-muted-foreground">
                              {" "}
                              — {copy.customAmountLabel}{" "}
                              {formatPrice(
                                line.item.price + customAmountOption.priceDelta,
                                t.common.currency,
                              )}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-[var(--menu-primary)]">
                          {formatPrice(
                            lineUnitPrice(line) * line.quantity,
                            t.common.currency,
                          )}
                        </p>
                      </div>
                    </button>
                    {line.item.quantityLocked ? (
                      <span className="shrink-0 text-sm font-bold text-muted-foreground">
                        1×
                      </span>
                    ) : (
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
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.common.delete}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeLine(line.key)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  {multiOptions.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 ps-[68px] text-xs">
                      <span className="text-muted-foreground">
                        {t.menu.withOption}
                      </span>
                      {multiOptions.map((option) => (
                        <span
                          key={option.id}
                          className="flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 font-semibold"
                        >
                          {option.id}
                          <button
                            type="button"
                            aria-label={t.common.delete}
                            onClick={() => removeLineOption(line.key, option.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  </li>
                );
              })}
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

            {branches.length > 0 && (
              <div className="space-y-1.5">
                <Label>{t.restaurant.orderFromBranch}</Label>
                {/* same card shape as the branch picker on the business
                    details page, not a plain dropdown — a logo/location
                    is easier to tell apart at a glance than text in a list */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setBranchId(null)}
                    aria-pressed={branchId === null}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-start transition-colors duration-200",
                      branchId === null
                        ? "border-[var(--menu-primary)]/40 bg-[var(--menu-primary)]/5"
                        : "border-border/60 hover:bg-surface-container-low",
                    )}
                  >
                    {business.logoUrl ? (
                      <Image
                        src={business.logoUrl}
                        alt=""
                        width={32}
                        height={32}
                        quality={90}
                        className="size-8 shrink-0 rounded-xl border border-border/60 object-cover"
                      />
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <Building2 className="size-3.5" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {business.name[lang]}
                    </span>
                    {branchId === null && (
                      <Check className="size-4 shrink-0 text-[var(--menu-primary)]" />
                    )}
                  </button>
                  {branches.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => setBranchId(branch.id)}
                      aria-pressed={branchId === branch.id}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-start transition-colors duration-200",
                        branchId === branch.id
                          ? "border-[var(--menu-primary)]/40 bg-[var(--menu-primary)]/5"
                          : "border-border/60 hover:bg-surface-container-low",
                      )}
                    >
                      {branch.logoUrl ? (
                        <Image
                          src={branch.logoUrl}
                          alt=""
                          width={32}
                          height={32}
                          quality={90}
                          className="size-8 shrink-0 rounded-xl border border-border/60 object-cover"
                        />
                      ) : (
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                          <Building2 className="size-3.5" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {branch.name}
                        </span>
                        {branch.address && (
                          <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{branch.address}</span>
                          </span>
                        )}
                      </span>
                      {branchId === branch.id && (
                        <Check className="size-4 shrink-0 text-[var(--menu-primary)]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
              {/* name + phone are required for every fulfillment mode */}
              <div className="space-y-1.5">
                <Label htmlFor="cart-name">{copy.customerName}</Label>
                <Input
                  id="cart-name"
                  placeholder={copy.customerNamePlaceholder}
                  aria-invalid={!!errors.customerName}
                  className="h-10"
                  {...register("customerName")}
                />
                <FieldError message={errors.customerName?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cart-phone">{copy.phoneLabel}</Label>
                <Input
                  id="cart-phone"
                  type="tel"
                  dir="ltr"
                  placeholder={copy.phonePlaceholder}
                  aria-invalid={!!errors.phone}
                  className="h-10"
                  {...register("phone")}
                />
                <FieldError message={errors.phone?.message} />
              </div>

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

              {fulfillmentValue === "pickup" && (
                <div className="space-y-1.5">
                  <Label>{copy.pickupTimeLabel}</Label>
                  <Controller
                    control={control}
                    name="pickupTime"
                    render={({ field }) => (
                      <PickupTimePicker
                        value={field.value}
                        onChange={field.onChange}
                        invalid={!!errors.pickupTime}
                        copy={copy}
                      />
                    )}
                  />
                  <FieldError message={errors.pickupTime?.message} />
                </div>
              )}

              {fulfillmentValue === "delivery" && (
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
              {/* delivery selected and free — say so explicitly rather than
                  leaving the customer to guess why no fee line appeared */}
              {fulfillmentValue === "delivery" && deliveryFee === 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {copy.cartDeliveryFee}
                  </span>
                  <span className="font-semibold text-success">
                    {copy.cartFreeDelivery}
                  </span>
                </div>
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

            {(business.paymentQrCode || business.paymentCode) && (
              <div className="rounded-2xl border border-border/70 bg-surface-container-low p-4">
                <p className="text-sm font-bold">{copy.payViaShamCash}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {copy.shamCashHint}
                </p>

                <div className="mt-3 flex flex-wrap items-start gap-4">
                  {business.paymentQrCode && (
                    <div className="flex shrink-0 flex-col items-center gap-2">
                      <div className="relative size-24 overflow-hidden rounded-xl border border-border/60 bg-white p-1.5">
                        <Image
                          quality={90}
                          src={business.paymentQrCode}
                          alt=""
                          fill
                          sizes="96px"
                          unoptimized={business.paymentQrCode.startsWith("data:")}
                          className="object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void downloadPaymentQr()}
                        // the Sheet portals outside the element declaring
                        // --menu-primary, so the brand colour is set directly
                        style={{ backgroundColor: business.theme.primaryColor }}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-[scale] duration-200 ease-smooth hover:scale-[1.03]"
                      >
                        <Download className="size-3.5" />
                        {copy.downloadQr}
                      </button>
                    </div>
                  )}

                  {business.paymentCode && (
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-bold text-muted-foreground">
                          {copy.paymentCodeBadge}
                        </span>
                        <button
                          type="button"
                          aria-label={t.common.copy}
                          onClick={() => {
                            navigator.clipboard
                              .writeText(business.paymentCode ?? "")
                              .then(() => toast.success(copy.paymentCodeCopied))
                              .catch(() => toast.error(t.restaurant.shareFailed));
                          }}
                          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-container-high"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      </div>
                      <div
                        dir="ltr"
                        className="rounded-lg border border-border/60 bg-card px-3.5 py-2.5 text-center font-mono text-sm break-all"
                      >
                        {business.paymentCode}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* the plan decides which routes exist; a business on one channel
                gets one button, not a second one greyed out */}
            <div className="space-y-2">
              {businessIsOpen ? (
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
                      className={cn(
                        "flex w-full transform-gpu items-center justify-center gap-2.5 rounded-2xl py-4 text-base font-bold text-white transition-[scale,opacity] duration-200 ease-smooth hover:scale-[1.01] active:scale-[0.99]",
                        !isValid && "opacity-60",
                      )}
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
                      onClick={(e) => {
                        if (!isValid) {
                          e.preventDefault();
                          void trigger();
                          return;
                        }
                        handleSend();
                      }}
                      className={cn(
                        "flex w-full transform-gpu items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] py-4 text-base font-bold text-white transition-[scale,opacity] duration-200 ease-smooth hover:scale-[1.01] active:scale-[0.99]",
                        !isValid && "opacity-60",
                      )}
                    >
                      <WhatsAppIcon className="size-5" />
                      {copy.orderViaWhatsapp}
                    </a>
                  )}
                </>
              ) : (
                <div className="rounded-2xl bg-muted p-4 text-center">
                  <p className="text-sm font-bold">{t.restaurant.closedNow}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {describeClosedUntil(businessOpenStatus, copy, t)}
                  </p>
                  <a
                    href={`/${business.slug}#opening-hours`}
                    className="mt-2 inline-block text-xs font-bold text-primary underline underline-offset-2"
                  >
                    {copy.viewOpeningHoursLink}
                  </a>
                </div>
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
