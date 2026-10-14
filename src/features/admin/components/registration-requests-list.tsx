"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  Check,
  Clock3,
  MapPin,
  Phone,
  Store,
  User,
  UserCheck,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  getAdminPlans,
  updateRegistrationRequestStatus,
  type RegistrationRequest,
  type SubscriptionDurationType,
} from "@/features/admin/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import type { Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<RegistrationRequest["type"], typeof Store> = {
  restaurant: Store,
  store: Building2,
  agent: User,
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const maxEndDateIso = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

/** preview-only — the real end date is always computed server-side from the
 * approval moment, this just shows the admin what to expect before confirming */
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

export function RegistrationRequestsList({
  initialRequests,
}: {
  initialRequests: RegistrationRequest[];
}) {
  const { t, lang } = useI18n();
  const [requests, setRequests] = useState(initialRequests);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    void getAdminPlans().then(setPlans);
  }, []);

  // approve dialog — plan + how long the subscription runs
  const [approving, setApproving] = useState<RegistrationRequest | null>(null);
  const [planId, setPlanId] = useState("");
  const [durationType, setDurationType] =
    useState<SubscriptionDurationType>("monthly");
  const [durationMonths, setDurationMonths] = useState(1);
  const [endDate, setEndDate] = useState(todayIso());
  const [savingApprove, setSavingApprove] = useState(false);

  // reject confirm
  const [rejecting, setRejecting] = useState<RegistrationRequest | null>(null);
  const [savingReject, setSavingReject] = useState(false);

  const selectedPlan = plans.find((p) => p.id === planId);
  const planItems = Object.fromEntries(
    plans.map((p) => [
      p.id,
      `${p.name[lang]} — ${formatPrice(p.priceMonthly, p.currency, lang)}${t.admin.pricePerMonth}`,
    ]),
  );
  const endDatePreview = previewEndDate(durationType, durationMonths, endDate);

  const openApprove = (request: RegistrationRequest) => {
    setApproving(request);
    setPlanId(request.planId ?? plans[0]?.id ?? "");
    setDurationType("monthly");
    setDurationMonths(1);
    setEndDate(todayIso());
  };

  const confirmApprove = async () => {
    if (!approving || !planId) return;
    setSavingApprove(true);
    try {
      const duration: Parameters<typeof updateRegistrationRequestStatus>[3] =
        durationType === "monthly"
          ? { durationType, durationMonths }
          : durationType === "custom"
            ? { durationType, endDate }
            : { durationType: "yearly" };
      const updated = await updateRegistrationRequestStatus(
        approving.id,
        "approved",
        planId,
        duration,
      );
      setRequests((current) =>
        current.map((item) => (item.id === approving.id ? updated : item)),
      );
      toast.success(
        (updated as { message?: string }).message ?? t.admin.requestApproved,
      );
      setApproving(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setSavingApprove(false);
    }
  };

  const confirmReject = async () => {
    if (!rejecting) return;
    setSavingReject(true);
    try {
      const updated = await updateRegistrationRequestStatus(
        rejecting.id,
        "rejected",
      );
      setRequests((current) =>
        current.map((item) => (item.id === rejecting.id ? updated : item)),
      );
      toast.success(
        (updated as { message?: string }).message ?? t.admin.requestRejected,
      );
      setRejecting(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setSavingReject(false);
    }
  };

  const statusLabel = (status: RegistrationRequest["status"]) =>
    status === "approved"
      ? t.admin.requestStatusApproved
      : status === "rejected"
        ? t.admin.requestStatusRejected
        : t.admin.requestStatusPending;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t.admin.registrationRequests}
        count={requests.length}
      />
      {requests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          {t.admin.noRegistrationRequests}
        </p>
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => {
            const TypeIcon = TYPE_ICON[request.type] ?? User;
            const typeWord =
              request.type === "restaurant"
                ? t.common.restaurantWord
                : request.type === "store"
                  ? t.common.storeWord
                  : t.common.agentWord;
            const canReview =
              request.status === "pending" ||
              (request.status === "approved" && !request.applicantUserId);
            return (
              <li
                key={request.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card p-5"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <TypeIcon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{request.applicantName}</p>
                    <Badge variant="secondary" className="text-[11px]">
                      {typeWord}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1" dir="ltr">
                      <Phone className="size-3.5" />
                      {request.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      {new Intl.DateTimeFormat(
                        lang === "ar" ? "ar-SY" : "en-GB",
                      ).format(new Date(request.createdAt))}
                    </span>
                    {request.district?.name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {request.district.name}
                      </span>
                    )}
                  </div>
                  {request.agent?.name && (
                    <p className="mt-1.5 flex items-center gap-1 text-sm text-success">
                      <UserCheck className="size-3.5" />
                      {t.admin.referredByAgent} {request.agent.name}
                    </p>
                  )}
                  {request.plan && (
                    <p className="mt-1.5 text-sm font-semibold text-primary">
                      {request.plan.name}
                    </p>
                  )}
                  {request.notes && (
                    <p className="mt-1.5 text-sm">{request.notes}</p>
                  )}
                </div>
                <Badge
                  className={cn(
                    request.status === "approved" && "bg-success/10 text-success",
                    request.status === "rejected" &&
                      "bg-destructive/10 text-destructive",
                    request.status === "pending" && "bg-muted text-muted-foreground",
                  )}
                >
                  {statusLabel(request.status)}
                </Badge>
                {canReview && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openApprove(request)}>
                      <Check className="size-4" /> {t.admin.approveRequest}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejecting(request)}
                    >
                      <X className="size-4" /> {t.admin.rejectRequest}
                    </Button>
                  </div>
                )}
                {request.status === "pending" && (
                  <Clock3 className="size-4 shrink-0 text-muted-foreground" />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* approve: pick the plan and how long the subscription runs —
          starts the moment this is confirmed, never more than a year */}
      <Dialog
        open={!!approving}
        onOpenChange={(open) => !open && !savingApprove && setApproving(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.admin.approveRequest}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.admin.selectPlan}</Label>
              <Select
                value={planId || null}
                onValueChange={(v) => v && setPlanId(v)}
                items={planItems}
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
              disabled={savingApprove}
              onClick={() => setApproving(null)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!planId}
              loading={savingApprove}
              onClick={() => void confirmApprove()}
            >
              {t.admin.approveRequest}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!rejecting}
        onOpenChange={(open) => !open && !savingReject && setRejecting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.admin.confirmRejectRequestTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.confirmRejectRequestBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={savingReject}
              onClick={() => setRejecting(null)}
            >
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={savingReject}
              onClick={() => void confirmReject()}
            >
              {t.admin.rejectRequest}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
