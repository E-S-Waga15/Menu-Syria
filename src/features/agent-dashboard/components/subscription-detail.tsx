"use client";

import { SafeImage } from "@/components/shared/safe-image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  ExternalLink,
  Phone,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requestBusinessRenewal } from "@/features/agent-dashboard/services";
import { getSubscriptionPlans } from "@/features/marketing/services";
import { daysUntil } from "@/features/notifications/services";
import { fmt, useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import type { Business } from "@/lib/types";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/**
 * One subscription, in the order an agent needs it: whose it is, how long it
 * has, then the two things they can do about it.
 *
 * Renew and upgrade file a subscription request rather than taking payment —
 * billing is confirmed hand-to-hand by an admin, and a button that silently
 * does nothing would be worse than one that says what it started.
 */
export function SubscriptionDetail({
  business,
  kind,
}: {
  business: Business;
  kind: "restaurant" | "store";
}) {
  const { t, lang } = useI18n();
  const days = daysUntil(business.planExpiresAt);
  const expired = days < 0;
  const soon = !expired && days <= 30;

  const dateFormat = new Intl.DateTimeFormat(
    lang === "ar" ? "ar-SY" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );

  // the mock has no start date, so the plan year is inferred from its end
  const start = new Date(business.planExpiresAt);
  start.setFullYear(start.getFullYear() - 1);

  const status = expired
    ? {
        label: t.agent.statusExpired,
        className: "bg-destructive/10 text-destructive",
      }
    : business.status === "pending"
      ? {
          label: t.agent.statusPending,
          className: "bg-zest-soft text-zest-soft-foreground",
        }
      : {
          label: t.agent.statusActive,
          className: "bg-success/10 text-success",
        };

  const storefront = `/${business.slug}/menu`;

  // Plans drive the request: the agent picks the target plan, then the
  // request tells the admin to collect the cash and activate/renew it.
  const [plans, setPlans] = useState<
    { id: string; name: string; price: number }[]
  >([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    void getSubscriptionPlans().then((fetched) => {
      setPlans(fetched);
      if (fetched.length === 1) setSelectedPlanId(fetched[0]!.id);
    });
  }, []);

  const request = async (kind2: "renew" | "upgrade") => {
    if (!selectedPlanId) return;
    setRequesting(true);
    try {
      const result = await requestBusinessRenewal(business.id, selectedPlanId);
      toast.success(
        result?.message ??
          (kind2 === "upgrade" ? t.agent.upgradeRequested : t.agent.renewRequested),
      );
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <SafeImage
          src={business.logoUrl}
          alt=""
          width={72}
          height={72}
          className="size-16 shrink-0 rounded-2xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl font-bold">
            {business.name[lang]}
          </h1>
          <span
            className={cn(
              "mt-1.5 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
              status.className,
            )}
          >
            {status.label}
          </span>
        </div>
        <Button
          variant="outline"
          className="shrink-0"
          render={<Link href={storefront} target="_blank" />}
        >
          <ExternalLink className="size-4" />
          {t.agent.openStorefront}
        </Button>
      </div>

      <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
        <h2 className="font-heading text-lg font-bold">
          {t.agent.subscriptionTitle}
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
              {t.agent.planStandard}
            </dd>
          </div>
        </dl>

        <p
          className={cn(
            "mt-5 rounded-xl border-s-2 px-4 py-3 text-sm font-semibold",
            expired
              ? "border-s-destructive bg-destructive/5 text-destructive"
              : soon
                ? "border-s-zest bg-zest-soft/40 text-zest-soft-foreground"
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
            disabled={requesting || !selectedPlanId}
            onClick={() => void request("renew")}
          >
            <RefreshCw className="size-4" />
            {t.agent.renewPlan}
          </Button>
          <Button
            variant="outline"
            className="h-11 flex-1 border-[1.5px]"
            disabled={requesting || !selectedPlanId}
            onClick={() => void request("upgrade")}
          >
            <ArrowUpRight className="size-4" />
            {t.agent.upgradePlan}
          </Button>
        </div>

        {/* One plan picker serves both actions — the request just carries it */}
        {plans.length > 0 && (
          <Select
            value={selectedPlanId}
            onValueChange={(value) => {
              if (value) setSelectedPlanId(value);
            }}
          >
            <SelectTrigger
              className="mt-2 h-10! w-full sm:mt-3 sm:w-auto"
              aria-label={t.admin.selectPlan}
            >
              <SelectValue placeholder={t.admin.selectPlan} />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                  {" — "}
                  {plan.price}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
        <h2 className="font-heading text-lg font-bold">
          {t.agent.contactOwner}
        </h2>
        <a
          href={`tel:${business.phone.replace(/\s/g, "")}`}
          className="mt-3 flex items-center gap-2.5 text-base font-semibold"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-berry-soft text-berry-soft-foreground">
            <Phone className="size-4" />
          </span>
          <span dir="ltr">{business.phone}</span>
        </a>
      </section>
    </div>
  );
}
