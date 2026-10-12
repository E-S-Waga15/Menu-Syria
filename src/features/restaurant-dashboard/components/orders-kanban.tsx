"use client";

import { useQuery } from "@tanstack/react-query";
import { ChefHat, CircleCheck, Receipt, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useOrderMutations } from "@/features/restaurant-dashboard/hooks/use-orders";
import { getMyOrders } from "@/features/restaurant-dashboard/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OrdersKanban() {
  const { t, lang } = useI18n();

  const { data } = useQuery({
    queryKey: queryKeys.me.orders,
    queryFn: getMyOrders,
  });

  const { advance } = useOrderMutations();

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
    { status: "new", label: t.dashboard.newOrders, dot: "bg-primary" },
    { status: "preparing", label: t.dashboard.preparing, dot: "bg-zest" },
    { status: "ready", label: t.dashboard.ready, dot: "bg-success" },
  ];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-3">
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
                    order.status === "new"
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

                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <User className="size-3.5" />
                    {order.tableNumber
                      ? fmt(t.dashboard.table, { number: order.tableNumber })
                      : (order.customerName ?? "—")}
                  </p>

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
                        {line.options && line.options.length > 0 && (
                          <p className="truncate text-xs text-muted-foreground">
                            {line.options.map((o) => o.id).join("، ")}
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

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-border pt-3">
                    <span className="font-bold text-primary" dir="ltr">
                      {formatPrice(order.total, t.common.currency)}
                    </span>
                    {order.status !== "ready" && (
                      <Button
                        size="sm"
                        className={cn(
                          "font-semibold",
                          order.status === "preparing" &&
                            "bg-success text-success-foreground hover:bg-success/85",
                        )}
                        onClick={() => advance(order)}
                      >
                        {order.status === "new" ? (
                          <ChefHat className="size-3.5" />
                        ) : (
                          <CircleCheck className="size-3.5" />
                        )}
                        {order.status === "new"
                          ? t.dashboard.markPreparing
                          : t.dashboard.markReady}
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
