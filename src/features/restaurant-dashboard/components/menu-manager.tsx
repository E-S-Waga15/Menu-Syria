"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

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
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { PendingChangesBar } from "@/components/shared/pending-changes-bar";
import { useAuthStore } from "@/features/auth/store";
import {
  ALL_CATEGORIES,
  MenuCategoryBar,
} from "@/features/restaurant-dashboard/components/menu-category-bar";
import { MenuDishDialog } from "@/features/restaurant-dashboard/components/menu-dish-dialog";
import { ItemStatsModal } from "@/features/restaurant-dashboard/components/item-stats-modal";
import { ItemPreviewModal } from "@/features/restaurant-dashboard/components/item-preview-modal";
import { ItemOptionsModal } from "@/features/restaurant-dashboard/components/item-options-modal";
import {
  MenuItemCard,
  MenuItemRow,
} from "@/features/restaurant-dashboard/components/menu-item-views";
import { MenuItemsToolbar } from "@/features/restaurant-dashboard/components/menu-items-toolbar";
import {
  useCategoryMutations,
  useItemMutations,
} from "@/features/restaurant-dashboard/hooks/use-catalog";
import { useBusinessId } from "@/features/restaurant-dashboard/hooks/use-my-business";
import { getMyMenu } from "@/features/restaurant-dashboard/services";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import { useUiStore } from "@/stores/ui-store";
import type { MenuItem } from "@/lib/types";

/**
 * The catalogue screen: sections on top, items below.
 *
 * This file is deliberately only wiring — state, the handlers that mutate it,
 * and the order the pieces appear in. The bar, the toolbar, the row/card and
 * the edit dialog each own their own markup, so a change to how an item looks
 * never means reading the reorder logic, and vice versa.
 */
