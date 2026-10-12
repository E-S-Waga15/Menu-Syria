"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  updateCategory,
  updateItem,
  type ItemWriteInput,
} from "@/features/restaurant-dashboard/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import type { MenuCategory, MenuItem } from "@/lib/types";

type MenuCache = { categories: MenuCategory[]; items: MenuItem[] };

/** a placeholder row's id, replaced by the server's own on the next refetch */
const tempId = (prefix: string) =>
  `${prefix}-pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * The single place that knows how the catalog cache is shaped, so every write
 * below can patch it the moment the button is pressed — and put it back
 * untouched if the server refuses.
 */
function useCatalogCache() {
  const queryClient = useQueryClient();
  const key = queryKeys.me.menu;

  return {
    async patch(next: (current: MenuCache) => MenuCache) {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MenuCache>(key);
      if (previous) queryClient.setQueryData<MenuCache>(key, next(previous));
      return { previous };
    },
    restore(context?: { previous?: MenuCache }) {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    refresh: () => queryClient.invalidateQueries({ queryKey: key }),
    read: () => queryClient.getQueryData<MenuCache>(key),
  };
}

/** Category create / rename / reorder / delete, all optimistic. */
export function useCategoryMutations(businessId: string) {
  const { t } = useI18n();
  const cache = useCatalogCache();

  const onError = (
    error: unknown,
    _variables: unknown,
    context?: { previous?: MenuCache },
  ) => {
    cache.restore(context);
    toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
  };
  const onSettled = () => cache.refresh();

  const add = useMutation({
    mutationFn: (input: { name: string; sortOrder: number }) =>
      createCategory({ businessId, ...input }),
    onMutate: ({ name, sortOrder }) =>
      cache.patch((current) => ({
        ...current,
        categories: [
          ...current.categories,
          {
            id: tempId("category"),
            restaurantId: businessId,
            name: { ar: name, en: name },
            sortOrder,
          },
        ],
      })),
    onSuccess: () => toast.success(t.dashboard.categorySaved),
    onError,
    onSettled,
  });

  const rename = useMutation({
    mutationFn: (input: { id: string; name?: string; sortOrder?: number }) =>
      updateCategory({ businessId, ...input }),
    onMutate: ({ id, name, sortOrder }) =>
      cache.patch((current) => ({
        ...current,
        categories: current.categories.map((category) =>
          category.id === id
            ? {
                ...category,
                name: name ? { ar: name, en: name } : category.name,
                sortOrder: sortOrder ?? category.sortOrder,
              }
            : category,
        ),
      })),
    // reorder rides this same mutation with no `name` — it has no result
    // worth announcing, unlike an actual rename
    onSuccess: (_data, { name }) => {
      if (name !== undefined) toast.success(t.dashboard.categorySaved);
    },
    onError,
    onSettled,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onMutate: (id) =>
      cache.patch((current) => ({
        ...current,
        categories: current.categories.filter((category) => category.id !== id),
      })),
    onSuccess: () => toast.success(t.dashboard.categoryDeleted),
    onError,
    onSettled,
  });

  return {
    /** places a new category after the owner's current last one */
    create: (name: string) =>
      add.mutate({
        name,
        sortOrder: (cache.read()?.categories.length ?? 0) + 1,
      }),
    rename: (id: string, name: string) => rename.mutate({ id, name }),
    /**
     * Swaps a category past its neighbour. Only the moving row is written —
     * the neighbour keeps its position, so the two can never end up claiming
     * the same slot.
     */
    reorder: (id: string, direction: "up" | "down") => {
      const sorted = [...(cache.read()?.categories ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      const index = sorted.findIndex((category) => category.id === id);
      const moving = sorted[index];
      const neighbour = sorted[direction === "up" ? index - 1 : index + 1];
      if (!moving || !neighbour) return;
      rename.mutate({ id: moving.id, sortOrder: neighbour.sortOrder });
    },
    remove: (id: string) => remove.mutate(id),
    isPending: add.isPending || rename.isPending || remove.isPending,
  };
}

export interface NewItemInput {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  currency: "SYP" | "USD";
  images: string[];
  optionGroups?: MenuItem["optionGroups"];
}
/** Item (dish/product) create, edit, availability, reorder and delete. */
export function useItemMutations(businessId: string) {
  const { t } = useI18n();
  const cache = useCatalogCache();

  const onError = (
    error: unknown,
    _variables: unknown,
    context?: { previous?: MenuCache },
  ) => {
    cache.restore(context);
    toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
  };
  const onSettled = () => cache.refresh();

  const toItem = (input: NewItemInput & { sortOrder: number }): MenuItem => ({
    id: tempId("item"),
    categoryId: input.categoryId,
    restaurantId: businessId,
    name: { ar: input.name, en: input.name },
    description: { ar: input.description, en: input.description },
    price: input.price,
    currency: input.currency,
    imageUrl: input.images[0] ?? "",
    images: input.images.length ? input.images : undefined,
    optionGroups: input.optionGroups,
    isAvailable: true,
    sortOrder: input.sortOrder,
  });

  const add = useMutation({
    mutationFn: (input: NewItemInput & { sortOrder: number }) =>
      createItem({ businessId, ...input }),
    onMutate: (input) =>
      cache.patch((current) => ({
        ...current,
        items: [...current.items, toItem(input)],
      })),
    onSuccess: () => toast.success(t.dashboard.itemSaved),
    onError,
    onSettled,
  });

  const edit = useMutation({
    mutationFn: (input: { id: string } & Partial<ItemWriteInput>) =>
      updateItem({ businessId, ...input }),
    onMutate: ({ id, ...fields }) =>
      cache.patch((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === id ? { ...item, ...toItemPatch(fields) } : item,
        ),
      })),
    // this mutation also carries the availability toggle and drag-reorder's
    // writes, neither of which is a "save" worth announcing — only the
    // dialog's own save sends a name
    onSuccess: (_data, variables) => {
      if (variables.name !== undefined) toast.success(t.dashboard.itemSaved);
    },
    onError,
    onSettled,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteItem(id),
    onMutate: (id) =>
      cache.patch((current) => ({
        ...current,
        items: current.items.filter((item) => item.id !== id),
      })),
    onSuccess: () => toast.success(t.dashboard.itemDeleted),
    onError,
    onSettled,
  });

  /**
   * Drag-to-reorder writes every affected row's position at once. The list has
   * already been redrawn by the drag itself, so the cache is set first and the
   * requests only have to catch up with what the owner can see.
   */
  const reorder = useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) =>
      Promise.all(
        order.map(({ id, sortOrder }) =>
          updateItem({ id, businessId, sortOrder }),
        ),
      ),
    onMutate: (order) => {
      const positions = new Map(
        order.map(({ id, sortOrder }) => [id, sortOrder]),
      );
      return cache.patch((current) => ({
        ...current,
        items: current.items.map((item) =>
          positions.has(item.id)
            ? { ...item, sortOrder: positions.get(item.id)! }
            : item,
        ),
      }));
    },
    onError,
    onSettled,
  });

  return {
    /** places a new item after everything already in its category */
    create: (input: NewItemInput) => {
      const siblings = (cache.read()?.items ?? []).filter(
        (item) => item.categoryId === input.categoryId,
      );
      add.mutate({ ...input, sortOrder: siblings.length + 1 });
    },
    edit: (id: string, fields: Partial<ItemWriteInput>) =>
      edit.mutate({ id, ...fields }),
    setAvailability: (id: string, isAvailable: boolean) =>
      edit.mutate({ id, isAvailable }),
    remove: (id: string) => remove.mutate(id),
    reorder: (order: { id: string; sortOrder: number }[]) =>
      reorder.mutate(order),
    isPending: add.isPending || edit.isPending || remove.isPending,
    isRemoving: remove.isPending,
  };
}

/** The domain fields a partial API update implies, for the optimistic patch. */
function toItemPatch(fields: Partial<ItemWriteInput>) {
  const patch: Partial<MenuItem> = {};
  if (fields.name !== undefined)
    patch.name = { ar: fields.name, en: fields.name };
  if (fields.description !== undefined)
    patch.description = { ar: fields.description, en: fields.description };
  if (fields.price !== undefined) patch.price = fields.price;
  if (fields.currency !== undefined) patch.currency = fields.currency;
  if (fields.categoryId !== undefined) patch.categoryId = fields.categoryId;
  if (fields.images !== undefined) {
    patch.images = fields.images.length ? fields.images : undefined;
    patch.imageUrl = fields.images[0] ?? "";
  }
  if (fields.optionGroups !== undefined)
    patch.optionGroups = fields.optionGroups;
  if (fields.isAvailable !== undefined) patch.isAvailable = fields.isAvailable;
  if (fields.sortOrder !== undefined) patch.sortOrder = fields.sortOrder;
  return patch;
}
