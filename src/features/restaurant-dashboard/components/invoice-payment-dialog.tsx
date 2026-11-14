"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/shared/field-error";
import { Price } from "@/components/shared/price";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  invoicePaymentFormSchema,
  type InvoicePaymentFormValues,
} from "@/features/restaurant-dashboard/schemas";
import { useI18n } from "@/i18n/client";
import type { Invoice } from "@/lib/types";

export function InvoicePaymentDialog({
  invoice,
  open,
  onOpenChange,
  onSubmit,
}: {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (amount: number) => Promise<void> | void;
}) {
  const { t, lang } = useI18n();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<InvoicePaymentFormValues>({
    resolver: zodResolver(invoicePaymentFormSchema(t.validation)),
    defaultValues: { amount: "" },
    mode: "onTouched",
  });

  const [seededFor, setSeededFor] = useState<{ invoice: Invoice | null; open: boolean } | null>(
    null,
  );
  if (seededFor?.invoice !== invoice || seededFor?.open !== open) {
    setSeededFor({ invoice, open });
    reset({ amount: "" });
  }

  const submit = async (values: InvoicePaymentFormValues) => {
    setIsSaving(true);
    try {
      await onSubmit(Number(values.amount));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.dashboard.recordPaymentTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} noValidate>
          <div className="space-y-4 px-4 pb-2">
            {invoice && (
              <div className="space-y-2 rounded-xl bg-surface-container-low p-3.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.dashboard.invoiceTotalLabel}</span>
                  <Price amount={invoice.totalAmount} currency={invoice.currency} lang={lang} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t.dashboard.invoicePaidSoFarLabel}
                  </span>
                  <Price amount={invoice.amountPaid} currency={invoice.currency} lang={lang} />
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-success"
                    style={{
                      width: `${invoice.totalAmount > 0 ? Math.min(100, (invoice.amountPaid / invoice.totalAmount) * 100) : 0}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>{t.dashboard.remainingAmount}</span>
                  <Price amount={invoice.remaining} currency={invoice.currency} lang={lang} className="text-primary" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="payment-amount">{t.dashboard.paymentAmount}</Label>
                {invoice && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:underline"
                    onClick={() =>
                      setValue("amount", String(invoice.remaining), { shouldValidate: true })
                    }
                  >
                    {t.dashboard.payFullAmount}
                  </button>
                )}
              </div>
              <Input
                id="payment-amount"
                dir="ltr"
                inputMode="numeric"
                aria-invalid={!!errors.amount}
                {...register("amount")}
              />
              <FieldError message={errors.amount?.message} />
            </div>
          </div>
          <DialogFooter className="px-4 pb-4">
            <Button type="submit" loading={isSaving} className="w-full">
              {t.dashboard.recordPayment}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
