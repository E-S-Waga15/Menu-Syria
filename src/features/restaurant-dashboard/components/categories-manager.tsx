"use client";

import Link from "next/link";
import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
  X,
} from "lucide-react";

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
import { FileDropzone } from "@/components/shared/file-dropzone";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { PendingChangesBar } from "@/components/shared/pending-changes-bar";
import { useCategoryMutations } from "@/features/restaurant-dashboard/hooks/use-catalog";
import { useBusinessId } from "@/features/restaurant-dashboard/hooks/use-my-business";
import { getMyMenu } from "@/features/restaurant-dashboard/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { uploadImageWithProgress } from "@/lib/api/upload";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import type { MenuCategory } from "@/lib/types";

/**
 * Its own page rather than a dialog on top of the menu — reordering,
 * renaming, and now a per-category photo all need enough room that cramming
 * them into a popup over the item list stopped making sense. Reached from
 * the menu page's "manage categories" link; the menu page itself only ever
 * reads `categories` from the same cached `/me/menu` query this writes to.
 */
export function CategoriesManager() {
  const { t, lang, dir } = useI18n();
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  const { data } = useQuery({
    queryKey: queryKeys.me.menu,
    queryFn: getMyMenu,
  });
  const categories = data?.categories ?? [];
  const items = data?.items ?? [];
  const businessId = useBusinessId(items[0]?.restaurantId);
  const mutations = useCategoryMutations(businessId);

  const itemCountFor = (categoryId: string) =>
    items.filter((i) => i.categoryId === categoryId).length;

  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [stagedOrder, setStagedOrder] = useState<string[] | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"save" | "discard" | null>(
    null,
  );

  if (!data) return <LoadingSpinner />;

  const savedOrder = [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => c.id);
  const order = stagedOrder ?? savedOrder;
  const sorted = order
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is MenuCategory => c !== undefined);
  const isDirty =
    stagedOrder !== null &&
    stagedOrder.some((id, index) => id !== savedOrder[index]);

  const moveLocal = (id: string, direction: "up" | "down") => {
    const index = order.indexOf(id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= order.length) return;
    const next = [...order];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    setStagedOrder(next);
  };

  const submitAdd = async () => {
    const name = newName.trim();
    if (!name || isAdding) return;
    setIsAdding(true);
    try {
      await mutations.create(name);
      setNewName("");
    } catch {
      // onError already toasted — keep the typed name so it can be retried
    } finally {
      setIsAdding(false);
    }
  };

  const startRename = (category: MenuCategory) => {
    setRenamingId(category.id);
    setRenameValue(category.name[lang]);
  };

  const submitRename = async () => {
    const name = renameValue.trim();
    if (!renamingId || !name || isRenaming) {
      if (!name) setRenamingId(null);
      return;
    }
    setIsRenaming(true);
    try {
      await mutations.rename(renamingId, name);
      setRenamingId(null);
    } catch {
      // onError already toasted — keep the field open to fix and retry
    } finally {
      setIsRenaming(false);
    }
  };

  const confirmDelete = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      await mutations.remove(id);
    } catch {
      // onError already toasted
    } finally {
      setDeletingId(null);
    }
  };

  const uploadImage = (category: MenuCategory, file: File) => {
    setUploadingId(category.id);
    uploadImageWithProgress(file, "categories")
      .then(({ url }) => mutations.updateImage(category.id, url))
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
      })
      .finally(() => setUploadingId(null));
  };

  const removeImage = (category: MenuCategory) => {
    setUploadingId(category.id);
    mutations
      .updateImage(category.id, "")
      .catch((error: unknown) => {
        toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
      })
      .finally(() => setUploadingId(null));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${lang}/dashboard/menu`}
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <BackIcon className="size-4" />
          {t.dashboard.backToMenu}
        </Link>
        <h1 className="mt-2 font-heading text-xl font-bold md:text-2xl">
          {t.dashboard.manageCategories}
          {categories.length > 0 && (
            <span className="ms-2 rounded-full bg-surface-container px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
              {categories.length}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.dashboard.manageCategoriesHint}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitAdd()}
          placeholder={t.dashboard.categoryName}
          className="h-11 flex-1"
        />
        <Button loading={isAdding} onClick={submitAdd}>
          <Plus className="size-4" />
          {t.dashboard.addCategory}
        </Button>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {t.dashboard.noCategories}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {sorted.map((category, index) => {
            const count = itemCountFor(category.id);
            const uploading = uploadingId === category.id;
            return (
              <li
                key={category.id}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3"
              >
                <div className="relative shrink-0">
                  <FileDropzone
                    // remounts whenever the saved image actually changes
                    // (including a removal) — FileDropzone only ever reads
                    // `previewUrl` once, on mount, into its own state
                    key={`${category.id}-${category.imageUrl ?? "none"}`}
                    variant="avatar"
                    label={t.dashboard.categoryImage}
                    previewUrl={category.imageUrl}
                    className="size-14"
                    onFile={(file) => file && uploadImage(category, file)}
                  />
                  {uploading && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                      <LoadingSpinner className="min-h-0" />
                    </span>
                  )}
                  {category.imageUrl && !uploading && (
                    <button
                      type="button"
                      aria-label={t.dashboard.removeImage}
                      onClick={() => removeImage(category)}
                      className="absolute -top-1 -end-1 flex size-5 items-center justify-center rounded-full bg-card text-muted-foreground ring-2 ring-background hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {renamingId === category.id ? (
                  <Input
                    autoFocus
                    disabled={isRenaming}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitRename()}
                    onBlur={submitRename}
                    className="h-9 flex-1"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startRename(category)}
                    className="flex-1 truncate rounded-lg px-2 py-1 text-start text-sm font-semibold hover:bg-accent"
                  >
                    {category.name[lang]}
                    <span className="ms-1.5 text-xs font-normal text-muted-foreground">
                      ({count})
                    </span>
                  </button>
                )}

                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === 0}
                  aria-label={t.dashboard.moveUp}
                  onClick={() => moveLocal(category.id, "up")}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={index === sorted.length - 1}
                  aria-label={t.dashboard.moveDown}
                  onClick={() => moveLocal(category.id, "down")}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={count > 0 || deletingId === category.id}
                  loading={deletingId === category.id}
                  title={count > 0 ? t.dashboard.cannotDeleteCategory : undefined}
                  aria-label={t.common.delete}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => confirmDelete(category.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {isDirty && (
        <PendingChangesBar
          message={t.dashboard.unsavedOrderChanges}
          saveLabel={t.dashboard.saveOrder}
          discardLabel={t.dashboard.discardOrder}
          onSave={() => setConfirmAction("save")}
          onDiscard={() => setConfirmAction("discard")}
          pending={isSavingOrder}
        />
      )}

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "save"
                ? t.dashboard.confirmSaveOrderTitle
                : t.dashboard.confirmDiscardOrderTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "save"
                ? t.dashboard.confirmSaveOrderBody
                : t.dashboard.confirmDiscardOrderBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmAction(null)}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={confirmAction === "discard" ? "destructive" : "default"}
              loading={confirmAction === "save" && isSavingOrder}
              onClick={async () => {
                if (confirmAction === "save" && stagedOrder) {
                  setIsSavingOrder(true);
                  try {
                    await mutations.reorderAll(stagedOrder);
                  } catch {
                    // onError already toasted — keep the staged order and
                    // the confirm dialog so the owner can retry
                    setIsSavingOrder(false);
                    return;
                  }
                  setIsSavingOrder(false);
                }
                setStagedOrder(null);
                setConfirmAction(null);
              }}
            >
              {confirmAction === "save" ? t.common.save : t.dashboard.discardOrder}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
