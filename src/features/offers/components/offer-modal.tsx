"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { CalendarClock, Check } from "lucide-react";

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
import { offerAsCatalogItem, offerDiscount } from "@/features/offers/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
import type { Offer, OfferBadge, RestaurantTheme } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

/**
 * An offer, opened from the storefront strip.
 *
 * Deliberately the same shape as <DishModal /> — gallery on top, details
 * below, one committing action at the bottom — because to a customer an offer
 * is another thing on the menu, not a different kind of screen. What it adds
 * is the pair of prices and the bundle contents, which are the whole reason
 * to look at it.
 */
export function OfferModal({
  offer,
  businessId,
  theme,
  onClose,
}: {
  offer: Offer | null;
  businessId: string;
  /**
   * The storefront palette, passed explicitly for the same reason DishModal
   * takes it: DialogContent portals to document.body, outside the element
   * where menu-screen declares --menu-primary, so it has to be re-declared
   * here or every `var(--menu-primary)` below resolves to nothing.
   */
  theme: RestaurantTheme;
  onClose: () => void;
}) {
  const { t, lang, dir } = useI18n();
  const addItem = useCartStore((s) => s.addItem);

  const [api, setApi] = useState<CarouselApi>();
  const [slide, setSlide] = useState(0);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  // reset the gallery when a different offer opens (during render, no effect)
  if (offer && offer.id !== seededFor) {
    setSeededFor(offer.id);
    setSlide(0);
  }

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSlide(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (!offer) return null;

  const images = offer.images.length ? offer.images : [];
  const discount = offerDiscount(offer);

  const badgeLabel: Record<OfferBadge, string> = {
    limited: t.offers.badgeLimited,
    bestValue: t.offers.badgeBestValue,
    new: t.offers.badgeNew,
  };

  const order = () => {
    addItem(businessId, offerAsCatalogItem(offer), [], 1);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="scrollbar-none max-h-[92dvh] gap-0 overflow-x-hidden overflow-y-auto p-0 sm:max-w-md"
        style={
          {
            "--menu-primary": theme.primaryColor,
            "--menu-secondary": theme.secondaryColor,
          } as React.CSSProperties
        }
      >
        <DialogHeader flush>
          <DialogTitle>{offer.name[lang]}</DialogTitle>
        </DialogHeader>

        {images.length > 0 && (
          <div className="relative">
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
                        alt={offer.name[lang]}
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
                  <CarouselPrevious className="start-3 hidden border-0 bg-white/85 text-foreground backdrop-blur sm:inline-flex dark:bg-black/60 dark:text-white" />
                  <CarouselNext className="end-3 hidden border-0 bg-white/85 text-foreground backdrop-blur sm:inline-flex dark:bg-black/60 dark:text-white" />
                </>
              )}
            </Carousel>

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

            {offer.badge && (
              <span className="absolute start-3 top-3 rounded-full bg-zest px-3 py-1 text-xs font-bold text-zest-foreground">
                {badgeLabel[offer.badge]}
              </span>
            )}

            {discount > 0 && (
              <span className="absolute end-3 top-3 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-white">
                {fmt(t.offers.discount, { percent: discount })}
              </span>
            )}
          </div>
        )}

        <div className="space-y-5 p-5" dir={dir}>
          <div>
            {/* no `dir` override — see offer-card.tsx's own note: forcing
                ltr here is what put the currency in front of the number */}
            <p className="flex items-baseline gap-2.5">
              <span className="font-heading text-2xl font-bold text-[var(--menu-primary)]">
                {formatPrice(offer.price, t.common.currency)}
              </span>
              {offer.originalPrice > offer.price && (
                <span className="text-sm font-semibold text-muted-foreground line-through">
                  {formatPrice(offer.originalPrice, t.common.currency)}
                </span>
              )}
            </p>

            {offer.description[lang] && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {offer.description[lang]}
              </p>
            )}
          </div>

          {offer.includes.length > 0 && (
            <div>
              <h3 className="label-eyebrow text-muted-foreground">
                {t.offers.includesTitle}
              </h3>
              <ul className="mt-3 space-y-2.5">
                {offer.includes.map((line) => (
                  <li
                    key={line.en}
                    className="flex items-start gap-2.5 text-sm font-semibold"
                  >
                    <span className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-[var(--menu-primary)] text-white">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    {line[lang]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3.5 py-2.5 text-xs font-semibold text-muted-foreground">
            <CalendarClock className="size-3.5 shrink-0" />
            {offer.endsAt
              ? fmt(t.offers.validUntil, { date: offer.endsAt })
              : t.offers.noEndDate}
          </p>
        </div>

        {/* sticky so the action stays reachable however long the bundle list */}
        <div className="sticky bottom-0 border-t border-border/60 bg-background/95 p-4 backdrop-blur-xl">
          <Button
            onClick={order}
            className="h-12 w-full bg-[var(--menu-primary)] text-base font-bold text-white hover:opacity-90"
          >
            {t.offers.orderOffer}
            <span className="ms-auto">
              {formatPrice(offer.price, t.common.currency)}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
