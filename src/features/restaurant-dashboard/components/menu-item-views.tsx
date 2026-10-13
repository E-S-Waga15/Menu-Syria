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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  /** opens the read-only customer-facing preview (grid card only) */
  onPreview: () => void;
  /** opens the dedicated option-groups modal (grid card only) */
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

export function MenuItemRow(props: MenuItemViewProps) {
  const { t, lang } = useI18n();
  const { item } = props;

  return (
    <li
      {...dragProps(props)}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 transition-[translate,scale,border-color,opacity] duration-200 ease-smooth",
        props.isDragging && "opacity-50 ring-2 ring-primary/40",
      )}
    >
      {props.draggable && (
        <GripVertical className="size-4.5 shrink-0 cursor-grab text-muted-foreground/50" />
      )}
      {item.imageUrl ? (
        <SafeImage
          src={item.imageUrl}
          alt=""
          width={56}
          height={56}
          className={cn(
            "size-14 shrink-0 rounded-xl object-cover",
            !item.isAvailable && "grayscale",
          )}
        />
      ) : (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-muted-foreground">
          <ImageOff className="size-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{item.name[lang]}</p>
        <p className="mt-0.5 text-sm font-semibold text-primary">
          {formatPrice(item.price, item.currency ?? "SYP", lang)}
        </p>
      </div>

      {/* the row itself is draggable for reordering; starting the pointer
          down here instead must not let that native drag gesture capture
          the click — stopping propagation here is what makes Switch/Edit/
          Delete reliable instead of only working every other try */}
      <div
        className="flex shrink-0 items-center gap-1.5 md:gap-3"
        onMouseDown={(e) => e.stopPropagation()}
        onDragStart={(e) => e.preventDefault()}
      >
        <label className="flex items-center gap-2">
          <span className="hidden text-xs font-semibold text-muted-foreground md:block">
            {item.isAvailable ? t.common.available : t.common.unavailable}
          </span>
          <Switch
            checked={item.isAvailable}
            onCheckedChange={props.onToggleAvailability}
            className="data-[checked]:bg-success"
          />
        </label>
        {props.draggable && (
          <div className="hidden items-center sm:flex">
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
          </div>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.dashboard.productStats}
          onClick={props.onShowStats}
        >
          <BarChart3 className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.common.edit}
          onClick={props.onEdit}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.common.delete}
          className="text-muted-foreground hover:text-destructive"
          onClick={props.onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  );
}

/**
 * Grid card: image + kebab on top (the admin console's businesses grid uses
 * the same glass-chip-over-the-photo placement for its own `RowActions`),
 * then name/price, then a bottom row for the views badge, the availability
 * switch and the reorder arrows — the PersonCard rhythm (avatar+kebab top →
 * title → badges/controls row) rather than the old icon-button strip.
 */
export function MenuItemCard(props: MenuItemViewProps) {
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
    <div
      {...dragProps(props)}
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-card transition-[translate,scale,border-color,opacity] duration-200 ease-smooth",
        props.isDragging && "opacity-50 ring-2 ring-primary/40",
      )}
    >
      <div className="relative aspect-[4/3]">
        {item.imageUrl ? (
          <SafeImage
            src={item.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className={cn("object-cover", !item.isAvailable && "grayscale")}
          />
        ) : (
          <span className="flex size-full items-center justify-center bg-surface-container-low text-muted-foreground">
            <ImageOff className="size-8" />
          </span>
        )}
        {props.draggable && (
          <GripVertical className="absolute start-2 top-2 size-4 shrink-0 cursor-grab text-white" />
        )}
        <div
          className="absolute end-2 top-2"
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
        >
          <RowActions
            actions={actions}
            triggerClassName="size-8 bg-white/80 text-foreground backdrop-blur hover:bg-white dark:bg-black/55 dark:text-white dark:hover:bg-black/75"
          />
        </div>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-bold">{item.name[lang]}</p>
        <p className="mt-0.5 text-sm font-semibold text-primary">
          {formatPrice(item.price, item.currency ?? "SYP", lang)}
        </p>
        <div
          className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5"
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.preventDefault()}
        >
          <span
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
            title={t.dashboard.viewCount}
          >
            <Eye className="size-3.5" />
            {cachedStats
              ? cachedStats.viewCount.toLocaleString(
                  lang === "ar" ? "ar-SY" : "en-US",
                )
              : "—"}
          </span>
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
      </div>
    </div>
  );
}
