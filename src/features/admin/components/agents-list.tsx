"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  useFilterParam,
  usePageParam,
  useSearchParam,
} from "@/lib/url-state";

import { Eye, Power, Store, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/shared/pagination";
import { SafeImage } from "@/components/shared/safe-image";
import { AdminFilterBar } from "@/features/admin/components/admin-filter-bar";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { RowActions, type RowAction } from "@/components/shared/row-actions";
import { AdminSelect } from "@/features/admin/components/admin-select";
import { AdminViewToggle } from "@/features/admin/components/admin-view-toggle";
import {
  deleteAdminAgent,
  getAdminAgents,
  updateAdminAgentStatus,
  type AdminPaginatedResult,
} from "@/features/admin/services";
import { fmt, useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import type { Agent, Governorate, Region } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

const ALL = "all";

/**
 * The agent network as the console sees it: who they are, where, how many
 * businesses they carry, and the controls over their account. Search/
 * filters/page live in the URL and drive a real server-paginated fetch
 * (`getAdminAgents`) — the SSR page passes the first page as `initialData`.
 */
export function AdminAgentsList({
  initialData,
  governorates,
  regions,
}: {
  initialData: AdminPaginatedResult<Agent>;
  governorates: Governorate[];
  regions: Region[];
}) {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const view = useUiStore((s) => s.adminListView);
  const setView = useUiStore((s) => s.setAdminListView);

  const [query, setQuery] = useSearchParam("q");
  const [governorateId, setGovernorateId] = useFilterParam("governorateId");
  const [regionId, setRegionId] = useFilterParam("regionId");
  const [page, setPage] = usePageParam();

  const base = `/${lang}/admin`;

  const listQuery = {
    page,
    q: query.trim() || undefined,
    governorateId: governorateId === ALL ? undefined : governorateId,
    regionId: regionId === ALL ? undefined : regionId,
  };
  const isInitial = page === 1 && !listQuery.q && !listQuery.governorateId && !listQuery.regionId;
  const { data } = useQuery({
    queryKey: queryKeys.admin.agents(listQuery),
    queryFn: () => getAdminAgents(listQuery),
    initialData: isInitial ? initialData : undefined,
  });
  const refetch = () =>
    void queryClient.invalidateQueries({ queryKey: ["admin", "agents"] });

  const hasFilters =
    query.trim() !== "" || governorateId !== ALL || regionId !== ALL;

  const clear = () => {
    setQuery("");
    setGovernorateId(ALL);
    setRegionId(ALL);
    setPage(1);
  };

  /** any filter change starts back at page 1 — a narrowed result set that
   * keeps the old page number could land past the new last page */
  const onQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const onGovernorateChange = (value: string) => {
    setGovernorateId(value);
    setRegionId(ALL);
    setPage(1);
  };
  const onRegionChange = (value: string) => {
    setRegionId(value);
    setPage(1);
  };

  const regionChoices = useMemo(
    () =>
      regions.filter(
        (r) => governorateId === ALL || r.governorateId === governorateId,
      ),
    [regions, governorateId],
  );

  const rows = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const total = data?.meta.total ?? 0;

  const [pendingDelete, setPendingDelete] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const agent = pendingDelete;
    setIsDeleting(true);
    try {
      const result = await deleteAdminAgent(agent.id);
      refetch();
      toast.success(result?.message ?? t.admin.accountDeleted);
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setIsDeleting(false);
    }
  };

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
      refetch();
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
    {
      label: t.admin.deleteAccount,
      icon: Trash2,
      onSelect: () => setPendingDelete(agent),
      danger: true,
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
        count={total}
        action={<AdminViewToggle view={view} onChange={setView} />}
      />

      <AdminFilterBar
        query={query}
        onQueryChange={onQueryChange}
        placeholder={t.agentsPage.searchPlaceholder}
        hasFilters={hasFilters}
        onClear={clear}
      >
        <AdminSelect
          value={governorateId}
          onChange={onGovernorateChange}
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
          onChange={onRegionChange}
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
        {total}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          {t.admin.noResults}
        </p>
      ) : view === "grid" ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((agent) => (
            <li
              key={agent.id}
              className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-colors duration-200 hover:border-primary/35"
            >
              <SafeImage
                unoptimized
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
          {rows.map((agent) => (
            <li
              key={agent.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5"
            >
              <SafeImage
                unoptimized
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

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && !isDeleting && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {fmt(t.admin.confirmDeleteTitle, {
                name: pendingDelete?.name[lang] ?? "",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {fmt(t.admin.confirmDeleteBody, {
                name: pendingDelete?.name[lang] ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => setPendingDelete(null)}
            >
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={isDeleting}
              onClick={() => void confirmDelete()}
            >
              {t.admin.deleteAccount}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
