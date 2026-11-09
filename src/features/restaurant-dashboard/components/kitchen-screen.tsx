"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { ChefHat, Receipt, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { useOrderMutations } from "@/features/restaurant-dashboard/hooks/use-orders";
import { getMyOrders } from "@/features/restaurant-dashboard/services";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * The PDF report's "شاشة مطبخ بسيطة" (a simple kitchen display): only the
 * two statuses a kitchen actually acts on — `confirmed` (just accepted, not
 * started) and `preparing` — as oversized cards meant to be read at a glance
 * from across a pass, not scanned up close like the full orders board. Not
 * in the dashboard's main nav (same as the rest of the orders section — see
 * the note in `shell.tsx`); reached from the orders page's own header link.
 */
export function KitchenScreen({ dashboardBase }: { dashboardBase: string }) {
  const { t, lang } = useI18n();

  const { data } = useQuery({
    queryKey: queryKeys.me.orders,
    queryFn: getMyOrders,
  });

  const { advance, isPending } = useOrderMutations();

  if (!data) return <LoadingSpinner />;

  const kitchenOrders = data
    .filter((o) => o.status === "confirmed" || o.status === "preparing")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl font-bold">{t.dashboard.kitchenScreen}</h1>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`${dashboardBase}/orders`} />}
        >
          {t.dashboard.backToOrders}
        </Button>
      </div>

      {kitchenOrders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-16 text-center text-sm text-muted-foreground">
          {t.dashboard.kitchenScreenEmpty}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kitchenOrders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-border/60 bg-card p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-lg font-bold">
                  <Receipt className="size-5 text-muted-foreground" />
                  {fmt(t.dashboard.orderNumber, { number: order.number })}
                </p>
                <Badge
                  className={
                    order.status === "confirmed"
                      ? "bg-berry-bright/10 text-berry-bright"
                      : "bg-zest-soft text-zest-soft-foreground"
                  }
                >
                  {order.status === "confirmed" ? t.dashboard.confirmed : t.dashboard.preparing}
                </Badge>
              </div>

              <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <User className="size-4" />
                {order.tableNumber
                  ? fmt(t.dashboard.table, { number: order.tableNumber })
                  : (order.customerName ?? "—")}
              </p>

              <ul className="mt-4 space-y-2 border-t border-dashed border-border pt-4 text-base">
                {order.lines.map((line) => (
                  <li key={line.itemId}>
                    <div className="flex items-baseline gap-2 font-semibold">
                      <span className="text-primary">{line.quantity}×</span>
                      <span>{line.name[lang]}</span>
                    </div>
                    {line.selectedOptions && line.selectedOptions.length > 0 && (
                      <p className="ps-5 text-sm text-muted-foreground">
                        {line.selectedOptions.map((o) => o.id).join("، ")}
                      </p>
                    )}
                    {line.notes && (
                      <p className="ps-5 text-sm font-semibold text-zest-soft-foreground">
                        {line.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>

              {order.notes && (
                <p className="mt-3 rounded-lg bg-zest-soft px-3 py-2 text-sm font-semibold text-zest-soft-foreground">
                  {order.notes}
                </p>
              )}

              <Button
                className="mt-4 w-full font-semibold"
                disabled={isPending}
                onClick={() => advance(order)}
              >
                <ChefHat className="size-4" />
                {order.status === "confirmed" ? t.dashboard.markPreparing : t.dashboard.markReady}
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
