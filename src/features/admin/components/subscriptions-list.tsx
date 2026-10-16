"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { CalendarClock, ShoppingBag, UtensilsCrossed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ADMIN_PAGE_SIZE, Pagination } from "@/components/shared/pagination";
import { AdminFilterBar } from "@/features/admin/components/admin-filter-bar";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminSelect } from "@/features/admin/components/admin-select";
import { daysUntil } from "@/features/notifications/services";
import { fmt, useI18n } from "@/i18n/client";
import type { Business } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL = "all";

interface SubscriptionRow {
  business: Business;
  kind: "restaurant" | "store";
}

/**
 * Every paying business in one place, soonest to expire first.
 *
 * The console opens this to answer which accounts are about to lapse, so that
 * count sits above the list rather than being something you scroll to find.
 */
export function AdminSubscriptionsList({ rows }: { rows: SubscriptionRow[] }) {
  const { t, lang } = useI18n();

  const [query, setQuery] = useState("");
  const [kind, setKind] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const [pageGeneral, setPageGeneral] = useState(1);

  const hasFilters = query.trim() !== "" || kind !== ALL || status !== ALL;

  const clear = () => {
    setQuery("");
    setKind(ALL);
    setStatus(ALL);
  };

  const dated = useMemo(
    () =>
      rows
        .map((row) => ({ ...row, days: daysUntil(row.business.planExpiresAt) }))
        .sort((a, b) => a.days - b.days),
    [rows],
  );

  const expiringSoon = dated.filter((r) => r.days >= 0 && r.days <= 30).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dated.filter((row) => {
      if (kind !== ALL && row.kind !== kind) return false;
      if (status === "expired" && row.days >= 0) return false;
      if (status === "active" && row.days < 0) return false;
      if (
        q &&
        !row.business.name.ar.toLowerCase().includes(q) &&
        !row.business.name.en.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [dated, query, kind, status]);

  const viaAgent = useMemo(
    () => filtered.filter((row) => row.business.agent),
    [filtered],
  );
  const general = useMemo(
    () => filtered.filter((row) => !row.business.agent),
    [filtered],
  );

  const totalPagesAgent = Math.max(1, Math.ceil(viaAgent.length / ADMIN_PAGE_SIZE));
  const pageAgentRows = viaAgent.slice(
    (page - 1) * ADMIN_PAGE_SIZE,
    page * ADMIN_PAGE_SIZE,
  );
  const totalPagesGeneral = Math.max(1, Math.ceil(general.length / ADMIN_PAGE_SIZE));
  const pageGeneralRows = general.slice(
    (pageGeneral - 1) * ADMIN_PAGE_SIZE,
    pageGeneral * ADMIN_PAGE_SIZE,
  );
  // reset to page 1 when a filter narrows the result set — compared during
  // render (not an effect), the same re-seed-on-change pattern used
  // elsewhere for this exact kind of derived reset
  const filterKey = `${query}|${kind}|${status}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
    setPageGeneral(1);
  }

  const dateFormat = new Intl.DateTimeFormat(
    lang === "ar" ? "ar-SY" : "en-GB",
    { day: "numeric", month: "short", year: "numeric" },
  );

  // the mock carries no start date for every business — inferred a year back
  // from the expiry when the real field is absent, same fallback used on the
  // business detail page
  const startOf = (business: Business) => {
    if (business.planStartedAt) return new Date(business.planStartedAt);
    const start = new Date(business.planExpiresAt);
    start.setFullYear(start.getFullYear() - 1);
    return start;
  };

  const renderRow = (row: (typeof filtered)[number]) => {
    const expired = row.days < 0;
    const Icon = row.kind === "restaurant" ? UtensilsCrossed : ShoppingBag;

    return (
      <li
        key={row.business.id}
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5"
      >
        <Image
          src={row.business.logoUrl}
          alt=""
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-xl object-cover"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">
            {row.business.name[lang]}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="size-3.5 shrink-0" />
            {row.kind === "restaurant" ? t.admin.restaurants : t.admin.stores}
            {" · "}
            {row.business.planName || t.dashboard.defaultPlanName}
          </p>
        </div>

        <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
          {dateFormat.format(startOf(row.business))}
          {" – "}
          {dateFormat.format(new Date(row.business.planExpiresAt))}
        </span>

        <Badge
          className={cn(
            "shrink-0",
            expired
              ? "bg-destructive/10 text-destructive"
              : "bg-success/10 text-success",
          )}
        >
          {expired
            ? fmt(t.agent.daysOverdue, { days: Math.abs(row.days) })
            : fmt(t.agent.daysLeft, { days: row.days })}
        </Badge>
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader title={t.admin.subscriptions} count={rows.length} />

      {expiringSoon > 0 && (
        <p className="flex items-center gap-2.5 rounded-2xl border border-border/60 border-s-2 border-s-zest bg-zest-soft/30 px-4 py-3 text-sm font-semibold text-zest-soft-foreground">
          <CalendarClock className="size-4 shrink-0" />
          {fmt(t.admin.expiringCount, { count: expiringSoon })}
        </p>
      )}

      <AdminFilterBar
        query={query}
        onQueryChange={setQuery}
        placeholder={t.admin.searchBusinesses}
        hasFilters={hasFilters}
        onClear={clear}
      >
        <AdminSelect
          value={kind}
          onChange={setKind}
          label={t.admin.filterByStatus}
          items={{
            [ALL]: t.admin.allStatuses,
            restaurant: t.admin.restaurants,
            store: t.admin.stores,
          }}
        />
        <AdminSelect
          value={status}
          onChange={setStatus}
          label={t.admin.allStatuses}
          items={{
            [ALL]: t.admin.allStatuses,
            active: t.admin.statusActive,
            expired: t.admin.statusExpired,
          }}
        />
      </AdminFilterBar>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          {t.admin.noResults}
        </p>
      ) : (
        <>
          <section className="space-y-2.5">
            <h2 className="font-heading text-sm font-bold text-muted-foreground">
              {fmt(t.admin.subscriptionsViaAgent, { count: viaAgent.length })}
            </h2>
            {viaAgent.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t.admin.noResults}
              </p>
            ) : (
              <ul className="space-y-2.5">{pageAgentRows.map(renderRow)}</ul>
            )}
            <Pagination
              page={page}
              totalPages={totalPagesAgent}
              onPageChange={setPage}
            />
          </section>

          <section className="space-y-2.5">
            <h2 className="font-heading text-sm font-bold text-muted-foreground">
              {fmt(t.admin.subscriptionsGeneral, { count: general.length })}
            </h2>
            {general.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t.admin.noResults}
              </p>
            ) : (
              <ul className="space-y-2.5">{pageGeneralRows.map(renderRow)}</ul>
            )}
            <Pagination
              page={pageGeneral}
              totalPages={totalPagesGeneral}
              onPageChange={setPageGeneral}
            />
          </section>
        </>
      )}
    </div>
  );
}
