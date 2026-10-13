"use client";

import { ImageOff } from "lucide-react";

import { SafeImage } from "@/components/shared/safe-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/features/public-menu/lib/format";
import { useI18n } from "@/i18n/client";
import type { MenuItem } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A read-only look at the item the way a customer sees it, opened from the
 * item card's kebab menu ("عرض المنتج / View product").
 *
 * This is a lightweight stand-in for the storefront's own `DishModal` rather
 * than a reuse of it: that component needs a cart store, a resolved
 * `RestaurantTheme`/`StorefrontCopy` pair, and fires real view/cart-add
 * analytics on open — none of which make sense for an owner previewing their
 * own catalogue from the dashboard (there is no cart to add to, no public
 * theme context mounted here, and a preview should not inflate the item's
 * own view count). A small read-only modal that mirrors the same information
 * — images, price, description, ingredients, option groups — avoids faking
 * a cart/theme context just to reuse a component built for a different job.
 */
export function ItemPreviewModal({
  item,
  open,
  onOpenChange,
}: {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { lang, dir } = useI18n();

  if (!item) return null;

  const images = (item.images?.length ? item.images : [item.imageUrl]).filter(
    (src) => src !== "",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] gap-0 overflow-y-auto p-0 scrollbar-none sm:max-w-md">
        <DialogHeader flush>
          <DialogTitle>{item.name[lang]}</DialogTitle>
        </DialogHeader>

        {images.length > 0 ? (
          <div className="relative aspect-[4/3] w-full">
            <SafeImage
              src={images[0]!}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 28rem"
              className={cn("object-cover", !item.isAvailable && "grayscale")}
            />
          </div>
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center bg-surface-container-low text-muted-foreground">
            <ImageOff className="size-8" />
          </div>
        )}

        <div className="space-y-4 p-5" dir={dir}>
          <div>
            <p className="text-lg font-bold text-primary">
              {formatPrice(item.price, item.currency ?? "SYP", lang)}
            </p>
            {item.description[lang] && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description[lang]}
              </p>
            )}
          </div>

          {item.ingredients && item.ingredients.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {item.ingredients.map((ingredient) => (
                <li
                  key={ingredient.en}
                  className="rounded-full bg-zest-soft px-3 py-1 text-xs font-semibold text-zest-soft-foreground"
                >
                  {ingredient[lang]}
                </li>
              ))}
            </ul>
          )}

          {item.optionGroups?.map((group) => (
            <div key={group.id}>
              <h3 className="label-eyebrow flex items-center gap-1.5 text-muted-foreground">
                {group.id}
                {group.required && <span className="text-primary">*</span>}
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {group.options.map((option) => (
                  <li
                    key={option.id}
                    className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
                  >
                    {option.id}
                    {group.selectionType === "single"
                      ? ` · ${formatPrice(item.price + option.priceDelta, item.currency ?? "SYP", lang)}`
                      : option.priceDelta > 0
                        ? ` · +${formatPrice(option.priceDelta, item.currency ?? "SYP", lang)}`
                        : ""}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
