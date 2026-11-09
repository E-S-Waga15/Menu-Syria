"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FieldError } from "@/components/shared/field-error";
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
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
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
            <div className="space-y-1.5">
              <Label htmlFor="payment-amount">{t.dashboard.paymentAmount}</Label>
              <Input
                id="payment-amount"
                dir="ltr"
                inputMode="numeric"
                aria-invalid={!!errors.amount}
                {...register("amount")}
              />
              <FieldError message={errors.amount?.message} />
              {invoice && (
                <p className="text-xs text-muted-foreground">
                  {fmt(t.dashboard.paymentAmountMax, {
                    amount: formatPrice(invoice.remaining, invoice.currency, lang),
                  })}
                </p>
              )}
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
