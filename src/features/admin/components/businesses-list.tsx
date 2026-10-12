"use client";

import { SafeImage } from "@/components/shared/safe-image";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  CalendarClock,
  ExternalLink,
  Eye,
  MapPin,
  Power,
  RefreshCw,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { AdminFilterBar } from "@/features/admin/components/admin-filter-bar";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { RowActions, type RowAction } from "@/components/shared/row-actions";
import { AdminSelect } from "@/features/admin/components/admin-select";
import { AdminViewToggle } from "@/features/admin/components/admin-view-toggle";
import { updateAdminBusinessStatus } from "@/features/admin/services";
import { daysUntil } from "@/features/notifications/services";
import { fmt, useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import type { Business, Governorate, Region } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

const ALL = "all";

/**
 * Restaurants and stores share this list: the console asks the same things of
 * both — where are they, is the subscription alive, open it — so the page is
 * parameterised by `kind` rather than forked into two near-identical files.
 */
export function AdminBusinessesList({
  businesses,
  governorates,
  regions,
  kind,
}: {
  businesses: Business[];
  governorates: Governorate[];
  regions: Region[];
  kind: "restaurant" | "store";
}) {
  const { t, lang } = useI18n();
  const [businessRows, setBusinessRows] = useState(businesses);
  const view = useUiStore((s) => s.adminListView);
  const setView = useUiStore((s) => s.setAdminListView);

  const [query, setQuery] = useState("");
  const [governorateId, setGovernorateId] = useState(ALL);
  const [regionId, setRegionId] = useState(ALL);

  const base = `/${lang}/admin`;
  const adminBusinessBase = kind === "restaurant" ? "restaurants" : "stores";

  const hasFilters =
    query.trim() !== "" || governorateId !== ALL || regionId !== ALL;

  const clear = () => {
    setQuery("");
    setGovernorateId(ALL);
    setRegionId(ALL);
  };

  // regions narrow to the picked governorate
  const regionChoices = useMemo(
    () =>
      regions.filter(
        (r) => governorateId === ALL || r.governorateId === governorateId,
      ),
    [regions, governorateId],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return businessRows
      .map((business) => ({
        business,
        days: daysUntil(business.planExpiresAt),
      }))
      .filter(({ business }) => {
        if (governorateId !== ALL && business.governorateId !== governorateId)
          return false;
        if (regionId !== ALL && business.regionId !== regionId) return false;
        if (
          q &&
          !business.name.ar.toLowerCase().includes(q) &&
          !business.name.en.toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .sort((a, b) => a.days - b.days);
  }, [businessRows, query, governorateId, regionId]);

  const governorateName = (id: string) =>
    governorates.find((g) => g.id === id)?.name[lang] ?? "";

  const toggleAccount = async (business: Business) => {
    const nextStatus = business.status === "active" ? "inactive" : "active";
    try {
      const result = await updateAdminBusinessStatus(business.id, nextStatus);
      setBusinessRows((current) =>
        current.map((row) =>
          row.id === business.id ? { ...row, status: nextStatus } : row,
        ),
      );
      toast.success(
        result?.message ??
          (nextStatus === "active"
            ? t.admin.accountEnabled
            : t.admin.accountDisabled),
      );
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    }
  };

  const actionsFor = (business: Business): RowAction[] => [
    {
      label: t.admin.viewProfile,
      icon: Eye,
      render: <Link href={`${base}/${adminBusinessBase}/${business.id}`} />,
    },
    {
      label: t.admin.openStorefront,
      icon: ExternalLink,
      render: (
        <Link
          href={`/${lang}/${business.slug}/menu`}
          target="_blank"
        />
      ),
    },
    {
      label: t.admin.renewSubscription,
      icon: RefreshCw,
      onSelect: () => toast.success(t.admin.renewDone),
    },
    {
      label: t.admin.changePlan,
      icon: Wallet,
      render: <Link href={`${base}/${adminBusinessBase}/${business.id}`} />,
    },
    {
      label:
        business.status === "active"
          ? t.admin.disableAccount
          : t.admin.enableAccount,
      icon: Power,
      onSelect: () => void toggleAccount(business),
      danger: business.status === "active",
    },
  ];

  const expiry = (days: number) => {
    const expired = days < 0;
    const soon = !expired && days <= 30;
    return (
      <span
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
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={kind === "restaurant" ? t.admin.restaurants : t.admin.stores}
        count={businesses.length}
        action={<AdminViewToggle view={view} onChange={setView} />}
      />

      <AdminFilterBar
        query={query}
        onQueryChange={setQuery}
        placeholder={t.admin.searchBusinesses}
        hasFilters={hasFilters}
        onClear={clear}
      >
        <AdminSelect
          value={governorateId}
          onChange={(value) => {
            setGovernorateId(value);
            setRegionId(ALL);
          }}
          label={t.admin.filterByGovernorate}
          items={{
            [ALL]: t.agentsPage.allGovernorates,
            ...Object.fromEntries(
              governorates.map((g) => [g.id, g.name[lang]]),
            ),
          }}
        />
        <AdminSelect
          value={regionId}
          onChange={setRegionId}
          label={t.admin.filterByRegion}
          items={{
            [ALL]: t.admin.allRegions,
            ...Object.fromEntries(
              regionChoices.map((r) => [r.id, r.name[lang]]),
            ),
          }}
        />
      </AdminFilterBar>

      <p
        className="text-sm font-semibold text-muted-foreground"
        aria-live="polite"
      >
        {rows.length}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          {t.admin.noResults}
        </p>
      ) : view === "grid" ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map(({ business, days }) => (
            <li
              key={business.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors duration-200 hover:border-primary/35"
            >
              {/* a fixed band rather than a 16/9 ratio: at four columns the
                  ratio grew the card with the viewport, and the console is a
                  directory to scan, not a gallery to browse */}
              <div className="relative h-28">
                <Link
                  href={`${base}/${adminBusinessBase}/${business.id}`}
                  className="absolute inset-0"
                  aria-label={business.name[lang]}
                >
                  <SafeImage
                    src={business.coverImages[0] ?? business.logoUrl}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="object-cover"
                  />
                </Link>

                {/* on the photo, not under it: the menu is a per-card control
                    and the corner is where a card's own affordances live. Glass
                    rather than solid so it sits on any cover without becoming a
                    second focal point. */}
                <div className="absolute end-2 top-2">
                  <RowActions
                    actions={actionsFor(business)}
                    triggerClassName="size-7 bg-white/80 text-foreground backdrop-blur hover:bg-white dark:bg-black/55 dark:text-white dark:hover:bg-black/75"
                  />
                </div>
              </div>

              {/* the mark sits in the content row rather than absolutely on the
                  cover, so the name can sit beside it instead of below — which
                  is what keeps the white half of the card short. -mt-1 lifts
                  just its top edge over the photo. */}
              <div className="flex flex-1 items-start gap-2 px-2.5 pt-1.5 pb-2.5">
                <SafeImage
                  src={business.logoUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="relative -mt-5 size-10 shrink-0 rounded-lg border-2 border-card object-cover"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`${base}/${adminBusinessBase}/${business.id}`}
                    className="block truncate text-sm font-bold group-hover:text-primary"
                  >
                    {business.name[lang]}
                  </Link>
                  {/* both halves carry an icon, so the pair reads as one line
                      of metadata rather than a label and a stray badge */}
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex min-w-0 items-center gap-1">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">
                        {governorateName(business.governorateId)}
                      </span>
                    </span>
                    <span aria-hidden className="text-border">
                      •
                    </span>
                    {expiry(days)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2.5">
          {rows.map(({ business, days }) => (
            <li
              key={business.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5"
            >
              <SafeImage
                src={business.logoUrl}
                alt=""
                width={48}
                height={48}
                className="size-12 shrink-0 rounded-xl object-cover"
              />

              <div className="min-w-0 flex-1">
                <Link
                  href={`${base}/${adminBusinessBase}/${business.id}`}
                  className="block truncate text-sm font-bold hover:text-primary"
                >
                  {business.name[lang]}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {governorateName(business.governorateId)}
                </p>
              </div>

              <div className="shrink-0">{expiry(days)}</div>

              <Badge
                className={cn(
                  "shrink-0",
                  days < 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-success/10 text-success",
                )}
              >
                {days < 0 ? t.admin.statusExpired : t.admin.statusActive}
              </Badge>

              <RowActions actions={actionsFor(business)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
