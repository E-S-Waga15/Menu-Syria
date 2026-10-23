"use client";

import { SafeImage } from "@/components/shared/safe-image";
import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  LayoutGrid,
  List,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { daysUntil } from "@/features/notifications/services";
import { fmt, useI18n } from "@/i18n/client";
import type { Business } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

/**
 * The agent's book of business: everyone signed up through them, with the one
 * number that decides what they do next — how long the subscription has left.
 *
 * Sorted by urgency, not alphabetically. An agent opens this to find who needs
 * chasing, so what expires soonest belongs at the top, in either layout.
 *
 * Cards are the default: the agent is scanning faces and names to recognise a
 * client. Rows stay one keystroke away for when the list is long enough that
 * density beats recognition.
 */
export function SubscribedBusinesses({
  businesses,
  kind,
}: {
  businesses: Business[];
  kind: "restaurant" | "store";
}) {
  const { t, lang } = useI18n();
  const view = useUiStore((s) => s.agentListView);
  const setView = useUiStore((s) => s.setAgentListView);

  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const base = `/${lang}/agent`;
  const isRestaurant = kind === "restaurant";

  const rows = [...businesses]
    .map((business) => ({ business, days: daysUntil(business.planExpiresAt) }))
    .sort((a, b) => a.days - b.days);

  /** the same status line in both layouts, so they cannot drift */
  const expiryLine = (days: number) => {
    const expired = days < 0;
    const soon = !expired && days <= 30;
    return (
      <p
        className={cn(
          "flex items-center gap-1.5 text-xs font-semibold",
          expired
            ? "text-destructive"
            : soon
              ? "text-zest-soft-foreground"
              : "text-muted-foreground",
        )}
      >
        <CalendarClock className="size-3.5 shrink-0" />
        {expired
          ? fmt(t.agent.daysOverdue, { days: Math.abs(days) })
          : fmt(t.agent.daysLeft, { days })}
      </p>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl font-bold">
          {isRestaurant ? t.agent.myRestaurants : t.agent.myStores}
          <span className="ms-2 rounded-full bg-surface-container px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
            {businesses.length}
          </span>
        </h1>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-border/60 p-0.5">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label={t.dashboard.viewGrid}
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label={t.dashboard.viewList}
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <List className="size-4" />
            </Button>
          </div>

          <Button
            render={
              <Link
                href={`${base}/register/${isRestaurant ? "restaurant" : "store"}`}
              />
            }
          >
            <Plus className="size-4" />
            {isRestaurant ? t.agent.addRestaurant : t.agent.addStore}
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          {isRestaurant ? t.agent.noRestaurants : t.agent.noStores}
        </p>
      ) : view === "grid" ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map(({ business, days }) => (
            <li key={business.id}>
              <Link
                href={`${base}/subscriptions/${business.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors duration-200 hover:border-primary/35"
              >
                <div className="relative aspect-[16/9]">
                  <SafeImage
                    // only the logo fallback is exempt — a real cover
                    // photo still goes through the optimizer
                    unoptimized={!business.coverImages[0]}
                    src={business.coverImages[0] ?? business.logoUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                  />
                  {/* the logo overlaps the cover, the way the storefront shows it */}
                  <SafeImage
                    unoptimized
                    src={business.logoUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="absolute -bottom-5 start-3 size-12 rounded-xl border-2 border-card object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-3 pt-7">
                  <p className="truncate text-sm font-bold group-hover:text-primary">
                    {business.name[lang]}
                  </p>
                  {expiryLine(days)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ business, days }) => (
            <li key={business.id}>
              <Link
                href={`${base}/subscriptions/${business.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 transition-colors duration-200 hover:border-primary/35"
              >
                <SafeImage
                  unoptimized
                  src={business.logoUrl}
                  alt=""
                  width={56}
                  height={56}
                  className="size-14 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {business.name[lang]}
                  </p>
                  <div className="mt-1">{expiryLine(days)}</div>
                </div>
                <Arrow className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
