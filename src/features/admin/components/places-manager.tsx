"use client";

import { useState } from "react";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createAdminGovernorate,
  createAdminRegion,
  deleteAdminGovernorate,
  deleteAdminRegion,
  updateAdminGovernorate,
  updateAdminRegion,
} from "@/features/admin/services";
import { fmt, useI18n } from "@/i18n/client";
import { toast } from "@/lib/toast";
import type { Governorate, Region } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Governorates and the regions inside them, as one master–detail panel.
 *
 * A region only means anything relative to its governorate, so the two are
 * edited together: pick a governorate on the left, work on its regions on the
 * right. Two separate flat lists would make the reader hold the relationship
 * in their head and make it possible to add a region to nothing.
 *
 * Mutations are persisted through the locations API; mock mode keeps the same
 * interaction available when the backend is not configured.
 */
export function PlacesManager({
  governorates: initialGovernorates,
  regions: initialRegions,
}: {
  governorates: Governorate[];
  regions: Region[];
}) {
  const { t, lang } = useI18n();
  const Chevron = lang === "ar" ? ChevronLeft : ChevronRight;

  const [governorates, setGovernorates] = useState(initialGovernorates);
  const [regions, setRegions] = useState(initialRegions);
  const [selectedId, setSelectedId] = useState(
    initialGovernorates[0]?.id ?? "",
  );

  const [newGovernorate, setNewGovernorate] = useState("");
  const [newRegion, setNewRegion] = useState("");
  const [renamingGovernorateId, setRenamingGovernorateId] = useState<
    string | null
  >(null);
  const [governorateRenameValue, setGovernorateRenameValue] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isAddingGovernorate, setIsAddingGovernorate] = useState(false);
  const [isSavingGovernorateRename, setIsSavingGovernorateRename] =
    useState(false);
  const [deletingGovernorateId, setDeletingGovernorateId] = useState<
    string | null
  >(null);
  const [isAddingRegion, setIsAddingRegion] = useState(false);
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [deletingRegionId, setDeletingRegionId] = useState<string | null>(
    null,
  );

  const selected = governorates.find((g) => g.id === selectedId);
  const regionsOf = (id: string) =>
    regions.filter((r) => r.governorateId === id);
  const selectedRegions = selected ? regionsOf(selected.id) : [];

  const showError = (error: unknown) => {
    toast.error(error instanceof Error ? error.message : t.common.saveFailed);
  };

  const addGovernorate = async () => {
    const name = newGovernorate.trim();
    if (!name || isAddingGovernorate) return;
    setIsAddingGovernorate(true);
    try {
      const governorate = await createAdminGovernorate(name);
      setGovernorates((prev) => [...prev, governorate]);
      setNewGovernorate("");
      setSelectedId(governorate.id);
      toast.success(governorate.message ?? t.admin.saved);
    } catch (error) {
      showError(error);
    } finally {
      setIsAddingGovernorate(false);
    }
  };

  const startGovernorateRename = (governorate: Governorate) => {
    setRenamingGovernorateId(governorate.id);
    setGovernorateRenameValue(governorate.name[lang]);
  };

  const commitGovernorateRename = async () => {
    const name = governorateRenameValue.trim();
    if (!renamingGovernorateId || !name || isSavingGovernorateRename) return;
    setIsSavingGovernorateRename(true);
    try {
      const updated = await updateAdminGovernorate(
        renamingGovernorateId,
        name,
      );
      setGovernorates((prev) =>
        prev.map((governorate) =>
          governorate.id === updated.id ? updated : governorate,
        ),
      );
      toast.success(updated.message ?? t.admin.saved);
      setRenamingGovernorateId(null);
    } catch (error) {
      showError(error);
    } finally {
      setIsSavingGovernorateRename(false);
    }
  };

  const deleteGovernorate = async (id: string) => {
    // deleting a parent would orphan its children, so it is blocked with a
    // reason rather than silently cascading
    if (regionsOf(id).length > 0) {
      toast.error(t.admin.cannotDeleteGovernorate);
      return;
    }
    if (deletingGovernorateId) return;
    setDeletingGovernorateId(id);
    try {
      const result = await deleteAdminGovernorate(id);
      const next = governorates.filter((governorate) => governorate.id !== id);
      setGovernorates(next);
      if (selectedId === id) setSelectedId(next[0]?.id ?? "");
      toast.success(result?.message ?? t.admin.saved);
    } catch (error) {
      showError(error);
    } finally {
      setDeletingGovernorateId(null);
    }
  };

  const addRegion = async () => {
    const name = newRegion.trim();
    if (!name || !selected || isAddingRegion) return;
    setIsAddingRegion(true);
    try {
      const region = await createAdminRegion(selected.id, name);
      setRegions((prev) => [...prev, region]);
      setNewRegion("");
      toast.success(region.message ?? t.admin.saved);
    } catch (error) {
      showError(error);
    } finally {
      setIsAddingRegion(false);
    }
  };

  const startRename = (region: Region) => {
    setRenamingId(region.id);
    setRenameValue(region.name[lang]);
  };

  const commitRename = async () => {
    const name = renameValue.trim();
    if (!renamingId || !name || isSavingRename) return;
    setIsSavingRename(true);
    try {
      const current = regions.find((region) => region.id === renamingId);
      const updated = await updateAdminRegion(renamingId, name);
      setRegions((prev) =>
        prev.map((region) =>
          region.id === updated.id
            ? {
                ...updated,
                governorateId:
                  current?.governorateId ?? updated.governorateId,
              }
            : region,
        ),
      );
      toast.success(updated.message ?? t.admin.saved);
      setRenamingId(null);
    } catch (error) {
      showError(error);
    } finally {
      setIsSavingRename(false);
    }
  };

  const deleteRegion = async (id: string) => {
    if (deletingRegionId) return;
    setDeletingRegionId(id);
    try {
      const result = await deleteAdminRegion(id);
      setRegions((prev) => prev.filter((region) => region.id !== id));
      toast.success(result?.message ?? t.admin.saved);
    } catch (error) {
      showError(error);
    } finally {
      setDeletingRegionId(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
      {/* master */}
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <h3 className="font-heading text-sm font-bold">
          {t.admin.governorates}
        </h3>

        <div className="mt-3 flex gap-2">
          <Input
            placeholder={t.admin.governorateName}
            className="h-10"
            disabled={isAddingGovernorate}
            value={newGovernorate}
            onChange={(e) => setNewGovernorate(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void addGovernorate()}
          />
          <Button
            className="h-10 shrink-0"
            aria-label={t.admin.addGovernorate}
            loading={isAddingGovernorate}
            onClick={() => void addGovernorate()}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <ul className="scrollbar-none mt-3 max-h-96 space-y-1.5 overflow-y-auto">
          {governorates.map((gov) => {
            const count = regionsOf(gov.id).length;
            const active = gov.id === selectedId;
            return (
              <li key={gov.id}>
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-xl border px-1.5 transition-colors",
                    active
                      ? "border-primary bg-berry-soft/30 dark:bg-berry-soft/50"
                      : "border-border/60 hover:border-primary/35",
                  )}
                >
                  {renamingGovernorateId === gov.id ? (
                    <Input
                      autoFocus
                      disabled={isSavingGovernorateRename}
                      value={governorateRenameValue}
                      onChange={(e) => setGovernorateRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void commitGovernorateRename();
                        if (e.key === "Escape") setRenamingGovernorateId(null);
                      }}
                      className="h-8 min-w-0 flex-1"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedId(gov.id)}
                      aria-current={active ? "true" : undefined}
                      className="flex min-h-10 flex-1 cursor-pointer items-center gap-2 px-2 text-start text-sm font-semibold"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {gov.name[lang]}
                      </span>
                      <span className="shrink-0 rounded-full bg-surface-container px-1.5 text-xs text-muted-foreground tabular-nums">
                        {count}
                      </span>
                      <Chevron className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  )}
                  {renamingGovernorateId === gov.id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t.common.save}
                        className="shrink-0 text-success"
                        loading={isSavingGovernorateRename}
                        onClick={() => void commitGovernorateRename()}
                      >
                        <Check className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t.common.cancel}
                        className="shrink-0 text-muted-foreground"
                        disabled={isSavingGovernorateRename}
                        onClick={() => setRenamingGovernorateId(null)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t.common.edit}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => startGovernorateRename(gov)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t.common.delete}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    loading={deletingGovernorateId === gov.id}
                    disabled={deletingGovernorateId !== null}
                    onClick={() => void deleteGovernorate(gov.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* detail */}
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        {!selected ? (
          <p className="flex min-h-40 items-center justify-center gap-2.5 text-center text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" />
            {t.admin.selectGovernorate}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-heading text-sm font-bold">
                {fmt(t.admin.regionsOf, { name: selected.name[lang] })}
              </h3>
              <span className="text-xs font-semibold text-muted-foreground">
                {fmt(t.admin.regionCount, { count: selectedRegions.length })}
              </span>
            </div>

            <div className="mt-3 flex gap-2">
              <Input
                placeholder={t.admin.regionName}
                className="h-10"
                disabled={isAddingRegion}
                value={newRegion}
                onChange={(e) => setNewRegion(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && void addRegion()
                }
              />
              <Button
                className="h-10 shrink-0"
                aria-label={t.admin.addRegion}
                loading={isAddingRegion}
                onClick={() => void addRegion()}
              >
                <Plus className="size-4" />
                {t.common.add}
              </Button>
            </div>

            {selectedRegions.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                {t.admin.noRegions}
              </p>
            ) : (
              <ul className="scrollbar-none mt-3 grid max-h-96 gap-2 overflow-y-auto sm:grid-cols-2">
                {selectedRegions.map((region) => (
                  <li
                    key={region.id}
                    className="flex items-center gap-1 rounded-xl border border-border/60 px-1.5 py-1"
                  >
                    {renamingId === region.id ? (
                      <>
                        <Input
                          autoFocus
                          disabled={isSavingRename}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void commitRename();
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          className="h-8"
                        />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t.common.save}
                          className="shrink-0 text-success"
                          loading={isSavingRename}
                          onClick={() => void commitRename()}
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t.common.cancel}
                          className="shrink-0 text-muted-foreground"
                          disabled={isSavingRename}
                          onClick={() => setRenamingId(null)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate px-2 text-sm font-semibold">
                          {region.name[lang]}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t.admin.renameRecord}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => startRename(region)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t.common.delete}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          loading={deletingRegionId === region.id}
                          disabled={deletingRegionId !== null}
                          onClick={() => void deleteRegion(region.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
