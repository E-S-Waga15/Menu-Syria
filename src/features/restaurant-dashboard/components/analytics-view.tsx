"use client";

import Image from "next/image";
import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  CalendarDays,
  Crown,
  Eye,
  Flame,
  Radio,
  Receipt,
  ShoppingCart,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { StatCard } from "@/features/restaurant-dashboard/components/stat-card";
import {
  getBestSelling,
  getBusinessStatistics,
  getCategoriesAnalytics,
  getLiveActivity,
  getPeakTimes,
} from "@/features/restaurant-dashboard/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/fmt";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
  fontWeight: 600,
};

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const DAY_WINDOWS = [7, 30, 90] as const;

/**
 * Real `/statistics/*` data, not the chart-friendly but entirely invented
 * shape `getMyAnalytics` used to fill this page with — the backend has no
 * day-by-day or month-by-month series, only the aggregates and breakdowns
 * each endpoint below actually provides.
 */
export function AnalyticsView() {
  const { t, lang } = useI18n();
  const [days, setDays] = useState<(typeof DAY_WINDOWS)[number]>(7);

  const lockedRetry = (count: number, error: unknown) =>
    !(error instanceof ApiError && error.status === 403) && count < 2;

  const businessQuery = useQuery({
    queryKey: queryKeys.statistics.business,
    queryFn: () => getBusinessStatistics(),
    retry: lockedRetry,
  });
  const bestSellingQuery = useQuery({
    queryKey: queryKeys.statistics.bestSelling(days),
    queryFn: () => getBestSelling(days),
    retry: lockedRetry,
  });
  const categoriesQuery = useQuery({
    queryKey: queryKeys.statistics.categories,
    queryFn: getCategoriesAnalytics,
    retry: lockedRetry,
  });
  const peakTimesQuery = useQuery({
    queryKey: queryKeys.statistics.peakTimes,
    queryFn: getPeakTimes,
    retry: lockedRetry,
  });
  const liveQuery = useQuery({
    queryKey: queryKeys.statistics.liveActivity,
    queryFn: getLiveActivity,
    retry: lockedRetry,
    // a live count worth the name has to keep refetching on its own
    refetchInterval: 60_000,
  });

  const locked =
    businessQuery.error instanceof ApiError && businessQuery.error.status === 403;

  if (businessQuery.isPending) return <LoadingSpinner />;

  if (locked) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-berry-soft/20 p-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Crown className="size-6" />
        </span>
        <p className="font-heading text-lg font-bold">
          {t.dashboard.statisticsLocked}
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {t.dashboard.upgradeForStatistics}
        </p>
      </div>
    );
  }

  const business = businessQuery.data;
  const bestSelling = bestSellingQuery.data ?? [];
  const categories = categoriesQuery.data;
  const peakTimes = peakTimesQuery.data;
  const live = liveQuery.data;

  const dayWindowLabel: Record<(typeof DAY_WINDOWS)[number], string> = {
    7: t.dashboard.last7Days,
    30: t.dashboard.last30Days,
    90: t.dashboard.last90Days,
  };

  return (
    <div className="space-y-6">
      {/* live activity — small and quiet, it's explicitly approximate */}
      {live && live.activeCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm font-semibold text-success w-fit">
          <Radio className="size-4 animate-pulse" />
          {fmt(t.dashboard.liveActivityCount, { count: live.activeCount })}
          <span className="text-xs font-normal text-success/70">
            ({fmt(t.dashboard.liveActivityApprox, { minutes: live.windowMinutes })})
          </span>
        </div>
      )}

      {business && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label={t.dashboard.visitCount}
            value={business.visitCount.toLocaleString("en-US")}
            icon={Eye}
            accent="neutral"
          />
          <StatCard
            label={t.dashboard.orderCount}
            value={business.orderCount.toLocaleString("en-US")}
            icon={Receipt}
          />
          <StatCard
            label={t.dashboard.totalRevenue}
            value={formatPrice(business.revenue, t.common.currency)}
            icon={Wallet}
            accent="zest"
            highlight
          />
        </div>
      )}

      <Card
        title={t.dashboard.topItemsTitle}
        action={
          <div className="flex gap-1 rounded-lg border border-border/60 p-0.5">
            {DAY_WINDOWS.map((window) => (
              <button
                key={window}
                type="button"
                onClick={() => setDays(window)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                  days === window
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {dayWindowLabel[window]}
              </button>
            ))}
          </div>
        }
      >
        {bestSelling.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t.dashboard.noBestSellingYet}
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {bestSelling.map((item, index) => (
              <li
                key={item.itemId}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-container text-xs font-bold text-muted-foreground">
                  {index + 1}
                </span>
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    width={44}
                    height={44}
                    className="size-11 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-berry-soft text-sm font-bold text-berry-soft-foreground">
                    {item.name.charAt(0)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
                    <span>
                      {t.dashboard.quantitySold}: {item.quantitySold}
                    </span>
                    <span>
                      {t.dashboard.cartAddCount}: {item.cartAddCount}
                    </span>
                  </p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="text-sm font-bold text-primary" dir="ltr">
                    {formatPrice(item.revenue, t.common.currency)}
                  </p>
                  <Badge
                    className={cn(
                      "mt-1",
                      item.isAvailable
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.isAvailable
                      ? t.common.available
                      : t.common.unavailable}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title={t.dashboard.categoriesTab}>
          {!categories || categories.breakdown.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t.dashboard.noCategoriesDataYet}
            </p>
          ) : (
            <>
              <div className="h-56" dir="ltr">
                <ResponsiveContainer>
                  <PieChart>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Pie
                      data={categories.breakdown}
                      dataKey="percentage"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {categories.breakdown.map((entry, index) => (
                        <Cell
                          key={entry.categoryId}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-2.5">
                {categories.breakdown.map((entry, index) => (
                  <li key={entry.categoryId} className="flex items-center gap-3">
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
              {(categories.mostVisited || categories.leastActive) && (
                <div className="mt-4 grid gap-2.5 border-t border-border/60 pt-4 sm:grid-cols-2">
                  {categories.mostVisited && (
                    <p className="text-xs text-muted-foreground">
                      {t.dashboard.mostVisitedCategory}:{" "}
                      <span className="font-semibold text-foreground">
                        {categories.mostVisited.name}
                      </span>
                    </p>
                  )}
                  {categories.leastActive && (
                    <p className="text-xs text-muted-foreground">
                      {t.dashboard.leastActiveCategory}:{" "}
                      <span className="font-semibold text-foreground">
                        {categories.leastActive.name}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </Card>

        <Card title={t.dashboard.peakTimesTab}>
          {!peakTimes ||
          (peakTimes.topHourSlots.length === 0 &&
            !peakTimes.bestDayOfWeek &&
            !peakTimes.bestMonth) ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t.dashboard.noPeakTimesYet}
            </p>
          ) : (
            <div className="space-y-5">
              {peakTimes.topHourSlots.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {t.dashboard.topHours}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {peakTimes.topHourSlots.map((slot) => (
                      <li
                        key={slot.hourRange}
                        className="flex items-center justify-between rounded-xl bg-surface-container-low px-3.5 py-2.5"
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold" dir="ltr">
                          <Flame className="size-4 text-zest" />
                          {slot.hourRange}
                        </span>
                        <span className="text-sm font-bold" dir="ltr">
                          {slot.cartAddCount}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {peakTimes.bestDayOfWeek && (
                  <div className="rounded-xl border border-border/60 p-3.5">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5" />
                      {t.dashboard.bestDay}
                    </p>
                    <p className="mt-1 font-heading text-base font-bold">
                      {peakTimes.bestDayOfWeek.dayAr}
                    </p>
                  </div>
                )}
                {peakTimes.bestMonth && (
                  <div className="rounded-xl border border-border/60 p-3.5">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ShoppingCart className="size-3.5" />
                      {t.dashboard.bestMonth}
                    </p>
                    <p className="mt-1 font-heading text-base font-bold">
                      {peakTimes.bestMonth.label}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
