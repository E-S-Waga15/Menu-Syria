"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MessageCircle, Printer, Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { InvoicePaymentDialog } from "@/features/restaurant-dashboard/components/invoice-payment-dialog";
import { addInvoicePayment, getInvoice } from "@/features/restaurant-dashboard/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import type { InvoicePaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAYMENT_STATUS_STYLE: Record<InvoicePaymentStatus, string> = {
  paid: "bg-success/10 text-success",
  partially_paid: "bg-zest-soft/40 text-zest-soft-foreground",
  unpaid: "bg-destructive/10 text-destructive",
};

export function InvoiceDetail({ id }: { id: string }) {
  const { t, lang, dir } = useI18n();
  const queryClient = useQueryClient();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  const { data: invoice, isLoading } = useQuery({
    queryKey: queryKeys.me.invoice(id),
    queryFn: () => getInvoice(id),
  });

  if (isLoading) return <LoadingSpinner />;
  if (!invoice) notFound();

  const statusLabel =
    invoice.paymentStatus === "paid"
      ? t.dashboard.paymentStatusPaid
      : invoice.paymentStatus === "partially_paid"
        ? t.dashboard.paymentStatusPartiallyPaid
        : t.dashboard.paymentStatusUnpaid;

  const dateFormat = new Intl.DateTimeFormat(lang === "ar" ? "ar-SY" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const recordPayment = async (amount: number) => {
    try {
      const result = await addInvoicePayment(id, { amount });
      await queryClient.invalidateQueries({ queryKey: queryKeys.me.invoice(id) });
      await queryClient.invalidateQueries({ queryKey: ["me", "invoices"] });
      toast.success(result?.message ?? t.dashboard.paymentRecorded);
      setPaymentDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    }
  };

  const whatsappHref =
    invoice.remaining > 0 && invoice.customerPhone
      ? (() => {
          const digits = invoice.customerPhone!.replace(/[\s+-]/g, "").replace(/^0/, "963");
          const message = fmt(t.dashboard.whatsappDebtReminderMessage, {
            customer: invoice.customerName ?? "",
            amount: formatPrice(invoice.remaining, invoice.currency, lang),
            number: invoice.number,
            business: invoice.businessName,
          });
          return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
        })()
      : null;

  return (
    <div className="space-y-5">
      <Link
        href={`/${lang}/dashboard/invoices`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"
      >
        <BackIcon className="size-4" />
        {t.dashboard.backToInvoices}
      </Link>

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Receipt className="size-5 text-muted-foreground" />
            <div>
              <h1 className="font-heading text-lg font-bold">
                {fmt(t.dashboard.invoiceNumber, { number: invoice.number })}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t.dashboard.issuedOn} {dateFormat.format(new Date(invoice.issuedAt))}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge className={cn(PAYMENT_STATUS_STYLE[invoice.paymentStatus])}>
              {statusLabel}
            </Badge>
            <Button
              size="icon-sm"
              variant="outline"
              aria-label={t.dashboard.printReceipt}
              render={
                <a href={`/${lang}/print/invoices/${invoice.id}`} target="_blank" rel="noreferrer" />
              }
            >
              <Printer className="size-3.5" />
            </Button>
          </div>
        </div>

        {(invoice.customerName || invoice.customerPhone) && (
          <p className="mt-3 text-sm text-muted-foreground">
            {invoice.customerName}
            {invoice.customerPhone && (
              <span dir="ltr"> · {invoice.customerPhone}</span>
            )}
          </p>
        )}

        <ul className="mt-4 space-y-1.5 border-t border-dashed border-border pt-4 text-sm">
          {invoice.lines.map((line, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>
                {line.quantity}× {line.name}
              </span>
              <span dir="ltr" className="text-muted-foreground">
                {formatPrice(line.lineTotal, invoice.currency, lang)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1.5 border-t border-dashed border-border pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.dashboard.totalAmount}</span>
            <span className="font-semibold" dir="ltr">
              {formatPrice(invoice.totalAmount, invoice.currency, lang)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t.dashboard.amountPaidLabel}</span>
            <span dir="ltr">{formatPrice(invoice.amountPaid, invoice.currency, lang)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-bold">{t.dashboard.remainingAmount}</span>
            <span className="font-bold text-primary" dir="ltr">
              {formatPrice(invoice.remaining, invoice.currency, lang)}
            </span>
          </div>
        </div>

        {invoice.remaining > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
              {t.dashboard.recordPayment}
            </Button>
            {whatsappHref && (
              <Button size="sm" variant="outline" render={<a href={whatsappHref} target="_blank" rel="noreferrer" />}>
                <MessageCircle className="size-3.5" />
                {t.dashboard.remindViaWhatsapp}
              </Button>
            )}
          </div>
        )}
      </div>

      <h2 className="font-heading text-sm font-bold text-muted-foreground">
        {t.dashboard.paymentHistory}
      </h2>
      {!invoice.payments || invoice.payments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t.dashboard.noPaymentsYet}
        </p>
      ) : (
        <ul className="space-y-2">
          {invoice.payments.map((payment) => (
            <li
              key={payment.id}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-2.5 text-sm"
            >
              <span dir="ltr" className="font-semibold">
                {formatPrice(payment.amount, invoice.currency, lang)}
              </span>
              <span className="text-xs text-muted-foreground">
                {dateFormat.format(new Date(payment.paidAt))}
              </span>
            </li>
          ))}
        </ul>
      )}

      <InvoicePaymentDialog
        invoice={invoice}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSubmit={recordPayment}
      />
    </div>
  );
}
