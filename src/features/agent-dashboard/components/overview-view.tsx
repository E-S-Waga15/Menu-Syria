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
import { buildSubscriptionNotifications } from "@/features/notifications/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)"];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
  fontWeight: 600,
};

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
  const owed = dues?.totalOwedByCurrency.SYP ?? 0;

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

  // soonest-expiring first, already sorted by buildSubscriptionNotifications
  const renewals = buildSubscriptionNotifications(
    [...restaurants, ...stores],
    (business) => `${base}/subscriptions/${business.id}`,
  ).slice(0, 3);

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
          value={formatPrice(owed, t.common.currency)}
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

        {/* referral code */}
        <section className="flex flex-col justify-center rounded-2xl border border-primary/25 bg-berry-soft/30 p-5 dark:bg-berry-soft/20">
          <h2 className="font-heading font-bold">{t.agent.referralCodeLabel}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t.agent.referralBody}
          </p>
          <div className="mt-4 flex w-full items-center gap-2">
            <code
              className="flex-1 truncate rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm font-bold"
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
      </div>
    </div>
  );
}
