"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { Price } from "@/components/shared/price";
import { AdminFilterBar } from "@/features/admin/components/admin-filter-bar";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminSelect } from "@/features/admin/components/admin-select";
import { DeliveredOrdersPanel } from "@/features/restaurant-dashboard/components/delivered-orders-panel";
import { getInvoices } from "@/features/restaurant-dashboard/services";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { InvoicePaymentStatus } from "@/lib/types";
import { useFilterParam, usePageParam, useSearchParam } from "@/lib/url-state";
import { cn } from "@/lib/utils";

const ALL = "all";

const PAYMENT_STATUS_STYLE: Record<InvoicePaymentStatus, string> = {
  paid: "bg-success/10 text-success",
  partially_paid: "bg-zest-soft/40 text-zest-soft-foreground",
  unpaid: "bg-destructive/10 text-destructive",
};

/**
 * Every invoice this business has issued — a card list (not a table, this
 * is read at the counter on a phone most of the time), filterable by
 * payment status, with search/page/filter kept in the URL like every other
 * console list. `DeliveredOrdersPanel` above it is where a new invoice
 * actually gets created from.
 */
export function InvoicesList() {
  const { t, lang } = useI18n();
  const [query, setQuery] = useSearchParam("q");
  const [paymentStatus, setPaymentStatus] = useFilterParam("paymentStatus", ALL) as [
    InvoicePaymentStatus | typeof ALL,
    (value: InvoicePaymentStatus | typeof ALL) => void,
  ];
  const [page, setPage] = usePageParam();

  const listQuery = {
    page,
    q: query.trim() || undefined,
    paymentStatus: paymentStatus === ALL ? undefined : paymentStatus,
  };
  const { data } = useQuery({
    queryKey: queryKeys.me.invoices(listQuery),
    queryFn: () => getInvoices(listQuery),
  });

  const rows = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const total = data?.meta.total ?? 0;

  const hasFilters = query.trim() !== "" || paymentStatus !== ALL;
  const clear = () => {
    setQuery("");
    setPaymentStatus(ALL);
    setPage(1);
  };

  const dateFormat = new Intl.DateTimeFormat(lang === "ar" ? "ar-SY" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t.dashboard.invoices} count={total} />
      <p className="text-sm text-muted-foreground">{t.dashboard.invoicesHint}</p>

      <DeliveredOrdersPanel />

      <h2 className="font-heading text-sm font-bold text-muted-foreground">
        {t.dashboard.invoices}
      </h2>

      <AdminFilterBar
        query={query}
        onQueryChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        placeholder={t.agentsPage.searchPlaceholder}
        hasFilters={hasFilters}
        onClear={clear}
      >
        <AdminSelect
          value={paymentStatus}
          onChange={(v) => {
            setPaymentStatus(v as InvoicePaymentStatus | typeof ALL);
            setPage(1);
          }}
          label={t.dashboard.paymentStatusAll}
          items={{
            [ALL]: t.dashboard.paymentStatusAll,
            unpaid: t.dashboard.paymentStatusUnpaid,
            partially_paid: t.dashboard.paymentStatusPartiallyPaid,
            paid: t.dashboard.paymentStatusPaid,
          }}
        />
      </AdminFilterBar>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-14 text-center">
          <p className="text-sm font-semibold">{t.dashboard.noInvoicesYet}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.dashboard.noInvoicesYetBody}
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((invoice) => (
            <li key={invoice.id}>
              <Link
                href={`/${lang}/dashboard/invoices/${invoice.id}`}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5 transition-colors duration-200 hover:border-primary/35"
              >
                <Receipt className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {fmt(t.dashboard.invoiceNumber, { number: invoice.number })}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {invoice.customerName ?? "—"}
                  </p>
                </div>
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  {dateFormat.format(new Date(invoice.issuedAt))}
                </span>
                <Price
                  amount={invoice.totalAmount}
                  currency={invoice.currency}
                  lang={lang}
                  className="shrink-0 text-xs font-semibold"
                />
                <Badge className={cn("shrink-0", PAYMENT_STATUS_STYLE[invoice.paymentStatus])}>
                  {invoice.paymentStatus === "paid"
                    ? t.dashboard.paymentStatusPaid
                    : invoice.paymentStatus === "partially_paid"
                      ? t.dashboard.paymentStatusPartiallyPaid
                      : t.dashboard.paymentStatusUnpaid}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
