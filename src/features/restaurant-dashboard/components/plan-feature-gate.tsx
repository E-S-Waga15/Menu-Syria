"use client";

import type { ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";

import { Lock } from "lucide-react";

import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  AgentContactCard,
  PlatformContactCard,
} from "@/features/restaurant-dashboard/components/business-profile";
import { getMyRestaurant } from "@/features/restaurant-dashboard/services";
import { getGovernorates, getRegions } from "@/features/marketing/services";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";

/** The two plan-gated feature clusters in this dashboard today. `cart` is
 * the whole order-management suite (platform orders, kitchen screen, table
 * reservations) — all three ride on the same `orderChannels` flag, since
 * the backend has no separate boolean for each one. `statistics` is its
 * own `Business.hasStatistics` flag. */
type GatedFeature = "cart" | "statistics";

/**
 * Wraps a dashboard page's real content, showing it only once the business's
 * current plan actually includes `feature`. Locked out, it shows why plus
 * exactly who to contact to upgrade — the business's own agent if it has
 * one (`AgentContactCard`, same component the support page uses), or the
 * platform's own support channels otherwise (`PlatformContactCard`) — so
 * the asker never has to guess which applies.
 *
 * Reads `queryKeys.me.business`, the same query key the dashboard shell
 * already warms on every page — this never fires an extra network request.
 */
export function PlanFeatureGate({
  feature,
  children,
}: {
  feature: GatedFeature;
  children: ReactNode;
}) {
  const { t, lang } = useI18n();

  const { data: restaurant, isLoading } = useQuery({
    queryKey: queryKeys.me.business,
    queryFn: getMyRestaurant,
  });
  const { data: governorates } = useQuery({
    queryKey: queryKeys.governorates,
    queryFn: getGovernorates,
  });
  const { data: regions } = useQuery({
    queryKey: queryKeys.regions,
    queryFn: getRegions,
  });

  if (isLoading || !restaurant) return <LoadingSpinner />;

  const unlocked =
    feature === "cart"
      ? (restaurant.orderChannels?.includes("platform") ?? true)
      : (restaurant.hasStatistics ?? false);

  if (unlocked) return <>{children}</>;

  const title =
    feature === "cart" ? t.dashboard.ordersFeatureLocked : t.dashboard.statisticsLocked;
  const body =
    feature === "cart" ? t.dashboard.upgradeForOrders : t.dashboard.upgradeForStatistics;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Lock className="size-6" />
        </span>
        <h2 className="mt-4 font-heading text-lg font-bold">{title}</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{body}</p>
      </div>

      <p className="text-sm font-semibold text-muted-foreground">
        {t.dashboard.upgradePlanContact}
      </p>
      {restaurant.agent ? (
        <AgentContactCard
          agent={restaurant.agent}
          governorates={governorates}
          regions={regions}
          t={t}
          lang={lang}
        />
      ) : (
        <PlatformContactCard t={t} />
      )}
    </div>
  );
}
