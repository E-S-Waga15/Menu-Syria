"use client";

import type { ReactNode } from "react";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { useI18n } from "@/i18n/client";
import type { CategoriesAnalytics } from "@/lib/types";

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

/**
 * The categories donut (views-by-category, `/statistics/categories`) —
 * shared between the dashboard overview (a quick glance, with a "view all"
 * action into the full analytics page) and the analytics page itself (the
 * full breakdown), so the chart is built once instead of forked between
 * the two places it now appears.
 */
export function CategoriesBreakdownCard({
  categories,
  title,
  action,
}: {
  categories: CategoriesAnalytics | undefined;
  title: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        {action}
      </div>

      <div className="mt-4">
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
      </div>
    </section>
  );
}
