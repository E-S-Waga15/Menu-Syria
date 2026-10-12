"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  CalendarClock,
  CalendarDays,
  ExternalLink,
  MapPin,
  Phone,
  Power,
  RefreshCw,
  Star,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { SafeImage } from "@/components/shared/safe-image";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
  changeBusinessPlan,
  getAdminPlans,
  getBusinessSubscriptions,
  updateAdminBusinessStatus,
} from "@/features/admin/services";
import { daysUntil } from "@/features/notifications/services";
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
  const [enabled, setEnabled] = useState(business.status === "active");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const { data: plans = [] } = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => getAdminPlans(),
  });
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["admin", "subscriptions", business.id],
    queryFn: () => getBusinessSubscriptions(business.id),
  });
  const currentSubscription = subscriptions[0];

  const days = daysUntil(business.planExpiresAt);
  const expired = days < 0;
  const storefront = `/${lang}/${business.slug}/menu`;

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
      await updateAdminBusinessStatus(
        business.id,
        next ? "active" : "inactive",
      );
      setEnabled(next);
      toast.success(next ? t.admin.accountEnabled : t.admin.accountDisabled);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setSavingStatus(false);
    }
  };

  const changePlan = async (planId: string) => {
    if (!currentSubscription || planId === currentSubscription.planId) return;
    setSavingPlan(true);
    try {
      await changeBusinessPlan(currentSubscription.id, planId);
      toast.success(t.admin.planChanged);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setSavingPlan(false);
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

      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 md:p-6">
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
              <Select
                value={currentSubscription?.planId ?? ""}
                onValueChange={(value) => {
                  if (value) void changePlan(value);
                }}
                disabled={
                  savingPlan || plans.length === 0 || !currentSubscription
                }
              >
                <SelectTrigger className="h-9! w-fit min-w-44">
                  <SelectValue placeholder={t.admin.selectPlan} />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name[lang]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            onClick={() => toast.success(t.admin.renewDone)}
          >
            <RefreshCw className="size-4" />
            {t.admin.renewSubscription}
          </Button>
          <Button
            variant="outline"
            className="h-11 flex-1 border-[1.5px]"
            onClick={() => currentSubscription && changePlan(currentSubscription.planId)}
            disabled={savingPlan || !currentSubscription}
          >
            {savingPlan ? <Spinner size="xs" tone="current" /> : <Wallet className="size-4" />}
            {t.admin.changePlan}
          </Button>
        </div>
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
            onClick={toggleAccount}
            disabled={savingStatus}
          >
            {savingStatus ? <Spinner size="xs" tone="current" /> : <Power className="size-4" />}
            {enabled ? t.admin.disableAccount : t.admin.enableAccount}
          </Button>
        </div>
      </section>
    </div>
  );
}
