"use client";

import Image from "next/image";

import { useQuery } from "@tanstack/react-query";
import {
  Banknote,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Crown,
  Eye,
  Lightbulb,
  QrCode,
  Receipt,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Table2,
  Tag,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";

import {
  QuickAccess,
  type QuickAccessItem,
} from "@/components/shared/quick-access";
import { useAuthStore } from "@/features/auth/store";
import { StatCard } from "@/features/restaurant-dashboard/components/stat-card";
import {
  getBusinessInsights,
  getMyAnalytics,
  getMyOrders,
  getOverviewStats,
} from "@/features/restaurant-dashboard/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

const RESTAURANT_ID = "r1";

export function DashboardOverview() {
  const { t, lang } = useI18n();
  // the same flag the shell navigates by, so the tiles and the sidebar never
  // disagree about whether this account is a restaurant or a store
  const isStore = useAuthStore(
    (s) => (s.session?.businessType ?? "restaurant") === "store",
  );
  const base = `/${lang}/dashboard`;

  const analyticsQuery = useQuery({
    queryKey: queryKeys.restaurants.analytics(RESTAURANT_ID),
    queryFn: getMyAnalytics,
  });
  const { data: analytics } = analyticsQuery;

  const { data: orders } = useQuery({
    queryKey: queryKeys.restaurants.orders(RESTAURANT_ID),
    queryFn: getMyOrders,
  });

  // both ride on the plan's `hasStatistics` gate — a 403 here means "not on
  // this plan", not a real failure, so neither query retries past it
  const overviewStatsQuery = useQuery({
    queryKey: queryKeys.statistics.overview,
    queryFn: getOverviewStats,
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 403) && count < 2,
  });
  const insightsQuery = useQuery({
    queryKey: queryKeys.statistics.insights,
    queryFn: getBusinessInsights,
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 403) && count < 2,
  });
  const statsLocked =
    overviewStatsQuery.error instanceof ApiError &&
    overviewStatsQuery.error.status === 403;

  if (analyticsQuery.isPending) {
    return <LoadingSpinner />;
  }
  if (!analytics) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">
          {t.account.loadFailed}
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
          onClick={() => void analyticsQuery.refetch()}
        >
          {t.account.retry}
        </button>
      </div>
    );
  }

  // mirrors the sidebar, minus the page the reader is already on. Dining
  // tables are restaurant-only, exactly as in the shell's nav.
  const quickAccess: QuickAccessItem[] = [
    {
      href: `${base}/menu`,
      label: isStore ? t.dashboard.myProducts : t.dashboard.myMenu,
      hint: isStore ? t.dashboard.productsHint : t.dashboard.menuHint,
      icon: isStore ? ShoppingBag : UtensilsCrossed,
    },
    {
      href: `${base}/offers`,
      label: t.offers.title,
      hint: isStore ? t.offers.hintStore : t.offers.hint,
      icon: Tag,
    },
    {
      href: `${base}/orders`,
      label: t.dashboard.orders,
      hint: t.dashboard.ordersHint,
      icon: Receipt,
    },
    ...(isStore
      ? []
      : [
          {
            href: `${base}/tables`,
            label: t.dashboard.tables,
            hint: t.dashboard.tablesHint,
            icon: Table2,
          },
        ]),
    {
      href: `${base}/branches`,
      label: t.dashboard.branches,
      hint: t.dashboard.branchesHint,
      icon: Building2,
    },
    {
      href: `${base}/analytics`,
      label: t.dashboard.analytics,
      hint: t.dashboard.analyticsHint,
      icon: ChartNoAxesCombined,
    },
    {
      href: `${base}/qr`,
      label: t.dashboard.qrCode,
      hint: isStore ? t.dashboard.qrStoreHint : t.dashboard.qrHint,
      icon: QrCode,
    },
    {
      href: `${base}/settings`,
      label: t.dashboard.settings,
      hint: isStore ? t.dashboard.settingsStoreHint : t.dashboard.settingsHint,
      icon: Settings,
    },
  ];

  const statusStyle = {
    new: "bg-berry-soft text-berry-soft-foreground",
    preparing: "bg-zest-soft text-zest-soft-foreground",
    ready: "bg-success/10 text-success",
  } as const;

  const statusLabel = {
    new: t.dashboard.newOrders,
    preparing: t.dashboard.preparing,
    ready: t.dashboard.ready,
  } as const;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label={t.dashboard.todayOrders}
          value={String(analytics.todayOrders)}
          icon={Receipt}
          accent="berry"
          badges={[{ icon: TrendingUp, text: "+12%", tone: "success" }]}
          highlight
        />
        <StatCard
          label={t.dashboard.todayRevenue}
          value={formatPrice(analytics.todayRevenue, t.common.currency)}
          icon={Banknote}
          accent="zest"
          badges={[{ icon: TrendingUp, text: "+8%", tone: "success" }]}
          highlight
        />
        <StatCard
          label={t.dashboard.menuViews}
          value={analytics.menuViews.toLocaleString("en-US")}
          icon={Eye}
          accent="info"
        />
        <StatCard
          label={t.dashboard.avgOrder}
          value={formatPrice(analytics.avgOrderValue, t.common.currency)}
          icon={TrendingUp}
          accent="success"
        />
      </div>

      {/* statistics-plan gated: a business without it sees one upgrade
          nudge instead of two empty-looking cards */}
      {statsLocked ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/30 bg-berry-soft/20 p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Crown className="size-5" />
            </span>
            <div>
              <p className="font-heading text-sm font-bold">
                {t.dashboard.statisticsLocked}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t.dashboard.upgradeForStatistics}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {(insightsQuery.data?.length ?? 0) > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {insightsQuery.data!.map((insight, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zest-soft text-zest-soft-foreground">
                    {insight.icon === "calendar" ? (
                      <CalendarDays className="size-4.5" />
                    ) : (
                      <Lightbulb className="size-4.5" />
                    )}
                  </span>
                  <p className="pt-1.5 text-sm font-semibold">
                    {insight.textAr}
                  </p>
                </div>
              ))}
            </div>
          )}

          {overviewStatsQuery.data && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                label={t.dashboard.mostAddedToCart}
                value={
                  overviewStatsQuery.data.mostAddedToCart?.name ??
                  t.dashboard.noDataYet
                }
                icon={ShoppingCart}
                accent="zest"
              />
              <StatCard
                label={t.dashboard.mostViewedNoPurchase}
                value={
                  overviewStatsQuery.data.mostViewedWithoutPurchase?.name ??
                  t.dashboard.noDataYet
                }
                icon={Eye}
                accent="neutral"
              />
              <StatCard
                label={t.dashboard.subscriptionDaysLeft}
                value={
                  overviewStatsQuery.data.daysUntilSubscriptionExpiry !== null
                    ? String(overviewStatsQuery.data.daysUntilSubscriptionExpiry)
                    : "—"
                }
                icon={CalendarDays}
              />
            </div>
          )}
        </>
      )}

      <QuickAccess title={t.dashboard.quickAccess} items={quickAccess} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* recent orders */}
        <section className="rounded-2xl border border-border/60 bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">
            {t.dashboard.orders}
          </h2>
          <ul className="mt-4 divide-y divide-border/60">
            {(orders ?? []).map((order) => (
              <li
                key={order.id}
                className="flex items-center justify-between gap-3 py-3.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold">
                    {fmt(t.dashboard.orderNumber, { number: order.number })}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {order.lines
                      .map((l) => `${l.quantity}× ${l.name[lang]}`)
                      .join("، ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold" dir="ltr">
                    {formatPrice(order.total, t.common.currency)}
                  </span>
                  <Badge className={statusStyle[order.status]}>
                    {statusLabel[order.status]}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* best seller */}
        <section className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          <div className="relative h-44">
            <Image
              src={analytics.bestSeller.imageUrl}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="object-cover"
            />
            <span className="absolute start-4 top-4 rounded-full bg-zest px-3 py-1 text-xs font-bold text-zest-foreground">
              {t.dashboard.bestSeller}
            </span>
          </div>
          <div className="p-5">
            <h3 className="font-heading text-lg font-semibold">
              {analytics.bestSeller.name[lang]}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {analytics.bestSeller.description[lang]}
            </p>
            <p className="mt-3 text-lg font-bold text-primary" dir="ltr">
              {formatPrice(analytics.bestSeller.price, t.common.currency)}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
