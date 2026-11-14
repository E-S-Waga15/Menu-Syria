"use client";

import { useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Price } from "@/components/shared/price";
import { ALL_CATEGORIES } from "@/features/restaurant-dashboard/components/menu-category-bar";
import { openOrderPrint } from "@/features/restaurant-dashboard/lib/print-order";
import {
  createDashboardOrder,
  getMyMenu,
  getMyRestaurant,
  issueInvoice,
} from "@/features/restaurant-dashboard/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import type { FulfillmentMode } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMPTY_QUANTITIES: Record<string, number> = {};

/**
 * The owner/cashier's own "type the order in myself" path — a phone-in or
 * walk-in customer standing right at the counter, not the public cart.
 * Picks straight from the real menu (`getMyMenu`, same data
 * `MenuCategoryBar` reads) so prices are never guessed. On success:
 * auto-issues an invoice when the business has `invoicingEnabled` (a
 * dashboard-created order is already authenticated, unlike a public cart
 * order, so this is the one creation path that *can* do that client-side
 * today — see update-backend-orders.md), then immediately opens the print
 * view (invoice or plain receipt, same routing `openOrderPrint` uses
 * everywhere else) — the cashier hands the customer a printed slip and
 * charges them on the spot, same as any till.
 */
export function NewOrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();

  const { data: menu } = useQuery({
    queryKey: queryKeys.me.menu,
    queryFn: getMyMenu,
    enabled: open,
  });
  const { data: business } = useQuery({
    queryKey: queryKeys.me.business,
    queryFn: getMyRestaurant,
  });

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [quantities, setQuantities] = useState(EMPTY_QUANTITIES);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode>("dineIn");
  const [tableNumber, setTableNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setQuery("");
    setCategory(ALL_CATEGORIES);
    setQuantities(EMPTY_QUANTITIES);
    setCustomerName("");
    setCustomerPhone("");
    setFulfillmentMode("dineIn");
    setTableNumber("");
    setDeliveryAddress("");
    setDeliveryFee("");
  };

  const items = (menu?.items ?? []).filter((item) => {
    if (item.isAvailable === false) return false;
    if (category !== ALL_CATEGORIES && item.categoryId !== category) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return item.name.ar.toLowerCase().includes(q) || item.name.en.toLowerCase().includes(q);
  });

  const setQuantity = (itemId: string, next: number) => {
    setQuantities((prev) => ({ ...prev, [itemId]: Math.max(0, next) }));
  };

  const cartLines = Object.entries(quantities).filter(([, qty]) => qty > 0);
  const itemsTotal = cartLines.reduce((sum, [itemId, qty]) => {
    const item = menu?.items.find((i) => i.id === itemId);
    return sum + (item?.price ?? 0) * qty;
  }, 0);
  const feeNumber = fulfillmentMode === "delivery" ? Number(deliveryFee) || 0 : 0;
  const total = itemsTotal + feeNumber;
  const itemCount = cartLines.reduce((sum, [, qty]) => sum + qty, 0);

  const close = () => {
    if (submitting) return;
    onOpenChange(false);
    reset();
  };

  const submit = async () => {
    if (cartLines.length === 0) {
      toast.error(t.dashboard.orderMustHaveOneItem);
      return;
    }
    setSubmitting(true);
    try {
      const order = await createDashboardOrder({
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        fulfillmentMode,
        tableNumber:
          fulfillmentMode === "dineIn" && tableNumber.trim()
            ? Number(tableNumber)
            : undefined,
        deliveryAddress: fulfillmentMode === "delivery" ? deliveryAddress.trim() : undefined,
        deliveryFee: fulfillmentMode === "delivery" ? feeNumber : undefined,
        items: cartLines.map(([itemId, quantity]) => ({ itemId, quantity })),
      });
      if (business?.invoicingEnabled) {
        try {
          const invoice = await issueInvoice({ orderId: order.id });
          order.invoiceId = invoice.id;
        } catch {
          // the order itself is real either way — a failed auto-invoice
          // isn't worth blocking the cashier's flow over, just less tidy
        }
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.me.orders });
      toast.success(t.dashboard.orderCreated);
      onOpenChange(false);
      reset();
      // print immediately — the whole point of a walk-in/phone order is
      // handing the customer a slip and charging them right at the counter
      void openOrderPrint(order, business, lang, () =>
        toast.error(t.dashboard.orderHasNoInvoiceYet),
      );
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : close())}>
      <DialogContent className="flex max-h-[85vh] max-w-xl flex-col p-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>{t.dashboard.newOrder}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-2">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.dashboard.searchItems}
              aria-label={t.dashboard.searchItems}
              className="h-10 rounded-full ps-10"
            />
          </div>

          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setCategory(ALL_CATEGORIES)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                category === ALL_CATEGORIES
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container text-foreground/70 hover:bg-surface-container-high",
              )}
            >
              {t.dashboard.allCategories}
            </button>
            {(menu?.categories ?? [])
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                    category === c.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-container text-foreground/70 hover:bg-surface-container-high",
                  )}
                >
                  {c.name[lang]}
                </button>
              ))}
          </div>

          <div className="space-y-2">
            {items.map((item) => {
              const qty = quantities[item.id] ?? 0;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-border/60 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.name[lang]}</p>
                    <Price
                      amount={item.price}
                      currency={item.currency ?? "SYP"}
                      lang={lang}
                      className="text-xs text-muted-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      disabled={qty === 0}
                      onClick={() => setQuantity(item.id, qty - 1)}
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">
                      {qty}
                    </span>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      onClick={() => setQuantity(item.id, qty + 1)}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3 border-t border-dashed border-border pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-order-customer">{t.dashboard.customerName}</Label>
                <Input
                  id="new-order-customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-order-phone">{t.dashboard.customerPhone}</Label>
                <Input
                  id="new-order-phone"
                  dir="ltr"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t.dashboard.fulfillmentModeLabel}</Label>
              <Select
                value={fulfillmentMode}
                onValueChange={(v) => setFulfillmentMode(v as FulfillmentMode)}
                items={{
                  dineIn: t.dashboard.fulfillmentDineIn,
                  pickup: t.dashboard.fulfillmentPickup,
                  delivery: t.dashboard.fulfillmentDelivery,
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dineIn">{t.dashboard.fulfillmentDineIn}</SelectItem>
                  <SelectItem value="pickup">{t.dashboard.fulfillmentPickup}</SelectItem>
                  <SelectItem value="delivery">{t.dashboard.fulfillmentDelivery}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {fulfillmentMode === "dineIn" && (
              <div className="space-y-1.5">
                <Label htmlFor="new-order-table">{t.menu.tableNumber}</Label>
                <Input
                  id="new-order-table"
                  dir="ltr"
                  inputMode="numeric"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-32"
                />
              </div>
            )}

            {fulfillmentMode === "delivery" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="new-order-address">{t.dashboard.deliveryAddressLabel}</Label>
                  <Input
                    id="new-order-address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-order-fee">{t.dashboard.deliveryFeeLabel}</Label>
                  <Input
                    id="new-order-fee"
                    dir="ltr"
                    inputMode="numeric"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
          <div className="text-sm">
            <span className="text-muted-foreground">
              {itemCount} {t.dashboard.itemsCountSuffix} ·{" "}
            </span>
            <Price amount={total} currency={t.common.currency} lang={lang} className="font-bold text-primary" />
          </div>
          <Button loading={submitting} onClick={() => void submit()}>
            {t.dashboard.createOrder}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
