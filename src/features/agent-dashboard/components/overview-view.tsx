"use client";

import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Copy,
  PackagePlus,
  Percent,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

import {
  QuickAccess,
  type QuickAccessItem,
} from "@/components/shared/quick-access";
import { SafeImage } from "@/components/shared/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { StatCard } from "@/features/restaurant-dashboard/components/stat-card";
import {
  getAgentDues,
  getAgentPlans,
  getMyAgentProfile,
  getMyReferredRestaurants,
  getMyReferredStores,
} from "@/features/agent-dashboard/services";
import { daysUntil } from "@/features/notifications/services";
import { fmt, useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import type { Business, LocalizedText } from "@/lib/types";

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)"];

/** inside this window a subscription is worth flagging on the overview */
const EXPIRING_WINDOW_DAYS = 30;

interface RenewalReminder {
  id: string;
  href: string;
  kind: "expired" | "expiringSoon";
  subjectName: LocalizedText;
  days: number;
}

/** The soonest-expiring businesses, worth a glance from the overview page —
 * a lightweight local derivation, not the real notifications feed (which
 * lives in its own feature and is about events, not this ongoing fact). */
function nearestRenewals(
  businesses: Business[],
  href: (business: Business) => string,
): RenewalReminder[] {
  return businesses
    .flatMap<RenewalReminder>((business) => {
      const days = daysUntil(business.planExpiresAt);
      if (days < 0) {
        return [
          {
            id: `expired-${business.id}`,
            href: href(business),
            kind: "expired",
            subjectName: business.name,
            days: Math.abs(days),
          },
        ];
      }
      if (days <= EXPIRING_WINDOW_DAYS) {
        return [
          {
            id: `expiring-${business.id}`,
            href: href(business),
            kind: "expiringSoon",
            subjectName: business.name,
            days,
          },
        ];
      }
      return [];
    })
    .sort((a, b) => a.days - b.days);
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
  fontWeight: 600,
};

/**
 * This page's dues cards kept showing "دولار 105" instead of "105 دولار"
 * even with dir="ltr" on the text and a Unicode LTR isolate wrapped around
 * it — neither stopped the browser reordering it here specifically. Laid
 * out as two separate flex items in an explicitly LTR flex row instead:
 * DOM/box order, not text bidi, decides what's on which side, so there's
 * no run of Unicode bidi logic left to go wrong. Declared at module scope
 * (not inside the component) so it isn't recreated every render.
 */
function MoneyValue({
  amount,
  currency,
  lang,
  currencyLabel,
}: {
  amount: number;
  currency: string;
  lang: Locale;
  /** the SYP label (t.common.currency) — USD always renders as "دولار"/"$" */
  currencyLabel: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1" style={{ direction: "ltr" }}>
      {/* source order deliberately flipped: on this page, "amount then
          currency" in the markup has consistently rendered visually as
          "currency then amount" across three different fix attempts —
          putting the currency first in the markup is what actually shows
          "105 دولار" on screen */}
      <span>
        {currency === "USD" ? (lang === "ar" ? "دولار" : "$") : currencyLabel}
      </span>
      <span>{amount.toLocaleString("en-US")}</span>
    </span>
  );
}

