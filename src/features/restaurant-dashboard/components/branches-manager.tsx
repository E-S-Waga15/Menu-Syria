"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, Pencil, Phone, Plus, Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { RowActions, type RowAction } from "@/components/shared/row-actions";
import { SafeImage } from "@/components/shared/safe-image";
import { BranchDialog } from "@/features/restaurant-dashboard/components/branch-dialog";
import { useBranchMutations } from "@/features/restaurant-dashboard/hooks/use-branches";
import { useBusinessId } from "@/features/restaurant-dashboard/hooks/use-my-business";
import { getMyBranches } from "@/features/restaurant-dashboard/services";
import { getRegions } from "@/features/marketing/services";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Branch } from "@/lib/types";

/**
 * Branch CRUD for the dashboard — cards rather than rows: a branch is a
 * name, a phone and a place, and a short card reads all three at once
 * without a table's header row overhead for what is usually a short list.
 */
export function BranchesManager() {
  const { t, lang } = useI18n();
  const businessId = useBusinessId();

  const { data: branches } = useQuery({
    queryKey: queryKeys.me.branches,
    queryFn: () => getMyBranches(businessId),
    enabled: businessId !== "",
  });
  const { data: regions } = useQuery({
    queryKey: queryKeys.regions,
    queryFn: getRegions,
  });

  const mutations = useBranchMutations(businessId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState<Branch | null>(null);

  const districtName = (districtId: string) =>
    regions?.find((r) => r.id === districtId)?.name[lang] ?? "";

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditing(branch);
    setDialogOpen(true);
  };

  const save = async (values: {
    name: string;
    districtId: string;
    address: string;
    phone: string;
    lat: number | null;
    lng: number | null;
    logoUrl?: string;
  }) => {
    try {
      await mutations.save(
        {
          name: values.name.trim(),
          districtId: values.districtId,
          address: values.address.trim() || undefined,
          phone: values.phone,
          latitude: values.lat,
          longitude: values.lng,
          logoUrl: values.logoUrl ?? "",
        },
        editing?.id ?? null,
      );
      setDialogOpen(false);
      setEditing(null);
    } catch {
      // onError already toasted — keep the dialog open to fix and retry
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await mutations.remove(deleting.id);
      setDeleting(null);
    } catch {
      // onError already toasted — keep the confirm dialog open to retry
    }
  };

  const actionsFor = (branch: Branch): RowAction[] => [
    { label: t.common.edit, icon: Pencil, onSelect: () => openEdit(branch) },
    {
      label: t.common.delete,
      icon: Trash2,
      onSelect: () => setDeleting(branch),
      danger: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-xl font-bold md:text-2xl">
          {t.dashboard.branches}
          {branches && branches.length > 0 && (
            <span className="ms-2 rounded-full bg-surface-container px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
              {branches.length}
            </span>
          )}
        </h1>
        <Button onClick={openNew}>
          <Plus className="size-4" />
          {t.dashboard.addBranch}
        </Button>
      </div>

      {!branches ? (
        <LoadingSpinner />
      ) : branches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-berry-soft text-berry-soft-foreground">
            <Building2 className="size-6" />
          </span>
          <p className="mt-4 font-heading text-lg font-bold">
            {t.dashboard.noBranches}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {t.dashboard.noBranchesBody}
          </p>
          <Button className="mt-5" onClick={openNew}>
            <Plus className="size-4" />
            {t.dashboard.addBranch}
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {branches.map((branch) => (
            <li
              key={branch.id}
              className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-colors duration-200 hover:border-primary/35"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  {branch.logoUrl ? (
                    <SafeImage
                      src={branch.logoUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0 rounded-xl border border-border/60 object-cover"
                    />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-berry-soft text-berry-soft-foreground">
                      <Building2 className="size-5" />
                    </span>
                  )}
                  <h3 className="min-w-0 truncate font-heading text-base font-bold">
                    {branch.name}
                  </h3>
                </div>
                <RowActions actions={actionsFor(branch)} />
              </div>

              <div className="space-y-1.5 text-sm text-muted-foreground">
                <p className="flex items-center gap-1.5" dir="ltr">
                  <Phone className="size-3.5 shrink-0" />
                  <span dir="ltr">{branch.phone}</span>
                </p>
                <p className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" />
                  <span className="min-w-0">
                    {districtName(branch.districtId)}
                    {branch.address && (
                      <>
                        {lang === "ar" ? "، " : ", "}
                        {branch.address}
                      </>
                    )}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <BranchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSave={save}
        isSaving={mutations.isSaving}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.dashboard.deleteBranchTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {fmt(t.dashboard.deleteBranchBody, { name: deleting?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleting(null)}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={mutations.isRemoving}
              onClick={confirmDelete}
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
