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
  customerFormSchema,
  type CustomerFormValues,
} from "@/features/restaurant-dashboard/schemas";
import { useI18n } from "@/i18n/client";
import type { Customer } from "@/lib/types";

/** Create/edit panel for a single customer record — name is always
 * required, phone is optional (only required once a debt is actually
 * opened on an invoice). */
export function CustomerDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Customer | null;
  onSave: (values: CustomerFormValues) => Promise<void> | void;
}) {
  const { t } = useI18n();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema(t.validation)),
    defaultValues: { name: editing?.name ?? "", phone: editing?.phone ?? "" },
    mode: "onTouched",
  });

  const [seededFor, setSeededFor] = useState<{
    editing: Customer | null;
    open: boolean;
  } | null>(null);
  if (seededFor?.editing !== editing || seededFor?.open !== open) {
    setSeededFor({ editing, open });
    reset({ name: editing?.name ?? "", phone: editing?.phone ?? "" });
  }

  const submit = async (values: CustomerFormValues) => {
    setIsSaving(true);
    try {
      await onSave(values);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {editing ? t.dashboard.editCustomer : t.dashboard.addCustomer}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} noValidate>
          <div className="space-y-4 px-4 pb-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-name">{t.dashboard.customerName} *</Label>
              <Input
                id="customer-name"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-phone">
                {t.dashboard.customerPhone}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t.common.optional})
                </span>
              </Label>
              <Input
                id="customer-phone"
                dir="ltr"
                inputMode="tel"
                placeholder="09XXXXXXXX"
                aria-invalid={!!errors.phone}
                {...register("phone")}
              />
              <FieldError message={errors.phone?.message} />
            </div>
          </div>
          <DialogFooter className="px-4 pb-4">
            <Button type="submit" loading={isSaving} className="w-full">
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
