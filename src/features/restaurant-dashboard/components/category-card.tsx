"use client";

import {
  ArrowDown,
  ArrowUp,
  ImageOff,
  Package,
  Pencil,
  Trash2,
} from "lucide-react";

import { RowActions, type RowAction } from "@/components/shared/row-actions";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import type { MenuCategory } from "@/lib/types";

/**
 * One category entry — same card rhythm as `MenuItemCard` (avatar + kebab on
 * top, a bordered footer row below), so a category and a product read as the
 * same kind of thing on screen. The footer's badge is the item count rather
 * than a view count — categories aren't viewed on their own.
 */
export function CategoryCard({
  category,
  itemCount,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: {
  category: MenuCategory;
  itemCount: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, lang } = useI18n();

  const actions: RowAction[] = [
    { label: t.common.edit, icon: Pencil, onSelect: onEdit },
    { label: t.common.delete, icon: Trash2, onSelect: onDelete, danger: true },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3.5">
      <div className="flex items-start gap-3">
        {category.imageUrl ? (
          <SafeImage
            unoptimized
            src={category.imageUrl}
            alt=""
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-full border border-border/60 object-cover"
          />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface-container-low text-muted-foreground">
            <ImageOff className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1 pt-1">
          <p className="truncate text-sm font-bold">{category.name[lang]}</p>
        </div>
        <RowActions actions={actions} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-y-2 border-t border-border/60 pt-2.5">
        <span
          className="flex items-center gap-1 px-1.5 text-xs font-semibold text-muted-foreground"
          title={t.dashboard.categoryItemCount}
        >
          <Package className="size-3.5" />
          {itemCount.toLocaleString("en-US")}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canMoveUp}
            aria-label={t.dashboard.moveUp}
            onClick={onMoveUp}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canMoveDown}
            aria-label={t.dashboard.moveDown}
            onClick={onMoveDown}
          >
            <ArrowDown className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
