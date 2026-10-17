"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CalendarClock,
  CalendarDays,
  ExternalLink,
  MapPin,
  Phone,
  Power,
  RefreshCw,
  Star,
  Trash2,
  Wallet,
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
import { Spinner } from "@/components/ui/spinner";
import { SafeImage } from "@/components/shared/safe-image";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { SubscriptionApprovalDialog } from "@/features/admin/components/subscription-approval-dialog";
import {
  deleteAdminBusiness,
  getBusinessSubscriptions,
  renewSubscription,
  updateAdminBusinessStatus,
} from "@/features/admin/services";
import { daysUntil } from "@/features/notifications/services";
import {
  createSubscriptionRequest,
  updateSubscriptionRequestStatus,
} from "@/features/subscription-requests/services";
import { fmt, useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import type { Business } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * One business, as the console needs it: who they are, what they pay for, and
 * the controls an admin actually has over them.
 *
 * Renew, change plan and disable raise requests rather than mutating billing
 * here — the console records intent, the billing system settles it.
 */
export function AdminBusinessDetail({
  business,
  governorateName,
  regionName,
  kind,
}: {
  business: Business;
  governorateName: string;
  regionName: string;
  kind: "restaurant" | "store";
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(business.status === "active");
  const [savingStatus, setSavingStatus] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [confirmingRenew, setConfirmingRenew] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [savingPlanChange, setSavingPlanChange] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const subscriptionsQueryKey = ["admin", "subscriptions", business.id];
  const { data: subscriptions = [] } = useQuery({
    queryKey: subscriptionsQueryKey,
    queryFn: () => getBusinessSubscriptions(business.id),
  });
  const currentSubscription = subscriptions[0];

  const days = daysUntil(business.planExpiresAt);
  const expired = days < 0;
  const storefront = `/${business.slug}/menu`;

  const dateFormat = new Intl.DateTimeFormat(
    lang === "ar" ? "ar-SY" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );

  // the mock carries no start date, so the plan year is inferred from its end
  const start = new Date(business.planExpiresAt);
  start.setFullYear(start.getFullYear() - 1);

  const toggleAccount = async () => {
    const next = !enabled;
    setSavingStatus(true);
    try {
      const result = await updateAdminBusinessStatus(
        business.id,
        next ? "active" : "inactive",
      );
      setEnabled(next);
      toast.success(
        result?.message ??
          (next ? t.admin.accountEnabled : t.admin.accountDisabled),
      );
      setConfirmToggle(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setSavingStatus(false);
    }
  };

  const confirmRenew = async () => {
    if (!currentSubscription) return;
    setRenewing(true);
    try {
      const result = await renewSubscription(currentSubscription.id);
      toast.success(result?.message ?? t.admin.renewDone);
      await queryClient.invalidateQueries({ queryKey: subscriptionsQueryKey });
      setConfirmingRenew(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setRenewing(false);
    }
  };

  const confirmChangePlan = async (input: {
    planId: string;
    durationType: "monthly" | "custom" | "yearly";
    durationMonths?: number;
    endDate?: string;
  }) => {
    setSavingPlanChange(true);
    try {
      const request = await createSubscriptionRequest({
        businessId: business.id,
        planId: input.planId,
      });
      const result = await updateSubscriptionRequestStatus(
        request.id,
        "approved",
        input,
      );
      toast.success(
        (result as { message?: string })?.message ?? t.admin.planChanged,
      );
      await queryClient.invalidateQueries({ queryKey: subscriptionsQueryKey });
      setChangingPlan(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setSavingPlanChange(false);
    }
  };

  const confirmDeleteBusiness = async () => {
    setDeleting(true);
    try {
      const result = await deleteAdminBusiness(business.id);
      toast.success(result?.message ?? t.admin.accountDeleted);
      router.push(`/${lang}/admin/${kind === "restaurant" ? "restaurants" : "stores"}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t.admin.businessDetails}
        action={
          <Button
            variant="outline"
            render={<Link href={storefront} target="_blank" />}
          >
            <ExternalLink className="size-4" />
            {t.admin.openStorefront}
          </Button>
        }
      />

      <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <SafeImage
            src={business.logoUrl}
            alt=""
            width={72}
            height={72}
            className="size-16 shrink-0 rounded-2xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-xl font-bold">
              {business.name[lang]}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {governorateName}
                {lang === "ar" ? "، " : ", "}
                {regionName}
              </span>
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <Star className="size-4 fill-zest text-zest" />
                {business.rating}
              </span>
            </p>
          </div>
          <Badge
            className={cn(
              "shrink-0",
              enabled
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {enabled ? t.admin.statusActive : t.admin.statusBanned}
          </Badge>
          <Button
            variant="outline"
            className="h-9 border-[1.5px] border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="size-4" />
            {t.admin.deleteAccount}
          </Button>
        </div>

        {business.agent && (
          <Badge className="mt-4 bg-berry-soft text-berry-soft-foreground">
            {fmt(t.admin.activatedViaAgent, { name: business.agent.name })}
          </Badge>
        )}

        {business.description[lang] && (
          <p className="mt-4 border-t border-border/60 pt-4 text-sm leading-relaxed text-muted-foreground">
            {business.description[lang]}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
        <h2 className="font-heading text-lg font-bold">
          {t.admin.subscriptionSection}
        </h2>

        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="label-eyebrow text-muted-foreground">
              {t.agent.subscriptionStart}
            </dt>
            <dd className="mt-1.5 flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="size-4 text-muted-foreground" />
              {dateFormat.format(start)}
            </dd>
          </div>
          <div>
            <dt className="label-eyebrow text-muted-foreground">
              {t.agent.subscriptionEnd}
            </dt>
            <dd className="mt-1.5 flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="size-4 text-muted-foreground" />
              {dateFormat.format(new Date(business.planExpiresAt))}
            </dd>
          </div>
          <div>
            <dt className="label-eyebrow text-muted-foreground">
              {t.agent.currentPlan}
            </dt>
            <dd className="mt-1.5 text-sm font-semibold">
              {currentSubscription?.plan?.name ?? business.planName ?? t.dashboard.defaultPlanName}
            </dd>
          </div>
        </dl>

        <p
          className={cn(
            "mt-5 rounded-xl border-s-2 px-4 py-3 text-sm font-semibold",
            expired
              ? "border-s-destructive bg-destructive/5 text-destructive"
              : "border-s-success bg-success/5 text-success",
          )}
        >
          {expired
            ? fmt(t.agent.daysOverdue, { days: Math.abs(days) })
            : fmt(t.agent.daysLeft, { days })}
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button
            className="h-11 flex-1"
            onClick={() => setConfirmingRenew(true)}
            disabled={!expired || !currentSubscription}
          >
            <RefreshCw className="size-4" />
            {t.admin.renewSubscription}
          </Button>
          <Button
            variant="outline"
            className="h-11 flex-1 border-[1.5px]"
            onClick={() => setChangingPlan(true)}
            disabled={!currentSubscription}
          >
            <Wallet className="size-4" />
            {t.admin.upgradePlan}
          </Button>
        </div>
        {!expired && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t.admin.renewNotAllowedHint}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
        <h2 className="font-heading text-lg font-bold">
          {t.admin.ownerContact}
        </h2>
        <a
          href={`tel:${business.phone.replace(/\s/g, "")}`}
          className="mt-3 flex items-center gap-2.5 text-base font-semibold transition-colors hover:text-primary"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ffd9de] text-[#90003b]">
            <Phone className="size-4" />
          </span>
          <span dir="ltr">{business.phone}</span>
        </a>

        <div className="mt-6 border-t border-border/60 pt-5">
          <Button
            variant={enabled ? "outline" : "default"}
            className={cn(
              "h-11",
              enabled &&
              "border-[1.5px] border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive",
            )}
            onClick={() => setConfirmToggle(true)}
            disabled={savingStatus}
          >
            {savingStatus ? <Spinner size="xs" tone="current" /> : <Power className="size-4" />}
            {enabled ? t.admin.disableAccount : t.admin.enableAccount}
          </Button>
        </div>
      </section>

      <AlertDialog
        open={confirmToggle}
        onOpenChange={(open) => !open && !savingStatus && setConfirmToggle(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {fmt(enabled ? t.admin.confirmDisable : t.admin.confirmEnable, {
                name: business.name[lang],
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {enabled ? t.admin.confirmDisableBody : t.admin.confirmEnableBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={savingStatus}
              onClick={() => setConfirmToggle(false)}
            >
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={enabled ? "destructive" : "default"}
              loading={savingStatus}
              onClick={() => void toggleAccount()}
            >
              {enabled ? t.admin.disableAccount : t.admin.enableAccount}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmingDelete}
        onOpenChange={(open) => !open && !deleting && setConfirmingDelete(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {fmt(t.admin.confirmDeleteTitle, { name: business.name[lang] })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {fmt(t.admin.confirmDeleteBody, { name: business.name[lang] })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              onClick={() => setConfirmingDelete(false)}
            >
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={deleting}
              onClick={() => void confirmDeleteBusiness()}
            >
              {t.admin.deleteAccount}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmingRenew}
        onOpenChange={(open) => !open && !renewing && setConfirmingRenew(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {fmt(t.admin.confirmRenewTitle, { name: business.name[lang] })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {fmt(t.admin.confirmRenewBody, { name: business.name[lang] })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={renewing}
              onClick={() => setConfirmingRenew(false)}
            >
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              loading={renewing}
              onClick={() => void confirmRenew()}
            >
              {t.admin.renewSubscription}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SubscriptionApprovalDialog
        open={changingPlan}
        onOpenChange={setChangingPlan}
        subjectName={business.name[lang]}
        dialogTitle={fmt(t.admin.upgradePlanDialogTitle, { name: business.name[lang] })}
        confirmTitle={t.admin.confirmUpgradePlanTitle}
        confirmBody={t.admin.confirmUpgradePlanBody}
        initialPlanId={currentSubscription?.planId}
        loading={savingPlanChange}
        onConfirm={(input) => void confirmChangePlan(input)}
      />
    </div>
  );
}
