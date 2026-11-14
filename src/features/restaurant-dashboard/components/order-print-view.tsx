"use client";

import { useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Price } from "@/components/shared/price";
import { getMyRestaurant, getOrder } from "@/features/restaurant-dashboard/services";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * The plain print path for a business that hasn't turned on invoicing
 * (`Business.invoicingEnabled`) — items, quantities, delivery fee if any,
 * and a total. No payment status, no paid/remaining: the customer settles
 * up in person and this is just the paper record of what was ordered. Same
 * 80mm layout and auto-print-on-load as `InvoicePrintView`; see that
 * component for why the browser's own print dialog is the printing channel.
 */
export function OrderPrintView({ id }: { id: string }) {
  const { t, lang } = useI18n();

  const { data: order, isLoading } = useQuery({
    queryKey: queryKeys.me.order(id),
    queryFn: () => getOrder(id),
  });
  const { data: restaurant } = useQuery({
    queryKey: queryKeys.me.business,
    queryFn: getMyRestaurant,
  });

  useEffect(() => {
    if (order) {
      const timer = setTimeout(() => window.print(), 300);
      return () => clearTimeout(timer);
    }
  }, [order]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!order) {
    return (
      <p className="p-10 text-center text-sm text-muted-foreground">
        {t.dashboard.orderNotFound}
      </p>
    );
  }

  const dateFormat = new Intl.DateTimeFormat(lang === "ar" ? "ar-SY" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-dvh bg-surface-container-low py-6 print:bg-white print:py-0">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 2mm; }
          body { background: #fff; }
        }
      `}</style>

      <div className="mx-auto w-[80mm] bg-white p-3 font-mono text-[11px] leading-tight text-black print:w-full print:p-0">
        <div className="text-center">
          <p className="text-sm font-bold">{restaurant?.name[lang]}</p>
          {restaurant?.address[lang] && <p>{restaurant.address[lang]}</p>}
        </div>

        <div className="my-2 border-t border-dashed border-black" />

        <div className="flex justify-between">
          <span>#{order.number}</span>
          <span dir="ltr">{dateFormat.format(new Date(order.createdAt))}</span>
        </div>
        {(order.customerName || order.tableNumber) && (
          <p className="mt-1">
            {order.customerName}
            {order.tableNumber
              ? ` — ${fmt(t.dashboard.table, { number: order.tableNumber })}`
              : ""}
          </p>
        )}

        <div className="my-2 border-t border-dashed border-black" />

        {order.lines.map((line, i) => (
          <div key={i} className="mb-1 flex justify-between gap-2">
            <span className="min-w-0 flex-1 truncate">
              {line.quantity}× {line.name[lang]}
            </span>
            <Price
              amount={line.price * line.quantity}
              currency={t.common.currency}
              lang={lang}
              className="shrink-0"
            />
          </div>
        ))}

        <div className="my-2 border-t border-dashed border-black" />

        {!!order.deliveryFee && (
          <div className="flex justify-between">
            <span>{t.dashboard.deliveryFeeLabel}</span>
            <Price amount={order.deliveryFee} currency={t.common.currency} lang={lang} />
          </div>
        )}
        <div className="flex justify-between font-bold">
          <span>{t.dashboard.totalAmount}</span>
          <Price amount={order.total} currency={t.common.currency} lang={lang} className="font-bold" />
        </div>

        <div className="my-2 border-t border-dashed border-black" />
        <p className="text-center">{t.seo.siteName}</p>
      </div>

      <div className="mx-auto mt-4 flex w-[80mm] justify-center print:hidden">
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="size-3.5" />
          {t.dashboard.printReceipt}
        </Button>
      </div>
    </div>
  );
}
