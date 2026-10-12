"use client";

import { useEffect, useState } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { SafeImage } from "@/components/shared/safe-image";
import { OfferCard } from "@/features/offers/components/offer-card";
import type { FeaturedOffer } from "@/features/offers/services";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Five seconds a slide — the same interval the storefront gallery uses, and
 * the one the big marketplaces settle on: long enough to read a banner, short
 * enough that the set turns over while someone is still on the page.
 */
const SLIDE_MS = 5000;

/**
 * The platform's offers, as an advertising banner.
 *
 * One slide at a time on a phone, two on a tablet, three on a desktop — the
 * card keeps its proportions and the carousel changes how many fit, which is
 * why a phone still sees every offer instead of a cropped first one.
 *
 * It advances on its own because on a phone only one banner is visible and a
 * static one would hide the rest. It stands down the moment someone touches,
 * hovers or tabs into it: a carousel that moves under a pointer feels broken.
 * There are no arrow buttons — drag, wheel and the dots already cover it.
 */
export function OfferBanner({ offers }: { offers: FeaturedOffer[] }) {
  const { lang, dir } = useI18n();
  const [api, setApi] = useState<CarouselApi>();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  const many = offers.length > 1;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSlide(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || !many || paused) return;
    const id = window.setInterval(() => api.scrollNext(), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [api, many, paused]);

  return (
    // no outer margin: the section that places the banner owns its spacing
    <div>
      <Carousel
        /**
         * Embla derives its slide geometry from the element's own layout
         * direction, so `direction` here has to agree with the DOM. Forcing
         * `dir="ltr"` on the element while telling Embla "rtl" made it
         * translate the rail the wrong way: the last two offers could never be
         * reached, and every dot landed back on the first three.
         */
        opts={{ loop: many, align: "start", direction: dir }}
        setApi={setApi}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onPointerDown={() => setPaused(true)}
      >
        <CarouselContent className="-ms-4">
          {offers.map(({ offer, business }) => {
            const href = `/${lang}/${business.slug}/menu`;

            return (
              <CarouselItem
                key={offer.id}
                /**
                 * A phone shows one card and a tenth of the next: just enough
                 * cut-off edge to say the rail continues, without spending
                 * width the photograph needs. Two across from `sm`, three from
                 * `xl`, and the rail advances one card at a time throughout.
                 */
                className="ps-4 basis-[90%] sm:basis-1/2 xl:basis-1/3"
              >
                <OfferCard
                  offer={offer}
                  href={href}
                  eager
                  footnote={
                    // whose offer it is, directly under its name
                    <span className="flex items-center gap-1.5">
                      {typeof business.logoUrl === "string" &&
                        business.logoUrl.trim() && (
                        <SafeImage
                          src={business.logoUrl}
                          alt=""
                          width={20}
                          height={20}
                          draggable={false}
                          className="size-5 shrink-0 rounded-full border border-white/30 object-cover"
                        />
                      )}
                      <span className="truncate text-xs font-semibold text-white/80">
                        {business.name[lang]}
                      </span>
                    </span>
                  }
                />
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {/* position, and a way to jump — the only control the banner needs */}
      {many && (
        <div className="mt-4 flex justify-center gap-1.5">
          {offers.map(({ offer }, index) => (
            <button
              key={offer.id}
              type="button"
              aria-label={offer.name[lang]}
              aria-current={index === slide}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "h-1.5 cursor-pointer rounded-full transition-[width,background-color] duration-300 ease-smooth",
                index === slide
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-border hover:bg-muted-foreground",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
