"use client";

import { useQuery } from "@tanstack/react-query";
import { Printer, Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Price } from "@/components/shared/price";
import { openOrderPrint } from "@/features/restaurant-dashboard/lib/print-order";
import { getMyOrders, getMyRestaurant } from "@/features/restaurant-dashboard/services";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import type { OrderStatus } from "@/lib/types";
import { useFilterParam, useSearchParam } from "@/lib/url-state";
import { cn } from "@/lib/utils";

const ALL = "all";
/** the live board's own 4 columns — everything past them lands here */
const HISTORY_STATUSES: OrderStatus[] = ["delivered", "cancelled", "refunded"];

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-surface-container text-foreground/70",
  confirmed: "bg-surface-container text-foreground/70",
  preparing: "bg-surface-container text-foreground/70",
  ready: "bg-surface-container text-foreground/70",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-destructive/10 text-destructive",
  refunded: "bg-zest-soft/40 text-zest-soft-foreground",
};

/**
 * Everything the live board (`OrdersKanban`) drops once it leaves the 4
 * active columns — delivered/cancelled/refunded orders are still on record
 * via the same `GET /me/orders`, just never shown anywhere until now.
 * Filtered/searched client-side on the same already-fetched list; worth
 * moving to real server pagination once a business has enough order volume
 * for that to matter (see update-backend-orders.md).
 */
export function OrderHistoryList() {
  const { t, lang } = useI18n();
  const [query, setQuery] = useSearchParam("historyQ");
  const [status, setStatus] = useFilterParam("historyStatus", ALL) as [
    OrderStatus | typeof ALL,
    (value: OrderStatus | typeof ALL) => void,
  ];

  const { data } = useQuery({
    queryKey: queryKeys.me.orders,
    queryFn: getMyOrders,
  });
  const { data: business } = useQuery({
    queryKey: queryKeys.me.business,
    queryFn: getMyRestaurant,
  });

  if (!data) return <LoadingSpinner />;

  const STATUS_LABEL: Record<OrderStatus, string> = {
    pending: t.dashboard.newOrders,
    confirmed: t.dashboard.confirmed,
    preparing: t.dashboard.preparing,
    ready: t.dashboard.ready,
    delivered: t.orderTracking.statusDelivered,
    cancelled: t.orderTracking.statusCancelled,
    refunded: t.orderTracking.statusRefunded,
  };

  const q = query.trim().toLowerCase();
  const rows = data
    .filter((order) => HISTORY_STATUSES.includes(order.status))
    .filter((order) => status === ALL || order.status === status)
    .filter(
      (order) =>
        !q ||
        String(order.number).toLowerCase().includes(q) ||
        (order.customerName ?? "").toLowerCase().includes(q),
    )
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const dateFormat = new Intl.DateTimeFormat(lang === "ar" ? "ar-SY" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.dashboard.searchOrderHistory}
          aria-label={t.dashboard.searchOrderHistory}
          className="h-10 max-w-64"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus | "all")}>
          <SelectTrigger className="h-10 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t.dashboard.allStatuses}</SelectItem>
            {HISTORY_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {t.dashboard.noOrderHistory}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5"
            >
              <Receipt className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-bold">
                  {fmt(t.dashboard.orderNumber, { number: order.number })}
                  <span
                    className="font-normal text-xs text-muted-foreground"
                    dir="ltr"
                  >
                    {dateFormat.format(new Date(order.createdAt))}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {order.customerName ?? "—"}
                </p>
              </div>
              <Price
                amount={order.total}
                currency={t.common.currency}
                lang={lang}
                className="shrink-0 text-sm font-semibold"
              />
              <Badge className={cn("shrink-0", STATUS_STYLE[order.status])}>
                {STATUS_LABEL[order.status]}
              </Badge>
              <Button
                size="icon-sm"
                variant="ghost"
                className="shrink-0 text-muted-foreground hover:bg-surface-container-high"
                aria-label={t.dashboard.printReceipt}
                onClick={() =>
                  void openOrderPrint(order, business, lang, () =>
                    toast.error(t.dashboard.orderHasNoInvoiceYet),
                  )
                }
              >
                <Printer className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
