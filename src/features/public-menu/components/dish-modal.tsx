"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Check, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatPrice,
  type StorefrontCopy,
} from "@/features/public-menu/lib/format";
import { trackItemCartAdd, trackItemView } from "@/features/public-menu/services";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/fmt";
import { toast } from "@/lib/toast";
import type {
  RestaurantTheme,
  CatalogItem,
  CatalogOption,
  CatalogOptionGroup,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

export function DishModal({
  item,
  businessId,
  theme,
  copy,
  onClose,
}: {
  item: CatalogItem | null;
  businessId: string;
  /**
   * The storefront palette, passed explicitly. DialogContent portals to
   * document.body, outside the element where menu-screen declares
   * --menu-primary as an inline custom property, so the variable does not
   * inherit here — re-declaring it on the panel is what makes every
   * `var(--menu-primary)` below resolve instead of silently computing to
   * nothing (which rendered the white tick on a transparent chip).
   */
  theme: RestaurantTheme;
  copy: StorefrontCopy;
  onClose: () => void;
}) {
  const { t, lang, dir } = useI18n();
  const addItem = useCartStore((s) => s.addItem);

  const [selected, setSelected] = useState<CatalogOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [api, setApi] = useState<CarouselApi>();
  const [slide, setSlide] = useState(0);

  // Reset selections whenever a different dish opens (during render, no
  // effect). Nothing starts pre-picked, required or not — a customer must
  // actively choose every option themselves, including a mandatory
  // single-select group with only one choice; `addToCart` below blocks and
  // points out whichever required group was left empty.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (item && item.id !== seededFor) {
    setSeededFor(item.id);
    setSelected([]);
    setQuantity(1);
    setSlide(0);
    // this branch runs exactly once per distinct item opened — the same
    // "once per open" the backend asks for, with no separate effect needed
    trackItemView(item.id);
  }

  // Embla owns the drag/swipe gesture; this only mirrors which slide it landed
  // on so the dots can follow. No initial read — embla starts on slide 0 and
  // so does this state.
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSlide(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (!item) return null;

  const images = (item.images?.length ? item.images : [item.imageUrl]).filter(
    (src) => src !== "",
  );
  const unitPrice =
    item.price + selected.reduce((sum, o) => sum + o.priceDelta, 0);

  const toggleOption = (group: CatalogOptionGroup, option: CatalogOption) =>
    setSelected((prev) => {
      const withoutGroup = prev.filter(
        (o) => !group.options.some((go) => go.id === o.id),
      );
      const wasSelected = prev.some((o) => o.id === option.id);
      if (group.selectionType === "single") {
        // exclusive within this group — tapping the already-picked option
        // clears the group back to nothing, same as any other option
        return wasSelected ? withoutGroup : [...withoutGroup, option];
      }
      return wasSelected
        ? prev.filter((o) => o.id !== option.id)
        : [...prev, option];
    });

  const badgeLabel =
    item.badge === "popular"
      ? copy.popular
      : item.badge === "new"
        ? copy.new
        : item.badge === "chefSpecial"
          ? copy.chefSpecial
          : null;

  const addToCart = () => {
    const missingGroup = (item.optionGroups ?? []).find(
      (group) =>
        group.required &&
        !group.options.some((option) =>
          selected.some((o) => o.id === option.id),
        ),
    );
    if (missingGroup) {
      toast.error(
        fmt(t.common.selectRequiredOption, { group: missingGroup.id }),
      );
      return;
    }
    trackItemCartAdd(item.id);
    addItem(businessId, item, selected, quantity);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        // scrollbar-none hides the bar but keeps overflow-y-auto, so the panel
        // still scrolls by wheel, touch drag and keyboard
        className="max-h-[92dvh] gap-0 overflow-x-hidden overflow-y-auto p-0 scrollbar-none sm:max-w-md"
        style={
          {
            "--menu-primary": theme.primaryColor,
            "--menu-secondary": theme.secondaryColor,
          } as React.CSSProperties
        }
      >
        <DialogHeader flush>
          <DialogTitle>{item.name[lang]}</DialogTitle>
        </DialogHeader>

        {/* image slider — embla handles touch drag natively on mobile */}
        <div className="relative">
          {images.length === 0 && (
            <div className="flex aspect-[4/3] w-full items-center justify-center bg-berry-soft text-4xl font-bold text-berry-soft-foreground">
              {item.name[lang].charAt(0)}
            </div>
          )}
          {images.length > 0 && (
          <Carousel
            opts={{ loop: images.length > 1 }}
            setApi={setApi}
            dir="ltr"
          >
            <CarouselContent className="ms-0">
              {images.map((src, index) => (
                <CarouselItem key={src} className="relative ps-0">
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={src}
                      alt={item.name[lang]}
                      fill
                      priority={index === 0}
                      sizes="(max-width: 640px) 100vw, 28rem"
                      className="object-cover"
                      draggable={false}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            {images.length > 1 && (
              <>
                {/* arrows: pointer affordance, hidden on touch where the drag
                    gesture and the dashes already carry the message */}
                <CarouselPrevious className="start-3 hidden border-0 bg-white/85 text-foreground backdrop-blur sm:inline-flex dark:bg-black/60 dark:text-white" />
                <CarouselNext className="end-3 hidden border-0 bg-white/85 text-foreground backdrop-blur sm:inline-flex dark:bg-black/60 dark:text-white" />
              </>
            )}
          </Carousel>
          )}

          {/* dashes: how many images there are, and which one you are on */}
          {images.length > 1 && (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5"
              aria-hidden
            >
              {images.map((src, index) => (
                <span
                  key={src}
                  className={cn(
                    "h-1.5 rounded-full transition-[width,background-color] duration-300 ease-smooth",
                    index === slide ? "w-6 bg-white" : "w-1.5 bg-white/55",
                  )}
                />
              ))}
            </div>
          )}

          {badgeLabel && (
            <span className="absolute start-3 top-3 rounded-full bg-zest px-3 py-1 text-xs font-bold text-zest-foreground">
              {badgeLabel}
            </span>
          )}
        </div>

        <div className="space-y-5 p-5" dir={dir}>
          <div>
            <p className="text-xl font-bold text-[var(--menu-primary)]">
              {formatPrice(item.price, item.currency ?? "SYP", lang)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.description[lang]}
            </p>
          </div>

          {item.ingredients && item.ingredients.length > 0 && (
            <div>
              <h3 className="label-eyebrow text-muted-foreground">
                {copy.ingredients}
              </h3>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {item.ingredients.map((ingredient) => (
                  <li
                    key={ingredient.en}
                    className="rounded-full bg-zest-soft px-3 py-1 text-xs font-semibold text-zest-soft-foreground"
                  >
                    {ingredient[lang]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.optionGroups?.map((group) => (
            <div key={group.id}>
              <h3 className="label-eyebrow flex items-center gap-1.5 text-muted-foreground">
                {group.id}
                {group.required && (
                  <span className="text-[var(--menu-primary)]">*</span>
                )}
              </h3>
              <ul className="mt-2.5 space-y-2">
                {group.options.map((option) => {
                  const isChecked = selected.some((o) => o.id === option.id);
                  const isSingle = group.selectionType === "single";
                  return (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => toggleOption(group, option)}
                        aria-pressed={isChecked}
                        className={cn(
                          // touch target stays at 44px so it is comfortable on
                          // a phone, where most of these are tapped
                          "flex min-h-11 w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-[background-color,border-color] duration-200 ease-smooth",
                          isChecked
                            ? "border-[var(--menu-primary)] bg-[var(--menu-primary)]/8"
                            : "border-border hover:border-[var(--menu-primary)]/40 hover:bg-surface-container-low",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center border-2 transition-[background-color,border-color] duration-200",
                            isSingle ? "rounded-full" : "rounded-md",
                            isChecked
                              ? "border-[var(--menu-primary)] bg-[var(--menu-primary)]"
                              : "border-border",
                          )}
                        >
                          {isChecked &&
                            (isSingle ? (
                              <span className="size-2 rounded-full bg-white" />
                            ) : (
                              <Check
                                className="size-3.5 text-white"
                                strokeWidth={3}
                              />
                            ))}
                        </span>
                        <span className="flex-1 text-start">{option.id}</span>
                        {group.priceMode === "absolute" ? (
                          <span className="shrink-0 text-xs font-bold text-[var(--menu-primary)]">
                            {formatPrice(
                              item.price + option.priceDelta,
                              item.currency ?? "SYP",
                              lang,
                            )}
                          </span>
                        ) : (
                          option.priceDelta > 0 && (
                            <span className="shrink-0 text-xs font-bold text-[var(--menu-primary)]">
                              +{formatPrice(option.priceDelta, item.currency ?? "SYP", lang)}
                            </span>
                          )
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* quantity + add: pinned to the foot of the scroll area, so a long
            options list never pushes the only action out of reach */}
        <div
          className="sticky bottom-0 flex items-center gap-3 border-t border-border/60 bg-popover px-5 py-4"
          dir={dir}
        >
          <div
            className="flex items-center gap-1 rounded-full bg-surface-container p-1"
            aria-label={copy.quantity}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              aria-label="-"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <Minus className="size-3.5" />
            </Button>
            <span className="w-6 text-center text-sm font-bold">
              {quantity}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              aria-label="+"
              onClick={() => setQuantity((q) => q + 1)}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>

          <button
            type="button"
            disabled={!item.isAvailable}
            onClick={addToCart}
            className="flex h-12 flex-1 transform-gpu items-center justify-between gap-2 rounded-full bg-[var(--menu-primary)] px-5 text-sm font-bold text-white transition-[scale] duration-200 ease-smooth hover:scale-[1.01] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
          >
            <span>{copy.addToCart}</span>
            <span>{formatPrice(unitPrice * quantity, item.currency ?? "SYP", lang)}</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
