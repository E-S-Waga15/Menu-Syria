"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  Armchair,
  ChevronDown,
  Clock,
  MessageCircle,
  Package,
  Phone,
  Truck,
  User,
} from "lucide-react";

import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { formatPrice } from "@/features/public-menu/lib/format";
import { getMyWhatsAppOrders } from "@/features/restaurant-dashboard/services";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { WhatsAppOrder } from "@/lib/types";

/** how many lines show before the card needs a "show more" to see the rest */
const COLLAPSED_ITEM_COUNT = 2;

const FULFILLMENT_ICON = {
  delivery: Truck,
  pickup: Package,
  dineIn: Armchair,
} as const;

/**
 * A read-only log, not a workflow board like `OrdersKanban` — a WhatsApp
 * order never updates its own status here (the conversation happens on
 * WhatsApp itself), so a card is just "what was sent," nothing to action.
 */
function OrderCard({ order }: { order: WhatsAppOrder }) {
  const { t, lang } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const FulfillmentIcon = FULFILLMENT_ICON[order.fulfillment];
  const fulfillmentLabel =
    order.fulfillment === "delivery"
      ? t.menu.fulfillmentDelivery
      : order.fulfillment === "pickup"
        ? t.menu.fulfillmentPickup
        : t.menu.fulfillmentDineIn;
  const fulfillmentDetail =
    order.fulfillment === "delivery"
      ? order.address
      : order.fulfillment === "pickup"
        ? (order.pickupTime === "asap" ? t.dashboard.asapPickup : order.pickupTime)
        : order.tableNumber;

  const visibleItems = expanded
    ? order.items
    : order.items.slice(0, COLLAPSED_ITEM_COUNT);
  const hiddenCount = order.items.length - visibleItems.length;

  // digits always Western/numeric regardless of UI language — "professional"
  // means no Arabic-Indic digits and no ambiguity, not a localized string
  const createdAt = new Date(order.createdAt);
  const dateLabel = createdAt.toLocaleDateString("en-GB");
  const timeLabel = createdAt.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <li className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-bold">
          <User className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{order.customerName}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
            dir="ltr"
          >
            <Phone className="size-3.5" />
            {order.customerPhone}
          </span>
          <a
            href={`tel:${order.customerPhone.replace(/\s/g, "")}`}
            aria-label={t.restaurant.call}
            title={t.restaurant.call}
            className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
          >
            <Phone className="size-3" />
            {t.restaurant.call}
          </a>
        </div>
      </div>

      <p
        className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
        dir="ltr"
      >
        <Clock className="size-3.5 shrink-0" />
        {dateLabel} - {timeLabel}
      </p>

      <div className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-muted-foreground">
        <FulfillmentIcon className="mt-0.5 size-3.5 shrink-0" />
        <span className="min-w-0">
          {fulfillmentLabel}
          {fulfillmentDetail && (
            <span className="font-normal"> — {fulfillmentDetail}</span>
          )}
        </span>
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-dashed border-border pt-3 text-sm">
        {visibleItems.map((item, index) => (
          <li key={index} className="flex flex-col gap-0.5">
            <div className="flex justify-between gap-2">
              <span className="truncate">
                {item.quantity}× {item.name}
              </span>
              <span className="shrink-0 text-muted-foreground" dir="ltr">
                {formatPrice(item.unitPrice * item.quantity, order.currency, lang)}
              </span>
            </div>
            {item.options && item.options.length > 0 && (
              <p className="truncate text-xs text-muted-foreground">
                {t.menu.withOption}: {item.options.map((o) => o.name).join("، ")}
              </p>
            )}
          </li>
        ))}
      </ul>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 flex items-center gap-1 text-xs font-bold text-primary"
        >
          <ChevronDown className="size-3.5" />
          {t.dashboard.showMoreItems}
        </button>
      )}

      {order.notes && (
        <p className="mt-2 rounded-lg bg-zest-soft px-3 py-1.5 text-xs font-semibold text-zest-soft-foreground">
          {order.notes}
        </p>
      )}

      <div className="mt-3 space-y-1 border-t border-dashed border-border pt-3">
        {order.deliveryFee != null && order.deliveryFee > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {t.restaurant.deliveryFeeTileLabel}
            </span>
            <span className="text-xs font-semibold" dir="ltr">
              {formatPrice(order.deliveryFee, order.currency, lang)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">
            {t.dashboard.orderTotal}
          </span>
          <span className="font-bold text-primary" dir="ltr">
            {formatPrice(order.total, order.currency, lang)}
          </span>
        </div>
      </div>
    </li>
  );
}

export function WhatsAppOrdersManager() {
  const { t } = useI18n();

  const { data: orders } = useQuery({
    queryKey: queryKeys.me.whatsappOrders,
    queryFn: getMyWhatsAppOrders,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold md:text-2xl">
          {t.dashboard.whatsappOrders}
          {orders && orders.length > 0 && (
            <span className="ms-2 rounded-full bg-surface-container px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
              {orders.length}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.dashboard.whatsappOrdersHint}
        </p>
      </div>

      {!orders ? (
        <LoadingSpinner />
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-berry-soft text-berry-soft-foreground">
            <MessageCircle className="size-6" />
          </span>
          <p className="mt-4 font-heading text-lg font-bold">
            {t.dashboard.noWhatsappOrders}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {t.dashboard.noWhatsappOrdersBody}
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orders
            .slice()
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            )
            .map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
        </ul>
      )}
    </div>
  );
}
