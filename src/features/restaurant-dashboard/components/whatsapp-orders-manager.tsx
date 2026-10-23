"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Armchair,
  Clock,
  MapPin,
  MessageCircle,
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

/**
 * A read-only log, not a workflow board like `OrdersKanban` — a WhatsApp
 * order never updates its own status here (the conversation happens on
 * WhatsApp itself), so a card is just "what was sent," nothing to action.
 */
function OrderCard({ order }: { order: WhatsAppOrder }) {
  const { t, lang } = useI18n();

  const fulfillmentLine =
    order.fulfillment === "delivery" && order.address ? (
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 size-3.5 shrink-0" />
        <span className="min-w-0">{order.address}</span>
      </p>
    ) : order.fulfillment === "pickup" && order.pickupTime ? (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5 shrink-0" />
        <span dir={order.pickupTime === "asap" ? undefined : "ltr"}>
          {order.pickupTime === "asap"
            ? t.dashboard.asapPickup
            : order.pickupTime}
        </span>
      </p>
    ) : order.fulfillment === "dineIn" && order.tableNumber ? (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Armchair className="size-3.5 shrink-0" />
        {order.tableNumber}
      </p>
    ) : null;

  return (
    <li className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <User className="size-4 text-muted-foreground" />
            {order.customerName}
          </p>
          <p
            className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
            dir="ltr"
          >
            <Phone className="size-3.5" />
            {order.customerPhone}
          </p>
        </div>
        <span
          className="shrink-0 text-xs font-semibold text-muted-foreground"
          dir="ltr"
        >
          {new Date(order.createdAt).toLocaleString(
            lang === "ar" ? "ar-SY" : "en-US",
            { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
          )}
        </span>
      </div>

      {fulfillmentLine && (
        <div className="mt-2 flex items-center gap-1.5">
          {order.fulfillment === "delivery" && (
            <Truck className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          {fulfillmentLine}
        </div>
      )}

      <ul className="mt-3 space-y-1 border-t border-dashed border-border pt-3 text-sm">
        {order.items.map((item, index) => (
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
                {item.options.map((o) => o.name).join("، ")}
              </p>
            )}
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="mt-2 rounded-lg bg-zest-soft px-3 py-1.5 text-xs font-semibold text-zest-soft-foreground">
          {order.notes}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
        <span className="text-xs font-semibold text-muted-foreground">
          {t.dashboard.orderTotal}
        </span>
        <span className="font-bold text-primary" dir="ltr">
          {formatPrice(order.total, order.currency, lang)}
        </span>
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
