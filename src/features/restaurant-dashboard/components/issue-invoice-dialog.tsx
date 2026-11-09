"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  issueInvoiceFormSchema,
  type IssueInvoiceFormValues,
} from "@/features/restaurant-dashboard/schemas";
import { getCustomers, issueInvoice } from "@/features/restaurant-dashboard/services";
import { fmt, useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import type { Order } from "@/lib/types";

const NO_CUSTOMER = "none";

/**
 * Issuing an invoice for one `delivered` order — the report's own flow
 * (manual, from the dashboard, not auto-generated). Linking a persistent
 * customer is optional: picking one of the saved customers, or just typing
 * a phone number, lets the backend track a running debt across visits;
 * leaving both blank still issues the invoice, from the order's own
 * free-text name/phone.
 */
export function IssueInvoiceDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const { data: customersPage } = useQuery({
    queryKey: queryKeys.me.customers({ limit: 100 }),
    queryFn: () => getCustomers({ limit: 100 }),
    enabled: open,
  });
  const customers = customersPage?.items ?? [];

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<IssueInvoiceFormValues>({
    resolver: zodResolver(issueInvoiceFormSchema(t.validation)),
    defaultValues: {
      customerId: NO_CUSTOMER,
      phone: "",
      paymentMethod: "",
      amountPaid: "0",
    },
    mode: "onTouched",
  });

  const [seededFor, setSeededFor] = useState<{ order: Order | null; open: boolean } | null>(
    null,
  );
  if (seededFor?.order !== order || seededFor?.open !== open) {
    setSeededFor({ order, open });
    reset({
      customerId: NO_CUSTOMER,
      phone: "",
      paymentMethod: "",
      amountPaid: "0",
    });
  }

  const customerId = useWatch({ control, name: "customerId" });

  const submit = async (values: IssueInvoiceFormValues) => {
    if (!order) return;
    setIsSaving(true);
    try {
      const result = await issueInvoice({
        orderId: order.id,
        customerId: values.customerId !== NO_CUSTOMER ? values.customerId : undefined,
        customerPhone:
          values.customerId === NO_CUSTOMER && values.phone.trim()
            ? values.phone.trim()
            : undefined,
        paymentMethod: values.paymentMethod.trim() || undefined,
        amountPaid: values.amountPaid.trim() ? Number(values.amountPaid) : 0,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "customers"] }),
      ]);
      toast.success(result?.message ?? t.dashboard.invoiceIssued);
      onOpenChange(false);
      if (result?.id) router.push(`/${lang}/dashboard/invoices/${result.id}`);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : t.common.saveFailed,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto scrollbar-none">
        <DialogHeader>
          <DialogTitle>
            {order
              ? fmt(t.dashboard.issueInvoiceTitle, { number: order.number })
              : t.dashboard.issueInvoice}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} noValidate>
          <div className="space-y-4 px-4 pb-2">
            <div className="space-y-1.5">
              <Label>{t.dashboard.linkToCustomer}</Label>
              <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => value && field.onChange(value)}
                    items={{
                      [NO_CUSTOMER]: t.dashboard.noCustomerLink,
                      ...Object.fromEntries(customers.map((c) => [c.id, c.name])),
                    }}
                  >
                    <SelectTrigger className="h-10! w-full" aria-label={t.dashboard.linkToCustomer}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CUSTOMER}>
                        {t.dashboard.noCustomerLink}
                      </SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.phone ? ` — ${c.phone}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                {t.dashboard.linkToCustomerHint}
              </p>
            </div>

            {customerId === NO_CUSTOMER && (
              <div className="space-y-1.5">
                <Label htmlFor="invoice-customer-phone">
                  {t.dashboard.customerPhone}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({t.common.optional})
                  </span>
                </Label>
                <Input
                  id="invoice-customer-phone"
                  dir="ltr"
                  inputMode="tel"
                  placeholder="09XXXXXXXX"
                  aria-invalid={!!errors.phone}
                  {...register("phone")}
                />
                <FieldError message={errors.phone?.message} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="invoice-payment-method">
                {t.dashboard.paymentMethod}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t.common.optional})
                </span>
              </Label>
              <Input
                id="invoice-payment-method"
                placeholder={t.dashboard.paymentMethodPlaceholder}
                {...register("paymentMethod")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invoice-amount-paid">{t.dashboard.amountPaidNow}</Label>
              <Input
                id="invoice-amount-paid"
                dir="ltr"
                inputMode="numeric"
                aria-invalid={!!errors.amountPaid}
                {...register("amountPaid")}
              />
              <p className="text-xs text-muted-foreground">
                {t.dashboard.amountPaidNowHint}
              </p>
              <FieldError message={errors.amountPaid?.message} />
            </div>
          </div>
          <DialogFooter className="px-4 pb-4">
            <Button type="submit" loading={isSaving} className="w-full">
              {t.dashboard.issueInvoice}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
