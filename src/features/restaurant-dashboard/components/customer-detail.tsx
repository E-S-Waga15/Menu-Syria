"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Phone, Receipt, SquarePen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Pagination } from "@/components/shared/pagination";
import { CustomerDialog } from "@/features/restaurant-dashboard/components/customer-dialog";
import {
  getCustomer,
  getInvoices,
  updateCustomer,
} from "@/features/restaurant-dashboard/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import { usePageParam } from "@/lib/url-state";
import { cn } from "@/lib/utils";

const PAYMENT_STATUS_STYLE: Record<string, string> = {
  paid: "bg-success/10 text-success",
  partially_paid: "bg-zest-soft/40 text-zest-soft-foreground",
  unpaid: "bg-destructive/10 text-destructive",
};

export function CustomerDetail({ id }: { id: string }) {
  const { t, lang, dir } = useI18n();
  const queryClient = useQueryClient();
  const [page, setPage] = usePageParam();
  const [dialogOpen, setDialogOpen] = useState(false);
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  const { data: customer, isLoading } = useQuery({
    queryKey: queryKeys.me.customer(id),
    queryFn: () => getCustomer(id),
  });

  const { data: invoicesPage } = useQuery({
    queryKey: queryKeys.me.invoices({ customerId: id, page }),
    queryFn: () => getInvoices({ customerId: id, page }),
    enabled: !!customer,
  });

  if (isLoading) return <LoadingSpinner />;
  if (!customer) notFound();

  const rows = invoicesPage?.items ?? [];
  const totalPages = invoicesPage?.meta.totalPages ?? 1;

  const save = async (values: { name: string; phone: string }) => {
    try {
      const result = await updateCustomer(id, {
        name: values.name,
        phone: values.phone.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.me.customer(id) });
      toast.success(result?.message ?? t.dashboard.customerSaved);
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    }
  };

  return (
    <div className="space-y-5">
      <Link
        href={`/${lang}/dashboard/customers`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"
      >
        <BackIcon className="size-4" />
        {t.dashboard.backToCustomers}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-5">
        <div>
          <h1 className="font-heading text-xl font-bold">{customer.name}</h1>
          {customer.phone && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground" dir="ltr">
              <Phone className="size-3.5" />
              {customer.phone}
            </p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          <SquarePen className="size-3.5" />
          {t.dashboard.editCustomer}
        </Button>
      </div>

      <h2 className="font-heading text-sm font-bold text-muted-foreground">
        {t.dashboard.customerInvoices}
      </h2>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {t.dashboard.noInvoicesYet}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((invoice) => (
            <li key={invoice.id}>
              <Link
                href={`/${lang}/dashboard/invoices/${invoice.id}`}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5 transition-colors duration-200 hover:border-primary/35"
              >
                <Receipt className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-sm font-bold">
                  {fmt(t.dashboard.invoiceNumber, { number: invoice.number })}
                </span>
                <span className="text-xs font-semibold text-muted-foreground" dir="ltr">
                  {formatPrice(invoice.totalAmount, invoice.currency, lang)}
                </span>
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

      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={customer}
        onSave={save}
      />
    </div>
  );
}
