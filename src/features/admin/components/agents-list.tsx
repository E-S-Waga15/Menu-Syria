"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Eye, Power, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ADMIN_PAGE_SIZE, Pagination } from "@/components/shared/pagination";
import { SafeImage } from "@/components/shared/safe-image";
import { AdminFilterBar } from "@/features/admin/components/admin-filter-bar";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { RowActions, type RowAction } from "@/components/shared/row-actions";
import { AdminSelect } from "@/features/admin/components/admin-select";
import { AdminViewToggle } from "@/features/admin/components/admin-view-toggle";
import { updateAdminAgentStatus } from "@/features/admin/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import type { Agent, Governorate, Region } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

const ALL = "all";

/** the agent network as the console sees it: who they are, where, how many
 * businesses they carry, and the controls over their account */
export function AdminAgentsList({
  agents,
  governorates,
  regions,
}: {
  agents: Agent[];
  governorates: Governorate[];
  regions: Region[];
}) {
  const { t, lang } = useI18n();
  const view = useUiStore((s) => s.adminListView);
  const setView = useUiStore((s) => s.setAdminListView);

  const [query, setQuery] = useState("");
  const [governorateId, setGovernorateId] = useState(ALL);
  const [regionId, setRegionId] = useState(ALL);
  const [agentRows, setAgentRows] = useState(agents);
  const [page, setPage] = useState(1);

  const base = `/${lang}/admin`;

  const hasFilters =
    query.trim() !== "" || governorateId !== ALL || regionId !== ALL;

  const clear = () => {
    setQuery("");
    setGovernorateId(ALL);
    setRegionId(ALL);
  };

  const regionChoices = useMemo(
    () =>
      regions.filter(
        (r) => governorateId === ALL || r.governorateId === governorateId,
      ),
    [regions, governorateId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agentRows.filter((agent) => {
      if (governorateId !== ALL && agent.governorateId !== governorateId)
        return false;
      if (regionId !== ALL && !agent.regionIds.includes(regionId)) return false;
      if (
        q &&
        !agent.name.ar.toLowerCase().includes(q) &&
        !agent.name.en.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [agentRows, query, governorateId, regionId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const pageRows = filtered.slice(
    (page - 1) * ADMIN_PAGE_SIZE,
    page * ADMIN_PAGE_SIZE,
  );
  // reset to page 1 when a filter narrows the result set — compared during
  // render (not an effect), the same re-seed-on-change pattern used
  // elsewhere for this exact kind of derived reset
  const filterKey = `${query}|${governorateId}|${regionId}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const placeOf = (agent: Agent) =>
    [
      governorates.find((g) => g.id === agent.governorateId)?.name[lang],
      agent.regionIds
        .map((id) => regions.find((r) => r.id === id)?.name[lang])
        .filter(Boolean)
        .join(lang === "ar" ? " و" : " & "),
    ]
      .filter(Boolean)
      .join(lang === "ar" ? "، " : ", ");

  const toggleAccount = async (agent: Agent) => {
    const nextStatus = agent.status === "active" ? "inactive" : "active";
    try {
      const result = await updateAdminAgentStatus(agent.id, nextStatus);
      setAgentRows((current) =>
        current.map((row) =>
          row.id === agent.id ? { ...row, status: nextStatus } : row,
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

  const actionsFor = (agent: Agent): RowAction[] => [
    {
      label: t.admin.viewProfile,
      icon: Eye,
      render: <Link href={`${base}/agents/${agent.id}`} />,
    },
    {
      label:
        agent.status === "active"
          ? t.admin.disableAccount
          : t.admin.enableAccount,
      icon: Power,
      onSelect: () => void toggleAccount(agent),
      danger: agent.status === "active",
    },
  ];

  const projects = (agent: Agent) => (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Store className="size-3.5 shrink-0" />
      {agent.restaurantsCount} {t.home.agentRestaurantsCount}
    </p>
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t.admin.agents}
        count={agents.length}
        action={<AdminViewToggle view={view} onChange={setView} />}
      />

      <AdminFilterBar
        query={query}
        onQueryChange={setQuery}
        placeholder={t.agentsPage.searchPlaceholder}
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
        {filtered.length}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          {t.admin.noResults}
        </p>
      ) : view === "grid" ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pageRows.map((agent) => (
            <li
              key={agent.id}
              className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-colors duration-200 hover:border-primary/35"
            >
              <SafeImage
                src={agent.photoUrl}
                alt=""
                width={56}
                height={56}
                className="size-14 shrink-0 rounded-full border-2 border-berry-soft object-cover"
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`${base}/agents/${agent.id}`}
                  className="block truncate text-sm font-bold group-hover:text-primary"
                >
                  {agent.name[lang]}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {placeOf(agent)}
                </p>
                <div className="mt-1.5">{projects(agent)}</div>
                {agent.status !== "active" && (
                  <Badge className="mt-2 bg-destructive/10 text-destructive">
                    {t.admin.statusBanned}
                  </Badge>
                )}
              </div>
              <RowActions actions={actionsFor(agent)} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2.5">
          {pageRows.map((agent) => (
            <li
              key={agent.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5"
            >
              <SafeImage
                src={agent.photoUrl}
                alt=""
                width={48}
                height={48}
                className="size-12 shrink-0 rounded-full border-2 border-berry-soft object-cover"
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`${base}/agents/${agent.id}`}
                  className="block truncate text-sm font-bold hover:text-primary"
                >
                  {agent.name[lang]}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {placeOf(agent)}
                </p>
              </div>
              <div className="shrink-0">{projects(agent)}</div>
              <Badge
                className={cn(
                  "shrink-0",
                  agent.status !== "active"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-success/10 text-success",
                )}
              >
                {agent.status !== "active"
                  ? t.admin.statusBanned
                  : t.admin.statusActive}
              </Badge>
              <RowActions actions={actionsFor(agent)} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
