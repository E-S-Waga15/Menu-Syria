"use client";

import { FadeImage } from "@/components/shared/fade-image";

import { Plus } from "lucide-react";

import {
  formatPrice,
  type StorefrontCopy,
} from "@/features/public-menu/lib/format";
import { useI18n } from "@/i18n/client";
import type { CatalogItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const badgeStyles: Record<NonNullable<CatalogItem["badge"]>, string> = {
  popular: "bg-zest text-zest-foreground",
  new: "bg-success text-success-foreground",
  chefSpecial: "bg-[var(--menu-primary)] text-white",
};

export function DishCard({
  item,
  copy,
  onAdd,
  onOpen,
}: {
  item: CatalogItem;
  copy: StorefrontCopy;
  onAdd: (item: CatalogItem) => void;
  onOpen: (item: CatalogItem) => void;
}) {
  const { t, lang } = useI18n();

  const badgeLabel =
    item.badge === "popular"
      ? copy.popular
      : item.badge === "new"
        ? copy.new
        : item.badge === "chefSpecial"
          ? copy.chefSpecial
          : null;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(item);
        }
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border/60 transform-gpu bg-card outline-none transition-[translate,scale,border-color] duration-300 ease-smooth focus-visible:ring-3 focus-visible:ring-[var(--menu-primary)]/40",
        item.isAvailable
          ? "hover:-translate-y-1 hover:border-[var(--menu-primary)]/35"
          : "opacity-60",
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {item.imageUrl ? (
          <FadeImage
            src={item.imageUrl}
            alt={item.name[lang]}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              "transform-gpu object-cover transition-transform duration-500 ease-smooth group-hover:scale-105",
              !item.isAvailable && "grayscale",
            )}
          />
        ) : (
          <span
            className={cn(
              "flex size-full items-center justify-center bg-berry-soft text-2xl font-bold text-berry-soft-foreground",
              !item.isAvailable && "grayscale",
            )}
          >
            {item.name[lang].charAt(0)}
          </span>
        )}
        {badgeLabel && item.isAvailable && (
          <span
            className={cn(
              "absolute start-2.5 top-2.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold shadow-soft",
              badgeStyles[item.badge!],
            )}
          >
            {badgeLabel}
          </span>
        )}
        {!item.isAvailable && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/35">
            <span className="rounded-full bg-card px-3.5 py-1.5 text-xs font-bold">
              {t.common.unavailable}
            </span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5 pb-4">
        <h3 className="flex-1 font-heading text-sm font-semibold leading-snug md:text-base">
          {item.name[lang]}
        </h3>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-[var(--menu-primary)] md:text-base">
            {formatPrice(item.price, item.currency ?? "SYP", lang)}
          </p>
          <button
            type="button"
            disabled={!item.isAvailable}
            onClick={(e) => {
              e.stopPropagation();
              onAdd(item);
            }}
            aria-label={`${copy.addToCart} — ${item.name[lang]}`}
            className="flex size-9 items-center justify-center rounded-full bg-[var(--menu-primary)] transform-gpu text-white transition-transform duration-200 ease-smooth hover:scale-110 active:scale-95 disabled:pointer-events-none"
          >
            <Plus className="size-4.5" />
          </button>
        </div>
      </div>
    </article>
  );
}
