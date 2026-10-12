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
import { useAuthStore } from "@/features/auth/store";
import {
  ALL_CATEGORIES,
  MenuCategoryBar,
} from "@/features/restaurant-dashboard/components/menu-category-bar";
import { MenuDishDialog } from "@/features/restaurant-dashboard/components/menu-dish-dialog";
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
  const view = useUiStore((s) => s.catalogView);
  const setView = useUiStore((s) => s.setCatalogView);

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
  const visibleItems = items
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

  const toggleAvailability = (id: string, value: boolean) =>
    itemMutations.setAvailability(id, value);

  const confirmRemoveItem = () => {
    if (!deletingItem) return;
    itemMutations.remove(deletingItem.id);
    setDeletingItem(null);
  };

  const onDropOn = (targetId: string) => {
    if (!dragId || dragId === targetId || !canReorder) return;
    const inCategory = [...items]
      .filter((i) => i.categoryId === activeCategory)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const from = inCategory.findIndex((i) => i.id === dragId);
    const to = inCategory.findIndex((i) => i.id === targetId);
    if (from !== -1 && to !== -1) {
      const reordered = [...inCategory];
      const [moved] = reordered.splice(from, 1);
      if (moved) reordered.splice(to, 0, moved);
      // positions are 1-based so a brand-new item (whose order is "after the
      // last one") sorts alongside the ones that were dragged
      itemMutations.reorder(
        reordered.map((item, index) => ({
          id: item.id,
          sortOrder: index + 1,
        })),
      );
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
  const deleteCategory = (id: string) => {
    if (itemCountFor(id) > 0) {
      toast.error(t.dashboard.cannotDeleteCategory);
      return;
    }
    categoryMutations.remove(id);
    if (activeCategory === id) setActiveCategory(ALL_CATEGORIES);
  };

  const viewProps = (item: MenuItem) => ({
    item,
    draggable: canReorder,
    isDragging: dragId === item.id,
    onDragStart: () => setDragId(item.id),
    onDrop: () => onDropOn(item.id),
    onToggleAvailability: (value: boolean) =>
      toggleAvailability(item.id, value),
    onEdit: () => openEdit(item),
    onDelete: () => setDeletingItem(item),
  });

  return (
    <div className="space-y-6">
      <MenuCategoryBar
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        query={query}
        onQueryChange={setQuery}
        itemCountFor={itemCountFor}
        totalCount={items.length}
        onAddCategory={categoryMutations.create}
        onRenameCategory={categoryMutations.rename}
        onDeleteCategory={deleteCategory}
        onReorderCategory={categoryMutations.reorder}
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visibleItems.map((item) => (
              <MenuItemCard key={item.id} {...viewProps(item)} />
            ))}
          </div>
        )}
      </section>

      <MenuDishDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        categories={categories}
        isStore={isStore}
        onSave={(dish) => {
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
            optionGroups: dish.optionGroups ?? [],
            // an empty gallery is meaningful: the owner took every photo off
            images: dish.images ?? [],
          };
          // the mutation's own onSuccess toasts once the server actually
          // agrees — toasting here unconditionally used to tell the owner
          // "done" a beat before a real validation error arrived
          if (editing) {
            itemMutations.edit(editing.id, payload);
          } else {
            itemMutations.create({
              ...payload,
            });
          }
          setDialogOpen(false);
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
