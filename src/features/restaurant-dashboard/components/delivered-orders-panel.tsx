"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Price } from "@/components/shared/price";
import { IssueInvoiceDialog } from "@/features/restaurant-dashboard/components/issue-invoice-dialog";
import { getInvoices, getMyOrders } from "@/features/restaurant-dashboard/services";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Order } from "@/lib/types";

/**
 * Orders that reached `delivered` and have no invoice yet — the entry point
 * for "issue invoice" per the report's own flow (manual, from the
 * dashboard, once an order is actually delivered). Shown on both the
 * orders board and the invoices page so either is a natural place to start.
 */
export function DeliveredOrdersPanel() {
  const { t, lang } = useI18n();
  const [invoicing, setInvoicing] = useState<Order | null>(null);

  const { data: orders } = useQuery({
    queryKey: queryKeys.me.orders,
    queryFn: getMyOrders,
  });
  // a small business's full invoice list is cheap to read in one page —
  // same "fetch everything" shortcut the admin side uses internally (see
  // ADMIN_LIST_FETCH_LIMIT) to know which delivered orders are already done
  const { data: invoicesPage } = useQuery({
    queryKey: queryKeys.me.invoices({ limit: 100 }),
    queryFn: () => getInvoices({ limit: 100 }),
  });

  const invoicedOrderIds = new Set((invoicesPage?.items ?? []).map((inv) => inv.orderId));
  const deliveredOrders = (orders ?? []).filter(
    (order) => order.status === "delivered" && !invoicedOrderIds.has(order.id),
  );

  return (
    <section className="space-y-3">
      <h2 className="font-heading text-sm font-bold text-muted-foreground">
        {t.dashboard.deliveredReadyToInvoice}
      </h2>

      {deliveredOrders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t.dashboard.noDeliveredOrders}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {deliveredOrders.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5"
            >
              <Receipt className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  {fmt(t.dashboard.orderNumber, { number: order.number })}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {order.customerName ?? "—"}
                </p>
              </div>
              <Price
                amount={order.total}
                currency={t.common.currency}
                lang={lang}
                className="shrink-0 text-xs font-semibold"
              />
              <Button size="sm" variant="outline" onClick={() => setInvoicing(order)}>
                {t.dashboard.issueInvoice}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <IssueInvoiceDialog
        order={invoicing}
        open={invoicing !== null}
        onOpenChange={(open) => !open && setInvoicing(null)}
      />
    </section>
  );
}
