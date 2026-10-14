"use client";

import { SafeImage } from "@/components/shared/safe-image";
import Link from "next/link";

import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Handshake,
  Settings2,
  ShoppingBag,
  Store,
  TrendingUp,
  UsersRound,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

import { QuickAccess } from "@/components/shared/quick-access";
import { StatCard } from "@/features/restaurant-dashboard/components/stat-card";
import { daysUntil } from "@/features/notifications/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
import type { AdminStats } from "@/features/admin/services";
import type { Business } from "@/lib/types";
import { cn } from "@/lib/utils";

/** how many lapsing accounts the overview shows before deferring to the list */
const ATTENTION_LIMIT = 5;

/**
 * The console's landing page.
 *
 * It answers two questions and then gets out of the way: how is the platform
 * doing, and what needs doing today. It deliberately does not repeat the
 * directories — each of those is a page of its own now, so this links into
 * them rather than embedding a second, thinner copy that would drift.
 */
export function AdminControlCenter({
  stats,
  businesses,
}: {
  stats: AdminStats;
  businesses: { business: Business; kind: "restaurant" | "store" }[];
}) {
  const { t, lang } = useI18n();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const base = `/${lang}/admin`;

  // soonest first, expired included — this is the day's work queue
  const attention = businesses
    .map((row) => ({ ...row, days: daysUntil(row.business.planExpiresAt) }))
    .filter((row) => row.days <= 30)
    .sort((a, b) => a.days - b.days);

  const sections = [
    {
      href: `${base}/users`,
      label: t.admin.users,
      hint: t.admin.usersHint,
      icon: UsersRound,
    },
    {
      href: `${base}/restaurants`,
      label: t.admin.restaurants,
      hint: t.admin.restaurantsHint,
      icon: UtensilsCrossed,
    },
    {
      href: `${base}/stores`,
      label: t.admin.stores,
      hint: t.admin.storesHint,
      icon: ShoppingBag,
    },
    {
      href: `${base}/agents`,
      label: t.admin.agents,
      hint: t.admin.agentsHint,
      icon: Handshake,
    },
    {
      href: `${base}/subscriptions`,
      label: t.admin.subscriptions,
      hint: t.admin.subscriptionsHint,
      icon: CreditCard,
    },
    {
      href: `${base}/plans`,
      label: t.admin.plansPage,
      hint: t.admin.plansHint,
      icon: Wallet,
    },
    {
      href: `${base}/settings`,
      label: t.admin.systemSettings,
      hint: t.admin.settingsHint,
      icon: Settings2,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label={t.admin.totalRestaurants}
          value={stats.totalRestaurants.toLocaleString("en-US")}
          icon={Store}
        />
        <StatCard
          label={t.admin.totalAgents}
          value={stats.totalAgents.toLocaleString("en-US")}
          icon={Handshake}
          accent="neutral"
        />
        <StatCard
          label={t.admin.monthlyRevenue}
          value={formatPrice(stats.monthlyRevenue, t.common.currency)}
          icon={TrendingUp}
          accent="zest"
          hint="+21%"
          highlight
        />
        <StatCard
          label={t.admin.activeSubscriptions}
          value={stats.activeSubscriptions.toLocaleString("en-US")}
          icon={CreditCard}
        />
      </div>

      <QuickAccess title={t.admin.quickAccess} items={sections} />

      <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-bold">
            {t.admin.needsAttention}
            {attention.length > 0 && (
              <span className="ms-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive tabular-nums">
                {attention.length}
              </span>
            )}
          </h2>
          <Link
            href={`${base}/subscriptions`}
            className="group/all inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-berry-bright"
          >
            {t.admin.viewAll}
            <Arrow className="size-4 transition-[translate] duration-200 ease-smooth group-hover/all:-translate-x-0.5 rtl:group-hover/all:translate-x-0.5" />
          </Link>
        </div>

        {attention.length === 0 ? (
          <p className="mt-4 flex items-center gap-2.5 rounded-xl border border-dashed border-border px-4 py-3.5 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 shrink-0 text-success" />
            {t.admin.allHealthy}
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {attention.slice(0, ATTENTION_LIMIT).map((row) => {
              const expired = row.days < 0;
              return (
                <li key={row.business.id}>
                  <Link
                    href={`${base}/${row.kind === "restaurant" ? "restaurants" : "stores"}/${row.business.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border/60 p-2.5 transition-colors hover:border-primary/35"
                  >
                    <SafeImage
                      src={row.business.logoUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0 rounded-lg object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">
                      {row.business.name[lang]}
                    </span>
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 text-xs font-semibold",
                        expired
                          ? "text-destructive"
                          : "text-zest-soft-foreground",
                      )}
                    >
                      <CalendarClock className="size-3.5" />
                      {expired
                        ? fmt(t.agent.daysOverdue, { days: Math.abs(row.days) })
                        : fmt(t.agent.daysLeft, { days: row.days })}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
