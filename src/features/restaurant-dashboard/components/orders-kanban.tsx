"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  Bike,
  ChefHat,
  CircleCheck,
  MapPin,
  Receipt,
  SquarePen,
  Truck,
  User,
  UserRound,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { EditOrderDialog } from "@/features/restaurant-dashboard/components/edit-order-dialog";
import { useOrderMutations } from "@/features/restaurant-dashboard/hooks/use-orders";
import { getMyDrivers, getMyOrders } from "@/features/restaurant-dashboard/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const NO_DRIVER = "none";

const DELIVERY_STATUS_LABEL: Record<
  string,
  (t: ReturnType<typeof useI18n>["t"]) => string
> = {
  unassigned: (t) => t.dashboard.deliveryStatusUnassigned,
  assigned: (t) => t.dashboard.deliveryStatusAssigned,
  outForDelivery: (t) => t.dashboard.deliveryStatusOutForDelivery,
  delivered: (t) => t.dashboard.deliveryStatusDelivered,
};

const DELIVERY_ADVANCE_LABEL: Partial<
  Record<string, (t: ReturnType<typeof useI18n>["t"]) => string>
> = {
  assigned: (t) => t.dashboard.markOutForDelivery,
  outForDelivery: (t) => t.dashboard.markDeliveredByDriver,
};

const ADVANCE_LABEL: Partial<Record<OrderStatus, (t: ReturnType<typeof useI18n>["t"]) => string>> = {
  pending: (t) => t.dashboard.markConfirmed,
  confirmed: (t) => t.dashboard.markPreparing,
  preparing: (t) => t.dashboard.markReady,
  ready: (t) => t.dashboard.markDelivered,
};

/**
 * The kanban's own filter of the backend's full state machine — only the
 * live, actionable columns. `delivered`/`cancelled`/`refunded` orders drop
 * off the board once reached, same as any kitchen's "today's work" view;
 * they're still on record, just not something anyone needs to act on here.
 */
