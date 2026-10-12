"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Crown,
  Eye,
  Heart,
  Percent,
  ShoppingCart,
  Wallet,
} from "lucide-react";

import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatCard } from "@/features/restaurant-dashboard/components/stat-card";
import { formatPrice } from "@/features/public-menu/lib/format";
import { getItemStatistics } from "@/features/restaurant-dashboard/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { MenuItem } from "@/lib/types";

/**
 * Per-product performance — views, cart-adds, units sold, revenue. Reads
 * `/statistics/items/:id`, which the backend does not expose yet, so a
 * missing or locked result renders an honest "not available" message rather
 * than any invented numbers.
 */
export function ItemStatsModal({
  item,
  open,
  onOpenChange,
}: {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lang } = useI18n();

  const query = useQuery({
    queryKey: queryKeys.statistics.item(item?.id ?? ""),
    queryFn: () => getItemStatistics(item!.id),
    enabled: open && !!item,
    retry: (count, error) =>
      !(error instanceof ApiError && error.status === 403) && count < 2,
  });

  const locked = query.error instanceof ApiError && query.error.status === 403;
  const stats = query.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" />
            {item ? item.name[lang] : t.dashboard.productStatsTitle}
          </DialogTitle>
        </DialogHeader>

        {query.isPending ? (
          <div className="py-8">
            <LoadingSpinner />
          </div>
        ) : locked ? (
          <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-primary/30 bg-berry-soft/20 p-8 text-center">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Crown className="size-5.5" />
            </span>
            <p className="text-sm font-bold">{t.dashboard.productStatsLocked}</p>
          </div>
        ) : !stats ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t.dashboard.productStatsUnavailable}
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-muted-foreground">
              {t.dashboard.productStatsHint}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <StatCard
                label={t.dashboard.viewCount}
                value={stats.viewCount.toLocaleString(lang === "ar" ? "ar-SY" : "en-US")}
                icon={Eye}
                accent="neutral"
              />
              <StatCard
                label={t.dashboard.cartAddCount}
                value={stats.cartAddCount.toLocaleString(lang === "ar" ? "ar-SY" : "en-US")}
                icon={ShoppingCart}
                accent="berry"
              />
              <StatCard
                label={t.dashboard.quantitySold}
                value={stats.quantitySold.toLocaleString(lang === "ar" ? "ar-SY" : "en-US")}
                icon={BarChart3}
                accent="zest"
              />
              <StatCard
                label={t.dashboard.itemRevenue}
                value={formatPrice(stats.revenue, item?.currency ?? "SYP", lang)}
                icon={Wallet}
                accent="berry"
              />
              <StatCard
                label={t.dashboard.conversionRate}
                value={`%${stats.conversionRate}`}
                icon={Percent}
                accent="neutral"
              />
              <StatCard
                label={t.dashboard.favoriteCount}
                value={stats.favoriteCount.toLocaleString(lang === "ar" ? "ar-SY" : "en-US")}
                icon={Heart}
                accent="zest"
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
