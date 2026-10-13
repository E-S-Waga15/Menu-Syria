"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Eye,
  GripVertical,
  ImageOff,
  Pencil,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { RowActions, type RowAction } from "@/components/shared/row-actions";
import { SafeImage } from "@/components/shared/safe-image";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/features/public-menu/lib/format";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ItemStatistics, MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/** everything a row or card needs; the parent owns the data and the actions */
export interface MenuItemViewProps {
  item: MenuItem;
  /** false while the list is filtered — order is only meaningful in one
   * category, so the handle and arrows are hidden rather than lying about
   * what they do */
  draggable: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDrop: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleAvailability: (value: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onShowStats: () => void;
  /** opens the read-only customer-facing preview */
  onPreview: () => void;
  /** opens the dedicated option-groups modal */
  onEditOptions: () => void;
}

/** shared drag wiring, so the row and the card cannot drift apart */
function dragProps(p: MenuItemViewProps) {
  return p.draggable
    ? {
        draggable: true,
        onDragStart: p.onDragStart,
        onDragOver: (e: React.DragEvent) => e.preventDefault(),
        onDrop: p.onDrop,
      }
    : {};
}

/**
 * The one item entry, shared by the list and the grid alike — only the
 * container around it differs (a full-width `<li>` vs a tile `<div>`).
 * Circular avatar + kebab on top, name/price below, then a bordered footer
 * row with the views badge, the reorder arrows and the availability switch
 * — the same rhythm as the admin console's PersonCard-style cards
 * (`users-list.tsx`), rather than a banner photo with icon buttons.
 */
function ItemEntryBody(props: MenuItemViewProps) {
  const { t, lang } = useI18n();
  const { item } = props;
  const queryClient = useQueryClient();

  // Reuses whatever `ItemStatsModal` already cached for this item instead of
  // firing a second request per card — a grid of 20 cards would otherwise be
  // 20 extra calls to an endpoint the backend may not even have deployed yet.
  // No cache entry (never opened) means no number is shown, same honest
  // degradation `ItemStatsModal` itself uses for a missing endpoint.
  const cachedStats = queryClient.getQueryData<ItemStatistics | undefined>(
    queryKeys.statistics.item(item.id),
  );

  // Stats/options/edit also sit as their own tappable icons in the footer
  // row (one tap instead of two), but the kebab keeps the full set — some
  // owners reach for the menu out of habit, and it should never show less
  // than what the card itself can do.
  const actions: RowAction[] = [
    { label: t.dashboard.viewProduct, icon: Eye, onSelect: props.onPreview },
    {
      label: t.dashboard.productStats,
      icon: BarChart3,
      onSelect: props.onShowStats,
    },
    { label: t.common.edit, icon: Pencil, onSelect: props.onEdit },
    {
      label: t.dashboard.itemOptionsAction,
      icon: SlidersHorizontal,
      onSelect: props.onEditOptions,
    },
    {
      label: t.common.delete,
      icon: Trash2,
      onSelect: props.onDelete,
      danger: true,
    },
  ];

  return (
    <>
      <div className="flex items-start gap-3">
        {props.draggable && (
          <GripVertical className="mt-3.5 size-4 shrink-0 cursor-grab text-muted-foreground/40" />
        )}
        {item.imageUrl ? (
          <SafeImage
            src={item.imageUrl}
            alt=""
            width={56}
            height={56}
            className={cn(
              "size-14 shrink-0 rounded-full border border-border/60 object-cover",
              !item.isAvailable && "grayscale",
            )}
          />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border/60 bg-surface-container-low text-muted-foreground">
            <ImageOff className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1 pt-1">
          <p className="truncate text-sm font-bold">{item.name[lang]}</p>
          <p className="mt-0.5 text-sm font-semibold text-primary">
            {formatPrice(item.price, item.currency ?? "SYP", lang)}
          </p>
        </div>
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
        >
          <RowActions actions={actions} />
        </div>
      </div>

      <div
        className="mt-3 flex flex-wrap items-center justify-between gap-y-2 border-t border-border/60 pt-2.5"
        onMouseDown={(e) => e.stopPropagation()}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="flex items-center gap-0.5">
          <span
            className="flex items-center gap-1 px-1.5 text-xs font-semibold text-muted-foreground"
            title={t.dashboard.viewCount}
          >
            <Eye className="size-3.5" />
            {cachedStats
              ? cachedStats.viewCount.toLocaleString(
                  lang === "ar" ? "ar-SY" : "en-US",
                )
              : "—"}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.dashboard.productStats}
            title={t.dashboard.productStats}
            onClick={props.onShowStats}
          >
            <BarChart3 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.dashboard.itemOptionsAction}
            title={t.dashboard.itemOptionsAction}
            onClick={props.onEditOptions}
          >
            <SlidersHorizontal className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.common.edit}
            title={t.common.edit}
            onClick={props.onEdit}
          >
            <Pencil className="size-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {props.draggable && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={!props.canMoveUp}
                aria-label={t.dashboard.moveUp}
                onClick={props.onMoveUp}
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={!props.canMoveDown}
                aria-label={t.dashboard.moveDown}
                onClick={props.onMoveDown}
              >
                <ArrowDown className="size-3.5" />
              </Button>
            </>
          )}
          <Switch
            checked={item.isAvailable}
            onCheckedChange={props.onToggleAvailability}
            className="data-[checked]:bg-success"
          />
        </div>
      </div>
    </>
  );
}

export function MenuItemRow(props: MenuItemViewProps) {
  return (
    <li
      {...dragProps(props)}
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-3.5 transition-[translate,scale,border-color,opacity] duration-200 ease-smooth",
        props.isDragging && "opacity-50 ring-2 ring-primary/40",
      )}
    >
      <ItemEntryBody {...props} />
    </li>
  );
}

export function MenuItemCard(props: MenuItemViewProps) {
  return (
    <div
      {...dragProps(props)}
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-3.5 transition-[translate,scale,border-color,opacity] duration-200 ease-smooth",
        props.isDragging && "opacity-50 ring-2 ring-primary/40",
      )}
    >
      <ItemEntryBody {...props} />
    </div>
  );
}