export function AgentOverviewView() {
  const { t, lang } = useI18n();
  const base = `/${lang}/agent`;

  const { data: agent } = useQuery({
    queryKey: queryKeys.agents.detail("me"),
    queryFn: () => getMyAgentProfile(),
  });
  const { data: restaurants } = useQuery({
    queryKey: queryKeys.agents.restaurants("me"),
    queryFn: () => getMyReferredRestaurants(),
  });
  const { data: stores } = useQuery({
    queryKey: queryKeys.agents.stores("me"),
    queryFn: () => getMyReferredStores(),
  });
  const { data: dues } = useQuery({
    queryKey: queryKeys.agents.dues,
    queryFn: () => getAgentDues(),
  });
  const { data: plans } = useQuery({
    queryKey: queryKeys.agents.plans,
    queryFn: () => getAgentPlans(),
  });

  if (!agent || !restaurants || !stores) {
    return <LoadingSpinner />;
  }

  const restaurantCount = restaurants.length;
  const storeCount = stores.length;
  const totalBusinesses = restaurantCount + storeCount;
  const discountPercent = plans?.[0]?.agentDiscountPercent ?? 30;

  // never summed across currencies (a SYP total and a USD total are not the
  // same number) — reading only `.SYP` silently showed 0 for an agent whose
  // dues happened to be in USD. Each non-zero currency gets its own figure.
  const owedEntries = Object.entries(dues?.totalOwedByCurrency ?? {}).filter(
    ([, amount]) => amount > 0,
  );
  const owedLabel =
    owedEntries.length > 0 ? (
      <span className="inline-flex flex-wrap items-baseline gap-1.5">
        {owedEntries.map(([currency, amount], i) => (
          <span key={currency} className="inline-flex items-baseline gap-1.5">
            {i > 0 && <span>+</span>}
            <MoneyValue
              amount={amount}
              currency={currency}
              lang={lang}
              currencyLabel={t.common.currency}
            />
          </span>
        ))}
      </span>
    ) : (
      <MoneyValue
        amount={0}
        currency={t.common.currency}
        lang={lang}
        currencyLabel={t.common.currency}
      />
    );

  const quickAccess: QuickAccessItem[] = [
    {
      href: `${base}/restaurants`,
      label: t.agent.myRestaurants,
      hint: t.agent.myRestaurantsHint,
      icon: Store,
    },
    {
      href: `${base}/stores`,
      label: t.agent.myStores,
      hint: t.agent.myStoresHint,
      icon: ShoppingBag,
    },
    {
      href: `${base}/register/restaurant`,
      label: t.agent.addRestaurant,
      hint: t.agent.registerRestaurantHint,
      icon: UtensilsCrossed,
    },
    {
      href: `${base}/register/store`,
      label: t.agent.addStore,
      hint: t.agent.registerStoreHint,
      icon: PackagePlus,
    },
    {
      href: `${base}/notifications`,
      label: t.notifications.title,
      hint: t.agent.notificationsHint,
      icon: Bell,
    },
  ];

  const copyReferralCode = async () => {
    await navigator.clipboard.writeText(agent.referralCode);
    toast.success(t.common.copied);
  };

  const renewals = nearestRenewals(
    [...restaurants, ...stores],
    (business) => `${base}/subscriptions/${business.id}`,
  ).slice(0, 3);

  // most recently joined first when the business has a real planStartedAt
  // (still missing on some existing records) — one without it still shows,
  // just sorts after every dated one instead of being hidden outright
  const latestSubscriptions = [...restaurants, ...stores]
    .sort((a, b) => {
      const at = a.planStartedAt ? new Date(a.planStartedAt).getTime() : 0;
      const bt = b.planStartedAt ? new Date(b.planStartedAt).getTime() : 0;
      return bt - at;
    })
    .slice(0, 5);

  const formatJoinDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SY" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const typeBreakdown =
    totalBusinesses > 0
      ? [
          {
            id: "restaurants",
            name: t.agent.referredRestaurants,
            value: restaurantCount,
            percentage: Math.round((restaurantCount / totalBusinesses) * 100),
          },
          {
            id: "stores",
            name: t.agent.referredStores,
            value: storeCount,
            percentage: Math.round((storeCount / totalBusinesses) * 100),
          },
        ].filter((entry) => entry.value > 0)
      : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.agent.referredRestaurants}
          value={String(restaurantCount)}
          icon={UtensilsCrossed}
          accent="berry"
        />
        <StatCard
          label={t.agent.referredStores}
          value={String(storeCount)}
          icon={ShoppingBag}
          accent="info"
        />
        <StatCard
          label={t.agent.discountPercentLabel}
          value={`%${discountPercent}`}
          icon={Percent}
          accent="success"
        />
        <StatCard
          label={t.agent.amountOwed}
          value={owedLabel}
          icon={Wallet}
          accent="zest"
        />
      </div>

      {renewals.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {renewals.map((n) => (
            <a
              key={n.id}
              href={n.href}
              className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:bg-accent"
            >
              <span
                className={
                  n.kind === "expired"
                    ? "flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                    : "flex size-9 shrink-0 items-center justify-center rounded-full bg-zest-soft text-zest-soft-foreground"
                }
              >
                {n.kind === "expired" ? (
                  <AlertTriangle className="size-4.5" />
                ) : (
                  <CalendarClock className="size-4.5" />
                )}
              </span>
              <p className="pt-1.5 text-sm font-semibold">
                {fmt(
                  n.kind === "expired"
                    ? t.notifications.expiredNotice
                    : t.notifications.expiringSoon,
                  { name: n.subjectName[lang], days: String(n.days ?? 0) },
                )}
              </p>
            </a>
          ))}
        </div>
      )}

      <QuickAccess title={t.agent.quickAccess} items={quickAccess} />

      {/* referral code */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-berry-soft/30 p-5 dark:bg-berry-soft/20">
        <div>
          <h2 className="font-heading font-bold">{t.agent.referralCodeLabel}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t.agent.referralBody}
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <code
            className="flex-1 truncate rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm font-bold sm:min-w-56"
            dir="ltr"
          >
            {agent.referralCode}
          </code>
          <Button onClick={() => void copyReferralCode()}>
            <Copy className="size-4" />
            {t.common.copy}
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* subscriptions by type */}
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-heading text-base font-semibold">
            {t.agent.subscriptionsByType}
          </h2>
          {typeBreakdown.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t.agent.noSubscriptionsYet}
            </p>
          ) : (
            <>
              <div className="h-56" dir="ltr">
                <ResponsiveContainer>
                  <PieChart>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Pie
                      data={typeBreakdown}
                      dataKey="percentage"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {typeBreakdown.map((entry, index) => (
                        <Cell
                          key={entry.id}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-2.5">
                {typeBreakdown.map((entry, index) => (
                  <li key={entry.id} className="flex items-center gap-3">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                    <span className="flex-1 truncate text-sm font-semibold">
                      {entry.name}
                    </span>
                    <span className="text-sm font-bold" dir="ltr">
                      {entry.percentage}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* latest subscriptions */}
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-heading text-base font-semibold">
            {t.agent.latestSubscriptionsTitle}
          </h2>
          {latestSubscriptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t.agent.noSubscriptionsYet}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border/60">
              {latestSubscriptions.map((business) => (
                <li
                  key={business.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <SafeImage
                    unoptimized
                    src={business.logoUrl}
                    alt=""
                    width={44}
                    height={44}
                    className="size-11 shrink-0 rounded-full border border-border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">
                      {business.name[lang]}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">
                      {business.planStartedAt
                        ? formatJoinDate(business.planStartedAt)
                        : "—"}
                    </p>
                  </div>
                  <Badge className="shrink-0 bg-success/10 text-success">
                    {business.planName || t.dashboard.defaultPlanName}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {dues && dues.subscriptions.length > 0 && (
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-heading text-base font-semibold">
            {t.agent.duesBreakdownTitle}
          </h2>
          <ul className="mt-3 divide-y divide-border/60">
            {dues.subscriptions.map((sub) => (
              <li key={sub.subscriptionId} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold">{sub.businessName}</p>
                  <Badge
                    className={
                      sub.paymentStatus === "collected"
                        ? "bg-success/10 text-success"
                        : "bg-zest-soft text-zest-soft-foreground"
                    }
                  >
                    {sub.paymentStatus === "collected"
                      ? t.admin.requestStatusApproved
                      : t.admin.requestStatusPending}
                  </Badge>
                </div>
                {sub.billingCycle && sub.startDate && sub.endDate && (
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {fmt(t.agent.billingCyclePeriod, {
                      cycle:
                        sub.billingCycle === "yearly"
                          ? t.agent.billingCycleYearly
                          : t.agent.billingCycleMonthly,
                      start: formatJoinDate(sub.startDate),
                      end: formatJoinDate(sub.endDate),
                    })}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                  {sub.businessAmountPaid != null && (
                    <span className="inline-flex items-baseline gap-1">
                      {t.agent.businessPaidLabel}:{" "}
                      <span className="font-bold">
                        <MoneyValue
                          amount={sub.businessAmountPaid}
                          currency={sub.currency}
                          lang={lang}
                          currencyLabel={t.common.currency}
                        />
                      </span>
                    </span>
                  )}
                  <span className="inline-flex items-baseline gap-1">
                    {t.agent.youOweLabel}:{" "}
                    <span className="font-bold text-primary">
                      <MoneyValue
                        amount={sub.amountOwed}
                        currency={sub.currency}
                        lang={lang}
                        currencyLabel={t.common.currency}
                      />
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
