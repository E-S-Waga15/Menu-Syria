"use client";

import { useEffect } from "react";

import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Price } from "@/components/shared/price";
import { getInvoice } from "@/features/restaurant-dashboard/services";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * An 80mm thermal-receipt layout for one invoice — the browser's own print
 * dialog is the printing channel (works against a USB thermal printer's
 * driver, a regular printer, or "save as PDF" alike); nothing here talks to
 * QZ Tray or a network printer's socket directly yet, see
 * update-backend-orders.md's printing section for why that's a separate,
 * later integration. `@media print` below hides everything but the receipt
 * itself and sets the page size to match an 80mm roll.
 */
export function InvoicePrintView({ id }: { id: string }) {
  const { t, lang } = useI18n();

  const { data: invoice, isLoading } = useQuery({
    queryKey: queryKeys.me.invoice(id),
    queryFn: () => getInvoice(id),
  });

  useEffect(() => {
    if (invoice) {
      const timer = setTimeout(() => window.print(), 300);
      return () => clearTimeout(timer);
    }
  }, [invoice]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!invoice) {
    return (
      <p className="p-10 text-center text-sm text-muted-foreground">
        {t.dashboard.noInvoicesYet}
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
          <p className="text-sm font-bold">{invoice.businessName}</p>
          {invoice.businessAddress && <p>{invoice.businessAddress}</p>}
        </div>

        <div className="my-2 border-t border-dashed border-black" />

        <div className="flex justify-between">
          <span>#{invoice.number}</span>
          <span dir="ltr">{dateFormat.format(new Date(invoice.issuedAt))}</span>
        </div>
        {(invoice.customerName || invoice.customerPhone) && (
          <p className="mt-1">
            {invoice.customerName}
            {invoice.customerPhone ? ` — ${invoice.customerPhone}` : ""}
          </p>
        )}

        <div className="my-2 border-t border-dashed border-black" />

        {invoice.lines.map((line, i) => (
          <div key={i} className="mb-1 flex justify-between gap-2">
            <span className="min-w-0 flex-1 truncate">
              {line.quantity}× {line.name}
            </span>
            <Price amount={line.lineTotal} currency={invoice.currency} lang={lang} className="shrink-0" />
          </div>
        ))}

        <div className="my-2 border-t border-dashed border-black" />

        <div className="flex justify-between">
          <span>{t.dashboard.totalAmount}</span>
          <Price
            amount={invoice.totalAmount}
            currency={invoice.currency}
            lang={lang}
            className="font-bold"
          />
        </div>
        <div className="flex justify-between">
          <span>{t.dashboard.amountPaidLabel}</span>
          <Price amount={invoice.amountPaid} currency={invoice.currency} lang={lang} />
        </div>
        {invoice.remaining > 0 && (
          <div className="flex justify-between font-bold">
            <span>{t.dashboard.remainingAmount}</span>
            <Price amount={invoice.remaining} currency={invoice.currency} lang={lang} />
          </div>
        )}
        {invoice.paymentMethod && (
          <p className="mt-1">
            {t.dashboard.paymentMethod}: {invoice.paymentMethod}
          </p>
        )}

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
