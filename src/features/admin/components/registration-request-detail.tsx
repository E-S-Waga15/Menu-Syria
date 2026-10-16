"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
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
import { Badge } from "@/components/ui/badge";
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
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  getAdminPlans,
  updateRegistrationRequestStatus,
  type RegistrationRequest,
  type SubscriptionDurationType,
} from "@/features/admin/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
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
 * One registration request in full — everything the list's card only has
 * room to summarize, plus the same approve/reject actions, for the admin who
 * clicked through wanting the whole picture before deciding.
 */
export function RegistrationRequestDetail({
  initialRequest,
}: {
  initialRequest: RegistrationRequest;
}) {
  const { t, lang, dir } = useI18n();
  const router = useRouter();
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;
  const [request, setRequest] = useState(initialRequest);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    void getAdminPlans().then(setPlans);
  }, []);

  const [approving, setApproving] = useState(false);
  const [planId, setPlanId] = useState("");
  const [durationType, setDurationType] =
    useState<SubscriptionDurationType>("monthly");
  const [durationMonths, setDurationMonths] = useState(1);
  const [endDate, setEndDate] = useState(todayIso());
  const [savingApprove, setSavingApprove] = useState(false);

  const [rejecting, setRejecting] = useState(false);
  const [savingReject, setSavingReject] = useState(false);

  const selectedPlan = plans.find((p) => p.id === planId);
  const endDatePreview = previewEndDate(durationType, durationMonths, endDate);

  const openApprove = () => {
    setPlanId(request.planId ?? plans[0]?.id ?? "");
    setDurationType("monthly");
    setDurationMonths(1);
    setEndDate(todayIso());
    setApproving(true);
  };

  const confirmApprove = async () => {
    if (!planId) return;
    setSavingApprove(true);
    try {
      const duration: Parameters<typeof updateRegistrationRequestStatus>[3] =
        durationType === "monthly"
          ? { durationType, durationMonths }
          : durationType === "custom"
            ? { durationType, endDate }
            : { durationType: "yearly" };
      const updated = await updateRegistrationRequestStatus(
        request.id,
        "approved",
        planId,
        duration,
      );
      setRequest(updated);
      toast.success(
        (updated as { message?: string }).message ?? t.admin.requestApproved,
      );
      setApproving(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setSavingApprove(false);
    }
  };

  const confirmReject = async () => {
    setSavingReject(true);
    try {
      const updated = await updateRegistrationRequestStatus(
        request.id,
        "rejected",
      );
      setRequest(updated);
      toast.success(
        (updated as { message?: string }).message ?? t.admin.requestRejected,
      );
      setRejecting(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setSavingReject(false);
    }
  };

  const statusLabel =
    request.status === "approved"
      ? t.admin.requestStatusApproved
      : request.status === "rejected"
        ? t.admin.requestStatusRejected
        : t.admin.requestStatusPending;

  const typeWord =
    request.type === "restaurant"
      ? t.common.restaurantWord
      : request.type === "store"
        ? t.common.storeWord
        : t.common.agentWord;

  const canReview =
    request.status === "pending" ||
    (request.status === "approved" && !request.applicantUserId);

  const TypeIcon = TYPE_ICON[request.type] ?? User;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t.admin.requestDetails}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${lang}/admin/registration-requests`)}
          >
            <BackIcon className="size-4" />
            {t.common.back}
          </Button>
        }
      />

      <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <TypeIcon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-xl font-bold">
                {request.applicantName}
              </h2>
              <Badge variant="secondary">{typeWord}</Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="size-3.5" />
              {fmt(t.admin.submittedOn, {
                date: new Intl.DateTimeFormat(
                  lang === "ar" ? "ar-SY" : "en-GB",
                  { day: "numeric", month: "long", year: "numeric" },
                ).format(new Date(request.createdAt)),
              })}
            </p>
          </div>
          <Badge
            className={cn(
              request.status === "approved" && "bg-success/10 text-success",
              request.status === "rejected" &&
                "bg-destructive/10 text-destructive",
              request.status === "pending" && "bg-muted text-muted-foreground",
            )}
          >
            {request.status === "pending" && (
              <Clock3 className="me-1 size-3.5" />
            )}
            {statusLabel}
          </Badge>
        </div>

        {request.notes && (
          <p className="mt-4 border-t border-border/60 pt-4 text-sm leading-relaxed text-muted-foreground">
            {request.notes}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
        <h2 className="font-heading text-lg font-bold">
          {t.admin.contactInfo}
        </h2>
        <a
          href={`tel:${request.phone.replace(/\s/g, "")}`}
          className="mt-3 flex items-center gap-2.5 text-base font-semibold transition-colors hover:text-primary"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ffd9de] text-[#90003b]">
            <Phone className="size-4" />
          </span>
          <span dir="ltr">{request.phone}</span>
        </a>
        {request.district?.name && (
          <p className="mt-3 flex items-center gap-2.5 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            {request.district.name}
          </p>
        )}
        {request.agent?.name && (
          <p className="mt-3 flex items-center gap-2.5 text-sm text-success">
            <UserCheck className="size-4" />
            {t.admin.referredByAgent} {request.agent.name}
          </p>
        )}
      </section>

      {(request.plan || request.subscriptionStartDate) && (
        <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
          <h2 className="font-heading text-lg font-bold">
            {t.admin.subscriptionSection}
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            {request.plan && (
              <div>
                <dt className="label-eyebrow text-muted-foreground">
                  {t.agent.currentPlan}
                </dt>
                <dd className="mt-1.5 text-sm font-semibold">
                  {request.plan.name}
                </dd>
              </div>
            )}
            {request.subscriptionStartDate && (
              <div>
                <dt className="label-eyebrow text-muted-foreground">
                  {t.agent.subscriptionStart}
                </dt>
                <dd className="mt-1.5 text-sm font-semibold" dir="ltr">
                  {new Intl.DateTimeFormat(
                    lang === "ar" ? "ar-SY" : "en-GB",
                  ).format(new Date(request.subscriptionStartDate))}
                </dd>
              </div>
            )}
            {request.subscriptionEndDate && (
              <div>
                <dt className="label-eyebrow text-muted-foreground">
                  {t.agent.subscriptionEnd}
                </dt>
                <dd className="mt-1.5 text-sm font-semibold" dir="ltr">
                  {new Intl.DateTimeFormat(
                    lang === "ar" ? "ar-SY" : "en-GB",
                  ).format(new Date(request.subscriptionEndDate))}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {canReview && (
        <div className="flex gap-2">
          <Button onClick={openApprove}>
            <Check className="size-4" /> {t.admin.approveRequest}
          </Button>
          <Button variant="outline" onClick={() => setRejecting(true)}>
            <X className="size-4" /> {t.admin.rejectRequest}
          </Button>
        </div>
      )}

      <Dialog
        open={approving}
        onOpenChange={(open) => !open && !savingApprove && setApproving(open)}
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
              disabled={savingApprove}
              onClick={() => setApproving(false)}
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
        open={rejecting}
        onOpenChange={(open) => !open && !savingReject && setRejecting(open)}
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
              onClick={() => setRejecting(false)}
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
