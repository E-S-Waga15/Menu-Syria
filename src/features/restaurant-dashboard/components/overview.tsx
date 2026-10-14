"use client";

import Image from "next/image";
import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Eye,
  Lightbulb,
  QrCode,
  ShoppingCart,
  Settings,
  ShoppingBag,
  Tag,
  UtensilsCrossed,
} from "lucide-react";

import {
  QuickAccess,
  type QuickAccessItem,
} from "@/components/shared/quick-access";
import { useAuthStore } from "@/features/auth/store";
import { CategoriesBreakdownCard } from "@/features/restaurant-dashboard/components/categories-breakdown-card";
import { StatCard } from "@/features/restaurant-dashboard/components/stat-card";
import {
  getBusinessInsights,
  getCategoriesAnalytics,
  getMyAnalytics,
  getMyRestaurant,
  getOverviewStats,
} from "@/features/restaurant-dashboard/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
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

  const overviewStatsQuery = useQuery({
    queryKey: queryKeys.statistics.overview,
    queryFn: getOverviewStats,
  });
  // the same source (and calculation) the settings page's subscription tab
  // already uses reliably — /statistics/overview's own daysUntilSubscriptionExpiry
  // was coming back empty, so this reads straight off the business record instead
  const restaurantQuery = useQuery({
    queryKey: queryKeys.me.business,
    queryFn: getMyRestaurant,
  });
  const insightsQuery = useQuery({
    queryKey: queryKeys.statistics.insights,
    queryFn: getBusinessInsights,
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.statistics.categories,
    queryFn: getCategoriesAnalytics,
  });

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

  const stats = overviewStatsQuery.data;
  const daysRemaining = restaurantQuery.data
    ? Math.max(
        0,
        Math.ceil(
          (new Date(restaurantQuery.data.planExpiresAt).getTime() -
            new Date().getTime()) /
            86_400_000,
        ),
      )
    : null;

  // mirrors the sidebar, minus the page the reader is already on. Orders and
  // dining tables are hidden for now — not part of this release's plan yet.
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3">
        <StatCard
          label={t.dashboard.mostAddedToCart}
          value={stats?.mostAddedToCart?.name ?? t.dashboard.noDataYet}
          icon={ShoppingCart}
          accent="berry"
          numeric={false}
        />
        <StatCard
          label={t.dashboard.mostViewedNoPurchase}
          value={stats?.mostViewedWithoutPurchase?.name ?? t.dashboard.noDataYet}
          icon={Eye}
          accent="info"
          numeric={false}
        />
        <StatCard
          label={t.dashboard.menuViews}
          value={analytics.menuViews.toLocaleString("en-US")}
          icon={Eye}
          accent="success"
        />
        <StatCard
          label={t.dashboard.subscriptionDaysLeft}
          value={daysRemaining != null ? String(daysRemaining) : "—"}
          icon={CalendarDays}
          accent="zest"
        />
      </div>

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
              <p className="pt-1.5 text-sm font-semibold">{insight.textAr}</p>
            </div>
          ))}
        </div>
      )}

      <QuickAccess title={t.dashboard.quickAccess} items={quickAccess} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <CategoriesBreakdownCard
          categories={categoriesQuery.data}
          title={t.dashboard.categoriesTab}
          action={
            <Link
              href={`${base}/analytics`}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t.common.viewAll}
            </Link>
          }
        />

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
