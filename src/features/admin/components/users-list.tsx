"use client";

import { useMemo, useState } from "react";

import { CalendarDays, Eye, ShieldBan, ShieldCheck, UserRound } from "lucide-react";

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
import { ADMIN_PAGE_SIZE, Pagination } from "@/components/shared/pagination";
import { RowActions, type RowAction } from "@/components/shared/row-actions";
import { AdminFilterBar } from "@/features/admin/components/admin-filter-bar";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminSelect } from "@/features/admin/components/admin-select";
import { updateAdminUserStatus } from "@/features/admin/services";
import { fmt, useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import type { Governorate, PlatformRole, PlatformUser } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL = "all";

/** the one pending ban/unban action, held until the confirm dialog resolves it */
interface PendingStatusChange {
  user: PlatformUser;
  nextStatus: "active" | "banned";
}

/** every account on the platform, as a grid of cards — avatar, role/status
 * badges and a "⋮" menu (view details / ban / unban), filterable by who they
 * are and their standing */
export function AdminUsersList({
  users,
  governorates,
}: {
  users: PlatformUser[];
  governorates: Governorate[];
}) {
  const { t, lang } = useI18n();

  const [userRows, setUserRows] = useState(users);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const [pendingChange, setPendingChange] = useState<PendingStatusChange | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  const roleLabel: Record<PlatformRole, string> = {
    user: t.admin.roleUser,
    owner: t.admin.roleOwner,
    agent: t.admin.roleAgent,
    waiter: t.admin.roleWaiter,
    admin: t.admin.roleAdmin,
  };

  const hasFilters = query.trim() !== "" || role !== ALL || status !== ALL;

  const clear = () => {
    setQuery("");
    setRole(ALL);
    setStatus(ALL);
    setPage(1);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return userRows.filter((user) => {
      if (role !== ALL && user.role !== role) return false;
      if (status !== ALL && user.status !== status) return false;
      if (
        q &&
        !user.name.toLowerCase().includes(q) &&
        !user.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))
      )
        return false;
      return true;
    });
  }, [userRows, query, role, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const pageRows = filtered.slice(
    (page - 1) * ADMIN_PAGE_SIZE,
    page * ADMIN_PAGE_SIZE,
  );
  // reset to page 1 when a filter narrows the result set — compared during
  // render (not an effect), the same re-seed-on-change pattern used
  // elsewhere for this exact kind of derived reset
  const filterKey = `${query}|${role}|${status}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

  const governorateName = (id?: string) =>
    governorates.find((g) => g.id === id)?.name[lang] ?? "";

  const dateFormat = new Intl.DateTimeFormat(
    lang === "ar" ? "ar-SY" : "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );

  const applyStatusChange = async () => {
    if (!pendingChange) return;
    const { user, nextStatus } = pendingChange;
    setIsSaving(true);
    try {
      const result = await updateAdminUserStatus(user.id, nextStatus);
      setUserRows((current) =>
        current.map((row) =>
          row.id === user.id ? { ...row, status: nextStatus } : row,
        ),
      );
      toast.success(
        result?.message ??
          (nextStatus === "banned" ? t.admin.userBanned : t.admin.userUnbanned),
      );
      setPendingChange(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  // No per-user admin detail route exists yet (only the users list page
  // itself) — a clearly-marked placeholder rather than a link to a page that
  // isn't there.
  const viewDetails = () => toast(t.common.comingSoon);

  const actionsFor = (user: PlatformUser): RowAction[] => [
    { label: t.admin.viewUserDetails, icon: Eye, onSelect: viewDetails },
    user.status === "active"
      ? {
          label: t.admin.banUser,
          icon: ShieldBan,
          onSelect: () =>
            setPendingChange({ user, nextStatus: "banned" }),
          danger: true,
        }
      : {
          label: t.admin.unbanUser,
          icon: ShieldCheck,
          onSelect: () =>
            setPendingChange({ user, nextStatus: "active" }),
        },
  ];

  return (
    <div className="space-y-5">
      <AdminPageHeader title={t.admin.users} count={users.length} />

      <AdminFilterBar
        query={query}
        onQueryChange={setQuery}
        placeholder={t.admin.searchUsers}
        hasFilters={hasFilters}
        onClear={clear}
      >
        <AdminSelect
          value={role}
          onChange={setRole}
          label={t.admin.allRoles}
          items={{ [ALL]: t.admin.allRoles, ...roleLabel }}
        />
        <AdminSelect
          value={status}
          onChange={setStatus}
          label={t.admin.allStatuses}
          items={{
            [ALL]: t.admin.allStatuses,
            active: t.admin.statusActive,
            banned: t.admin.statusBanned,
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
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageRows.map((user) => (
            <li
              key={user.id}
              className={cn(
                "rounded-2xl border border-border/60 bg-card p-4 transition-colors duration-200 hover:border-primary/35",
                user.status === "banned" && "opacity-80",
              )}
            >
              {/* avatar + kebab, top row */}
              <div className="flex items-start gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#ffd9de] font-heading text-base font-bold text-[#90003b]">
                  {user.name.trim().charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{user.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">
                    {user.phone}
                  </p>
                </div>
                <RowActions actions={actionsFor(user)} />
              </div>

              {/* role + status badges */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge className="bg-surface-container text-foreground/70">
                  <UserRound className="me-1 size-3" />
                  {roleLabel[user.role]}
                </Badge>
                {user.governorateId && (
                  <Badge className="bg-surface-container text-foreground/70">
                    {governorateName(user.governorateId)}
                  </Badge>
                )}
                <Badge
                  className={cn(
                    user.status === "active"
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {user.status === "active"
                    ? t.admin.statusActive
                    : t.admin.statusBanned}
                </Badge>
              </div>

              {/* bordered footer row */}
              <div className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5 text-primary/70" />
                {t.admin.joinedOn} {dateFormat.format(new Date(user.joinedAt))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <AlertDialog
        open={pendingChange !== null}
        onOpenChange={(open) => !open && setPendingChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingChange?.nextStatus === "banned"
                ? t.admin.confirmBanUserTitle
                : t.admin.confirmUnbanUserTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {fmt(
                pendingChange?.nextStatus === "banned"
                  ? t.admin.confirmBanUserBody
                  : t.admin.confirmUnbanUserBody,
                { name: pendingChange?.user.name ?? "" },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingChange(null)}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={pendingChange?.nextStatus === "banned" ? "destructive" : "default"}
              loading={isSaving}
              onClick={() => void applyStatusChange()}
            >
              {pendingChange?.nextStatus === "banned"
                ? t.admin.banUser
                : t.admin.unbanUser}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
