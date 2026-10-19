"use client";

import Link from "next/link";
import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";

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
import { PendingChangesBar } from "@/components/shared/pending-changes-bar";
import { CategoryCard } from "@/features/restaurant-dashboard/components/category-card";
import { CategoryDialog } from "@/features/restaurant-dashboard/components/category-dialog";
import { useCategoryMutations } from "@/features/restaurant-dashboard/hooks/use-catalog";
import { useBusinessId } from "@/features/restaurant-dashboard/hooks/use-my-business";
import { getMyMenu } from "@/features/restaurant-dashboard/services";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import type { MenuCategory } from "@/lib/types";

/**
 * Its own page rather than a dialog on top of the menu — reordering,
 * renaming, and a per-category photo all need enough room that cramming
 * them into a popup over the item list stopped making sense. Reached from
 * the menu page's "manage categories" link and from its own sidebar entry;
 * the menu page itself only ever reads `categories` from the same cached
 * `/me/menu` query this writes to.
 *
 * Cards match the product grid's own look (avatar, kebab, bordered footer)
 * on purpose — a category and a product should read as the same kind of
 * thing here, just with an item count where a product shows its view count.
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuCategory | null>(null);
  const [deleting, setDeleting] = useState<MenuCategory | null>(null);
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

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (category: MenuCategory) => {
    setEditing(category);
    setDialogOpen(true);
  };

  const save = async ({
    name,
    imageUrl,
  }: {
    name: string;
    imageUrl?: string;
  }) => {
    try {
      if (editing) {
        await mutations.update(editing.id, name, imageUrl);
      } else {
        await mutations.create(name, imageUrl);
      }
      setDialogOpen(false);
    } catch {
      // onError already toasted — keep the dialog open so the owner's
      // edits are still there to fix and retry
    }
  };

  const requestDelete = (category: MenuCategory) => {
    if (itemCountFor(category.id) > 0) {
      toast.error(t.dashboard.cannotDeleteCategory);
      return;
    }
    setDeleting(category);
  };

  const confirmDeleteCategory = async () => {
    if (!deleting) return;
    try {
      await mutations.remove(deleting.id);
      setDeleting(null);
    } catch {
      // onError already toasted
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href={`/${lang}/dashboard/menu`}
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <BackIcon className="size-4" />
          {t.dashboard.backToMenu}
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold md:text-2xl">
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
          <Button onClick={openAdd} className="shrink-0">
            <Plus className="size-4" />
            {t.dashboard.addCategory}
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {t.dashboard.noCategories}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((category, index) => (
            <CategoryCard
              key={category.id}
              category={category}
              itemCount={itemCountFor(category.id)}
              canMoveUp={index > 0}
              canMoveDown={index < sorted.length - 1}
              onMoveUp={() => moveLocal(category.id, "up")}
              onMoveDown={() => moveLocal(category.id, "down")}
              onEdit={() => openEdit(category)}
              onDelete={() => requestDelete(category)}
            />
          ))}
        </div>
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

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSave={save}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.dashboard.deleteCategoryTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {fmt(t.dashboard.deleteCategoryBody, {
                name: deleting?.name[lang] ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleting(null)}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={mutations.isPending}
              onClick={confirmDeleteCategory}
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
