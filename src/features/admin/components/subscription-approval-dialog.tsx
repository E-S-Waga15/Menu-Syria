"use client";

import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  getAdminPlans,
  type SubscriptionDurationInput,
  type SubscriptionDurationType,
} from "@/features/admin/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
import type { Plan } from "@/lib/types";

const todayIso = () => new Date().toISOString().slice(0, 10);
const maxEndDateIso = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

/** preview-only — the real end date (and the amount owed) is always computed
 * server-side at the approval moment, this just shows the admin what to
 * expect before they confirm */
function previewEndDate(
  durationType: SubscriptionDurationType,
  durationMonths: number,
  endDate: string,
): Date | null {
  if (durationType === "custom") {
    const d = new Date(endDate);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date();
  if (durationType === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + durationMonths);
  return d;
}

/**
 * A two-step confirmation shared by every place an admin commits a business
 * to a plan+duration — approving a registration request, approving a
 * subscription request, or changing a business's plan directly. Step one
 * picks the plan and duration (a Dialog); step two restates exactly what's
 * about to happen and asks for an explicit confirm (an AlertDialog) — this
 * second step exists specifically so a plan/subscription change can't fire
 * from a single accidental click, the way an admin's renewal click once did.
 */
export function SubscriptionApprovalDialog({
  open,
  onOpenChange,
  subjectName,
  dialogTitle,
  confirmTitle,
  confirmBody,
  initialPlanId,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectName: string;
  dialogTitle: string;
  confirmTitle: string;
  confirmBody: string;
  initialPlanId?: string | null;
  loading: boolean;
  onConfirm: (input: { planId: string } & SubscriptionDurationInput) => void;
}) {
  const { t, lang } = useI18n();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [durationType, setDurationType] =
    useState<SubscriptionDurationType>("monthly");
  const [durationMonths, setDurationMonths] = useState(1);
  const [endDate, setEndDate] = useState(todayIso());
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    void getAdminPlans().then(setPlans);
  }, []);

  // Resets the form fields whenever this dialog is (re)opened — compared
  // during render rather than in an effect, the same re-seed-on-change
  // pattern used elsewhere in the admin console for this exact kind of
  // derived reset.
  const openKey = `${open}|${initialPlanId ?? ""}`;
  const [lastOpenKey, setLastOpenKey] = useState(openKey);
  if (lastOpenKey !== openKey) {
    setLastOpenKey(openKey);
    if (open) {
      setPlanId(initialPlanId ?? "");
      setDurationType("monthly");
      setDurationMonths(1);
      setEndDate(todayIso());
      setConfirming(false);
    }
  }

  const selectedPlan = plans.find((p) => p.id === planId);
  const endDatePreview = previewEndDate(durationType, durationMonths, endDate);

  const duration: SubscriptionDurationInput =
    durationType === "monthly"
      ? { durationType, durationMonths }
      : durationType === "custom"
        ? { durationType, endDate }
        : { durationType: "yearly" };

  return (
    <>
      <Dialog
        open={open && !confirming}
        onOpenChange={(next) => !next && onOpenChange(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.admin.selectPlan}</Label>
              <Select
                value={planId || null}
                onValueChange={(v) => v && setPlanId(v)}
                items={Object.fromEntries(
                  plans.map((p) => [
                    p.id,
                    `${p.name[lang]} — ${formatPrice(p.priceMonthly, p.currency, lang)}${t.admin.pricePerMonth}`,
                  ]),
                )}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder={t.admin.selectPlan} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name[lang]} —{" "}
                      {formatPrice(plan.priceMonthly, plan.currency, lang)}
                      {t.admin.pricePerMonth}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPlan && (
                <p className="text-xs text-muted-foreground">
                  {formatPrice(selectedPlan.priceYearly, selectedPlan.currency, lang)}
                  {" "}
                  {t.admin.pricePerYear}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t.admin.subscriptionDurationLabel}</Label>
              <Select
                value={durationType}
                onValueChange={(v) =>
                  v && setDurationType(v as SubscriptionDurationType)
                }
                items={{
                  monthly: t.admin.durationMonthly,
                  custom: t.admin.durationCustom,
                  yearly: t.admin.durationYearly,
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">
                    {t.admin.durationMonthly}
                  </SelectItem>
                  <SelectItem value="custom">{t.admin.durationCustom}</SelectItem>
                  <SelectItem value="yearly">{t.admin.durationYearly}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {durationType === "monthly" && (
              <div className="space-y-2">
                <Label htmlFor="duration-months">
                  {t.admin.durationMonthsLabel}
                </Label>
                <Input
                  id="duration-months"
                  type="number"
                  inputMode="numeric"
                  dir="ltr"
                  min={1}
                  max={12}
                  value={durationMonths}
                  onChange={(e) =>
                    setDurationMonths(
                      Math.min(12, Math.max(1, Number(e.target.value) || 1)),
                    )
                  }
                  className="h-10 w-28"
                />
              </div>
            )}

            {durationType === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="duration-end-date">
                  {t.admin.durationEndDateLabel}
                </Label>
                <Input
                  id="duration-end-date"
                  type="date"
                  dir="ltr"
                  min={todayIso()}
                  max={maxEndDateIso()}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 w-full"
                />
              </div>
            )}

            {durationType === "yearly" && (
              <p className="text-sm text-muted-foreground">
                {t.admin.durationYearlyHint}
              </p>
            )}

            {endDatePreview && (
              <div className="rounded-xl bg-primary/5 px-3.5 py-2.5 text-sm">
                <span className="text-muted-foreground">
                  {t.admin.subscriptionEndsOn}{" "}
                </span>
                <span className="font-semibold text-primary">
                  {new Intl.DateTimeFormat(lang === "ar" ? "ar-SY" : "en-GB", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }).format(endDatePreview)}
                </span>
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!planId}
              onClick={() => setConfirming(true)}
            >
              {t.common.next}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={open && confirming}
        onOpenChange={(next) => !next && !loading && setConfirming(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{fmt(confirmTitle, { name: subjectName })}</AlertDialogTitle>
            <AlertDialogDescription>
              {fmt(confirmBody, { name: subjectName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={loading}
              onClick={() => setConfirming(false)}
            >
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              loading={loading}
              onClick={() => onConfirm({ planId, ...duration })}
            >
              {t.common.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