export function OrdersKanban() {
  const { t, lang } = useI18n();

  const { data } = useQuery({
    queryKey: queryKeys.me.orders,
    queryFn: getMyOrders,
  });
  const { data: driversData } = useQuery({
    queryKey: queryKeys.me.drivers,
    queryFn: getMyDrivers,
  });
  const drivers = driversData ?? [];

  const { advance, cancel, isPending, assignDriver, advanceDelivery } = useOrderMutations();
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [editing, setEditing] = useState<Order | null>(null);

  // the cached board is the source of truth: advancing an order patches the
  // card into its next column immediately, then reconciles with the server
  const orders = data ?? [];

  if (!data) {
    return <LoadingSpinner />;
  }

  const columns: {
    status: OrderStatus;
    label: string;
    dot: string;
  }[] = [
    { status: "pending", label: t.dashboard.newOrders, dot: "bg-primary" },
    { status: "confirmed", label: t.dashboard.confirmed, dot: "bg-berry-bright" },
    { status: "preparing", label: t.dashboard.preparing, dot: "bg-zest" },
    { status: "ready", label: t.dashboard.ready, dot: "bg-success" },
  ];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-4">
      {columns.map((column) => {
        const columnOrders = orders.filter((o) => o.status === column.status);
        return (
          <section
            key={column.status}
            className="rounded-2xl border border-border/60 bg-surface-container-low/60 dark:bg-surface-container-low"
          >
            <header className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3.5">
              <span className={cn("size-2.5 rounded-full", column.dot)} />
              <h2 className="flex-1 font-heading text-sm font-bold">
                {column.label}
              </h2>
              <Badge className="bg-surface-container text-foreground/70">
                {columnOrders.length}
              </Badge>
            </header>

            <div className="space-y-3 p-3">
              {columnOrders.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  —
                </p>
              )}
              {columnOrders.map((order) => (
                <article
                  key={order.id}
                  className={cn(
                    "rounded-xl border bg-card p-4",
                    order.status === "pending"
                      ? "border-primary/30 animate-pulse [animation-duration:2.5s]"
                      : "border-border/60",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-sm font-bold">
                      <Receipt className="size-4 text-muted-foreground" />
                      {fmt(t.dashboard.orderNumber, { number: order.number })}
                    </p>
                    <span
                      className="text-xs font-semibold text-muted-foreground"
                      dir="ltr"
                    >
                      {new Date(order.createdAt).toLocaleTimeString(
                        lang === "ar" ? "ar-SY" : "en-US",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <User className="size-3.5" />
                      {order.tableNumber
                        ? fmt(t.dashboard.table, { number: order.tableNumber })
                        : (order.customerName ?? "—")}
                    </span>
                    {order.fulfillmentMode === "delivery" && (
                      <span className="flex items-center gap-1.5 text-primary">
                        <Bike className="size-3.5" />
                        {t.dashboard.fulfillmentDelivery}
                      </span>
                    )}
                  </div>

                  {order.fulfillmentMode === "delivery" && order.deliveryAddress && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" />
                      <span className="truncate">{order.deliveryAddress}</span>
                    </p>
                  )}

                  {order.fulfillmentMode === "delivery" && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {order.driverId && (
                        <Badge className="shrink-0 bg-surface-container text-[0.65rem] text-foreground/70">
                          {DELIVERY_STATUS_LABEL[order.deliveryStatus ?? "assigned"]?.(t)}
                        </Badge>
                      )}
                      <Select
                        value={order.driverId ?? NO_DRIVER}
                        onValueChange={(v) =>
                          assignDriver(order, v === NO_DRIVER ? null : v)
                        }
                        items={{
                          [NO_DRIVER]: t.dashboard.noDriverAssigned,
                          ...Object.fromEntries(drivers.map((d) => [d.id, d.name])),
                        }}
                      >
                        <SelectTrigger className="h-8! flex-1 gap-1.5 rounded-full text-xs">
                          <UserRound className="size-3.5 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_DRIVER}>
                            {t.dashboard.noDriverAssigned}
                          </SelectItem>
                          {drivers.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {order.driverId &&
                        DELIVERY_ADVANCE_LABEL[order.deliveryStatus ?? "assigned"] && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 gap-1"
                            onClick={() => advanceDelivery(order)}
                          >
                            <Truck className="size-3.5" />
                            {DELIVERY_ADVANCE_LABEL[order.deliveryStatus ?? "assigned"]?.(t)}
                          </Button>
                        )}
                    </div>
                  )}

                  <ul className="mt-3 space-y-1 border-t border-dashed border-border pt-3 text-sm">
                    {order.lines.map((line) => (
                      <li key={line.itemId} className="flex flex-col gap-0.5">
                        <div className="flex justify-between gap-2">
                          <span className="truncate">
                            {line.quantity}× {line.name[lang]}
                          </span>
                          <span
                            className="shrink-0 text-muted-foreground"
                            dir="ltr"
                          >
                            {formatPrice(
                              line.price * line.quantity,
                              t.common.currency,
                            )}
                          </span>
                        </div>
                        {line.selectedOptions && line.selectedOptions.length > 0 && (
                          <p className="truncate text-xs text-muted-foreground">
                            {line.selectedOptions.map((o) => o.id).join("، ")}
                          </p>
                        )}
                        {line.notes && (
                          <p className="truncate text-xs font-semibold text-zest-soft-foreground">
                            {line.notes}
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

                  {order.fulfillmentMode === "delivery" && !!order.deliveryFee && (
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t.dashboard.deliveryFeeLabel}</span>
                      <span dir="ltr">
                        {formatPrice(order.deliveryFee, t.common.currency)}
                      </span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-border pt-3">
                    <span className="font-bold text-primary" dir="ltr">
                      {formatPrice(order.total, t.common.currency)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {order.status === "pending" && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          aria-label={t.dashboard.editOrder}
                          disabled={isPending}
                          onClick={() => setEditing(order)}
                        >
                          <SquarePen className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t.dashboard.cancelOrder}
                        disabled={isPending}
                        onClick={() => setCancelling(order)}
                      >
                        <Ban className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        className={cn(
                          "font-semibold",
                          order.status === "preparing" &&
                            "bg-success text-success-foreground hover:bg-success/85",
                        )}
                        disabled={isPending}
                        onClick={() => advance(order)}
                      >
                        {order.status === "pending" ? (
                          <CircleCheck className="size-3.5" />
                        ) : order.status === "confirmed" ? (
                          <ChefHat className="size-3.5" />
                        ) : (
                          <CircleCheck className="size-3.5" />
                        )}
                        {ADVANCE_LABEL[order.status]?.(t)}
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <AlertDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cancelling && fmt(t.dashboard.confirmCancelOrderTitle, { number: cancelling.number })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.dashboard.confirmCancelOrderBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelling(null)}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={isPending}
              onClick={() => {
                if (cancelling) cancel(cancelling);
                setCancelling(null);
              }}
            >
              {t.dashboard.cancelOrder}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditOrderDialog
        order={editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  );
}
