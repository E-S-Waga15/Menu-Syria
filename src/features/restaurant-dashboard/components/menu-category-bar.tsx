"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { CategoryManager } from "@/features/restaurant-dashboard/components/category-manager";
import { useI18n } from "@/i18n/client";
import type { MenuCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

/** the "no category picked" sentinel — everything, across categories */
export const ALL_CATEGORIES = "all";

/**
 * The catalogue's navigation half: what the sections are, and how to narrow
 * them. Sits above the item list.
 *
 * Search comes before the pills because it is the shortcut past them — with a
 * name in hand you should never have to remember which section holds it. The
 * pills stay live while searching, so a query can still be scoped to one
 * section rather than always sweeping the whole catalogue.
 */
export function MenuCategoryBar({
  categories,
  activeCategory,
  onCategoryChange,
  query,
  onQueryChange,
  itemCountFor,
  totalCount,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onReorderCategoryCommit,
}: {
  categories: MenuCategory[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  itemCountFor: (categoryId: string) => number;
  totalCount: number;
  onAddCategory: (name: string) => Promise<unknown> | void;
  onRenameCategory: (id: string, name: string) => Promise<unknown> | void;
  onDeleteCategory: (id: string) => Promise<unknown> | void;
  onReorderCategoryCommit: (orderedIds: string[]) => Promise<unknown> | void;
}) {
  const { t, lang } = useI18n();

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  const pills = [
    { id: ALL_CATEGORIES, label: t.dashboard.allCategories, count: totalCount },
    ...sorted.map((category) => ({
      id: category.id,
      label: category.name[lang],
      count: itemCountFor(category.id),
    })),
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-bold">
          {t.dashboard.categories}
        </h2>
        <CategoryManager
          labelled
          categories={categories}
          itemCountFor={itemCountFor}
          onAdd={onAddCategory}
          onRename={onRenameCategory}
          onDelete={onDeleteCategory}
          onReorderCommit={onReorderCategoryCommit}
        />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t.dashboard.searchItems}
          aria-label={t.dashboard.searchItems}
          className="h-11 rounded-full ps-10"
        />
      </div>

      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {pills.map((pill) => {
          const isActive = pill.id === activeCategory;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => onCategoryChange(pill.id)}
              aria-pressed={isActive}
              className={cn(
                "flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container text-foreground/70 hover:bg-surface-container-high",
              )}
            >
              {pill.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  isActive ? "bg-white/20" : "bg-background/70",
                )}
              >
                {pill.count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