export function MenuManager() {
  const { t, lang } = useI18n();
  const businessType = useAuthStore(
    (s) => s.session?.businessType ?? "restaurant",
  );
  const isStore = businessType === "store";

  const { data } = useQuery({
    queryKey: queryKeys.me.menu,
    queryFn: getMyMenu,
  });

  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);
  const [query, setQuery] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  const [statsItem, setStatsItem] = useState<MenuItem | null>(null);
  const [previewItem, setPreviewItem] = useState<MenuItem | null>(null);
  const [optionsItem, setOptionsItem] = useState<MenuItem | null>(null);
  // staged item order, within the single category being reordered — only
  // written once the owner confirms, never on the drag/click that drew it
  const [stagedOrderIds, setStagedOrderIds] = useState<string[] | null>(null);
  const [confirmOrderAction, setConfirmOrderAction] = useState<
    "save" | "discard" | null
  >(null);
  const view = useUiStore((s) => s.catalogView);
  const setView = useUiStore((s) => s.setCatalogView);

  // Leaving the category (or filtering) makes a staged order meaningless —
  // it was positions within a list that no longer matches what's on screen.
  const changeCategory = (id: string) => {
    setStagedOrderIds(null);
    setActiveCategory(id);
  };
  const changeQuery = (value: string) => {
    setStagedOrderIds(null);
    setQuery(value);
  };

  // The cached list is now the single source of truth: every write patches it
  // optimistically and refetches behind itself, so keeping a second editable
  // copy here would just be one more thing that can disagree with the server.
  const categories = data?.categories ?? [];
  const items = data?.items ?? [];
  const businessId = useBusinessId(items[0]?.restaurantId);

  const categoryMutations = useCategoryMutations(businessId);
  const itemMutations = useItemMutations(businessId);

  if (!data) {
    return <LoadingSpinner />;
  }

  const itemCountFor = (categoryId: string) =>
    items.filter((i) => i.categoryId === categoryId).length;

  const normalisedQuery = query.trim().toLowerCase();
  const baseVisibleItems = items
    .filter(
      (i) =>
        activeCategory === ALL_CATEGORIES || i.categoryId === activeCategory,
    )
    .filter(
      (i) =>
        !normalisedQuery ||
        i.name.ar.toLowerCase().includes(normalisedQuery) ||
        i.name.en.toLowerCase().includes(normalisedQuery),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Order only means something inside one category and with nothing filtered
  // out — dragging row 3 above row 1 of a partial list would write a position
  // the user cannot see the consequences of.
  const canReorder = activeCategory !== ALL_CATEGORIES && !normalisedQuery;

  const savedOrderIds = baseVisibleItems.map((i) => i.id);
  // every drag/arrow move only ever touches this local order — nothing is
  // written until the owner confirms it from the pending-changes bar below
  const displayOrderIds =
    canReorder && stagedOrderIds ? stagedOrderIds : savedOrderIds;
  const visibleItems = canReorder
    ? (displayOrderIds
        .map((id) => baseVisibleItems.find((i) => i.id === id))
        .filter((i): i is MenuItem => i !== undefined))
    : baseVisibleItems;
  const isOrderDirty =
    canReorder &&
    stagedOrderIds !== null &&
    stagedOrderIds.some((id, index) => id !== savedOrderIds[index]);

  const toggleAvailability = (id: string, value: boolean) =>
    itemMutations.setAvailability(id, value);

  const confirmRemoveItem = async () => {
    if (!deletingItem) return;
    try {
      await itemMutations.remove(deletingItem.id);
      setDeletingItem(null);
    } catch {
      // mutation's onError already toasted — keep the dialog open to retry
    }
  };

  const moveItemLocal = (id: string, direction: "up" | "down") => {
    const order = stagedOrderIds ?? savedOrderIds;
    const index = order.indexOf(id);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= order.length) return;
    const next = [...order];
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    setStagedOrderIds(next);
  };

  const commitOrder = async () => {
    if (!stagedOrderIds) return;
    // deliberately not caught here — the caller decides what "stay open"
    // means for whichever dialog it closes on success
    await itemMutations.reorder(
      stagedOrderIds.map((id, index) => ({ id, sortOrder: index + 1 })),
    );
    setStagedOrderIds(null);
  };

  const onDropOn = (targetId: string) => {
    if (!dragId || dragId === targetId || !canReorder) return;
    const order = stagedOrderIds ?? savedOrderIds;
    const from = order.indexOf(dragId);
    const to = order.indexOf(targetId);
    if (from !== -1 && to !== -1) {
      const next = [...order];
      const [moved] = next.splice(from, 1);
      if (moved) next.splice(to, 0, moved);
      setStagedOrderIds(next);
    }
    setDragId(null);
  };

  const openEdit = (item: MenuItem | null) => {
    // Adding needs a home for the new item. On "All" there is no single
    // answer, so ask rather than guessing a category the user did not choose.
    setEditing(item);
    setDialogOpen(true);
  };

  // --- category CRUD ---
  // The guard stays here rather than only on the server: the button is already
  // disabled in the manager, and a 409 round-trip to say the same thing would
  // be a slower way to tell the owner what they can already see.
  const deleteCategory = async (id: string) => {
    if (itemCountFor(id) > 0) {
      toast.error(t.dashboard.cannotDeleteCategory);
      return;
    }
    await categoryMutations.remove(id);
    if (activeCategory === id) changeCategory(ALL_CATEGORIES);
  };

  const viewProps = (item: MenuItem) => {
    const index = displayOrderIds.indexOf(item.id);
    return {
      item,
      draggable: canReorder,
      isDragging: dragId === item.id,
      onDragStart: () => setDragId(item.id),
      onDrop: () => onDropOn(item.id),
      canMoveUp: canReorder && index > 0,
      canMoveDown: canReorder && index !== -1 && index < displayOrderIds.length - 1,
      onMoveUp: () => moveItemLocal(item.id, "up"),
      onMoveDown: () => moveItemLocal(item.id, "down"),
      onToggleAvailability: (value: boolean) =>
        toggleAvailability(item.id, value),
      onEdit: () => openEdit(item),
      onDelete: () => setDeletingItem(item),
      onShowStats: () => setStatsItem(item),
      onPreview: () => setPreviewItem(item),
      onEditOptions: () => setOptionsItem(item),
    };
  };

  return (
    <div className="space-y-6">
      <MenuCategoryBar
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={changeCategory}
        query={query}
        onQueryChange={changeQuery}
        itemCountFor={itemCountFor}
        totalCount={items.length}
        onAddCategory={categoryMutations.create}
        onRenameCategory={categoryMutations.rename}
        onDeleteCategory={deleteCategory}
        onReorderCategoryCommit={categoryMutations.reorderAll}
      />

      <section className="space-y-4 border-t border-border/60 pt-6">
        <MenuItemsToolbar
          count={visibleItems.length}
          view={view}
          onViewChange={setView}
          onAdd={() => openEdit(null)}
          isStore={isStore}
        />

        <p className="text-xs font-semibold text-muted-foreground">
          {canReorder
            ? t.dashboard.dragToReorder
            : t.dashboard.reorderInCategoryOnly}
        </p>

        {visibleItems.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            {t.dashboard.noItemsFound}
          </p>
        ) : view === "list" ? (
          <ul className="space-y-3">
            {visibleItems.map((item) => (
              <MenuItemRow key={item.id} {...viewProps(item)} />
            ))}
          </ul>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleItems.map((item) => (
              <MenuItemCard key={item.id} {...viewProps(item)} />
            ))}
          </div>
        )}
      </section>

      {isOrderDirty && (
        <PendingChangesBar
          message={t.dashboard.unsavedOrderChanges}
          saveLabel={t.dashboard.saveOrder}
          discardLabel={t.dashboard.discardOrder}
          onSave={() => setConfirmOrderAction("save")}
          onDiscard={() => setConfirmOrderAction("discard")}
          pending={itemMutations.isPending}
        />
      )}

      <ItemStatsModal
        item={statsItem}
        open={statsItem !== null}
        onOpenChange={(open) => !open && setStatsItem(null)}
      />

      <ItemPreviewModal
        item={previewItem}
        open={previewItem !== null}
        onOpenChange={(open) => !open && setPreviewItem(null)}
      />

      <ItemOptionsModal
        item={optionsItem}
        open={optionsItem !== null}
        onOpenChange={(open) => !open && setOptionsItem(null)}
        isStore={isStore}
        onSave={async ({ optionGroups, quantityLocked }) => {
          if (optionsItem)
            await itemMutations.edit(optionsItem.id, { optionGroups, quantityLocked });
        }}
      />

      <AlertDialog
        open={confirmOrderAction !== null}
        onOpenChange={(open) => !open && setConfirmOrderAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmOrderAction === "save"
                ? t.dashboard.confirmSaveOrderTitle
                : t.dashboard.confirmDiscardOrderTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmOrderAction === "save"
                ? t.dashboard.confirmSaveOrderBody
                : t.dashboard.confirmDiscardOrderBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOrderAction(null)}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={confirmOrderAction === "discard" ? "destructive" : "default"}
              loading={confirmOrderAction === "save" && itemMutations.isPending}
              onClick={async () => {
                if (confirmOrderAction === "save") {
                  try {
                    await commitOrder();
                  } catch {
                    // mutation's onError already toasted — keep the confirm
                    // dialog and the staged order so the owner can retry
                    return;
                  }
                } else {
                  setStagedOrderIds(null);
                }
                setConfirmOrderAction(null);
              }}
            >
              {confirmOrderAction === "save"
                ? t.common.save
                : t.dashboard.discardOrder}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MenuDishDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        categories={categories}
        isStore={isStore}
        onSave={async (dish) => {
          // Mapped field by field, not spread: the dialog hands back
          // `nameText`/`descText`, which do not match `name`/`description` —
          // spreading them left the real fields untouched, so renaming an item
          // did nothing while quietly adding junk keys to it.
          const payload = {
            categoryId: dish.categoryId,
            name: dish.nameText ?? "",
            description: dish.descText ?? "",
            price: dish.price ?? 0,
            currency: dish.currency,
            images: dish.images ?? [],
            quantityLocked: dish.quantityLocked,
          };
          // the mutation's own onSuccess toasts once the server actually
          // agrees — toasting here unconditionally used to tell the owner
          // "done" a beat before a real validation error arrived
          try {
            if (editing) {
              // editing an existing item never touches optionGroups here —
              // those are edited on their own, from the item card's kebab
              // menu (ItemOptionsModal)
              await itemMutations.edit(editing.id, payload);
            } else {
              await itemMutations.create({
                ...payload,
                optionGroups: dish.optionGroups,
              });
            }
            setDialogOpen(false);
          } catch {
            // mutation's onError already toasted — keep the dialog open so
            // the owner's edits are still there to fix and retry
          }
        }}
      />

      <AlertDialog
        open={deletingItem !== null}
        onOpenChange={(open) => !open && setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.dashboard.deleteItemTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {fmt(t.dashboard.deleteItemBody, {
                name: deletingItem?.name[lang] ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingItem(null)}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={itemMutations.isRemoving}
              onClick={confirmRemoveItem}
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
