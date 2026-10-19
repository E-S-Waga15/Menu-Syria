"use client";

import Image from "next/image";
import Link from "next/link";

import { Search, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
 *
 * Category CRUD/reorder/photo editing all live on their own page now (too
 * much to usefully fit in a popup over the item list) — this bar only reads
 * `categories` to render the pills and links out to it.
 */
export function MenuCategoryBar({
  categories,
  activeCategory,
  onCategoryChange,
  query,
  onQueryChange,
  itemCountFor,
  totalCount,
}: {
  categories: MenuCategory[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  itemCountFor: (categoryId: string) => number;
  totalCount: number;
}) {
  const { t, lang } = useI18n();

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  const pills = [
    {
      id: ALL_CATEGORIES,
      label: t.dashboard.allCategories,
      count: totalCount,
      imageUrl: undefined as string | undefined,
    },
    ...sorted.map((category) => ({
      id: category.id,
      label: category.name[lang],
      count: itemCountFor(category.id),
      imageUrl: category.imageUrl,
    })),
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg font-bold">
          {t.dashboard.categories}
        </h2>
        <Button
          variant="outline"
          render={<Link href={`/${lang}/dashboard/menu/categories`} />}
        >
          <Settings2 className="size-4" />
          {t.dashboard.manageCategories}
        </Button>
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
                "flex shrink-0 cursor-pointer items-center gap-2 rounded-full py-2 pe-4 ps-2 text-sm font-semibold transition-colors duration-200",
                !pill.imageUrl && "ps-4",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container text-foreground/70 hover:bg-surface-container-high",
              )}
            >
              {pill.imageUrl && (
                <Image
                  unoptimized
                  src={pill.imageUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 shrink-0 rounded-full object-cover"
                />
              )}
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
