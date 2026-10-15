"use client";

import Image from "next/image";
import { Camera } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Five seconds a slide — long enough to read a photo, short enough that the
 * set turns over while someone is still on the page. It is the interval the
 * big storefronts settle on, and it holds up here for the same reason.
 */
const SLIDE_MS = 5000;

export function RestaurantGallery({ images }: { images: string[] }) {
  const { dir } = useI18n();
  const [api, setApi] = useState<CarouselApi>();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  const many = images.length > 1;

  // mirror embla's position so the dashes can follow it. No initial read:
  // embla starts on slide 0 and so does this state.
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSlide(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Advance on a timer, and stand down while the visitor is interacting —
  // a carousel that moves under a pointer mid-drag feels broken.
  useEffect(() => {
    if (!api || !many || paused) return;
    const id = window.setInterval(() => api.scrollNext(), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [api, many, paused]);

  // no photos uploaded yet — a flat hero reads better than an empty slider
  if (images.length === 0) {
    return (
      <div className="relative flex h-[32vh] w-full items-center justify-center overflow-hidden rounded-2xl bg-berry-soft text-berry-soft-foreground md:h-[56vh]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
          className="size-16"
        >
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
      </div>
    );
  }

  return (
    <Carousel
      opts={{ loop: true, direction: dir }}
      setApi={setApi}
      dir="ltr"
      className="group relative overflow-hidden rounded-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onPointerDown={() => setPaused(true)}
    >
      <CarouselContent className="ms-0">
        {images.map((src, index) => (
          <CarouselItem key={src} className="relative ps-0">
            <div className="relative h-[32vh] w-full md:h-[56vh]">
              <Image
                src={src}
                alt=""
                fill
                // `priority` is deprecated as of Next 16 in favor of
                // `preload` — this version warns (and apparently can fail
                // to render) if `priority`/`preload` and `loading` are
                // both passed across sibling images the way this carousel
                // needs, so index 0 preloads and every other slide eager-
                // loads, never both on the same element.
                {...(index === 0 ? { preload: true } : { loading: "eager" })}
                // every slide but the first otherwise lazy-loads — but a
                // carousel slide sits off-screen via a CSS transform inside
                // an overflow-hidden track, not outside the viewport, so
                // next/image's intersection-observer-based lazy load never
                // fires for it: the slot becomes reachable but stays blank
                // forever. Eager-loading every slide (the carousel itself
                // already gates what's actually shown) fixes that.
                sizes="100vw"
                className="object-cover"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-black/20" />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      {many && (
        <>
          {/* arrows stay visible: hiding them until hover left no sign that
              there was anything to move through, and no sign at all on touch */}
          <CarouselPrevious className="start-4 size-10 border-0 bg-white/85 text-foreground backdrop-blur hover:bg-white dark:bg-black/55 dark:text-white dark:hover:bg-black/75" />
          <CarouselNext className="end-4 size-10 border-0 bg-white/85 text-foreground backdrop-blur hover:bg-white dark:bg-black/55 dark:text-white dark:hover:bg-black/75" />

          {/* photo count — pinned to the bottom corner, opposite end from the
              centred dot-pagination strip below, so neither competes with
              the identity bar that overlaps the gallery just below */}
          <div className="absolute start-4 bottom-4 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <Camera className="size-3.5" />
            <span dir="ltr">
              {slide + 1}/{images.length}
            </span>
          </div>

          {/* dashes: how many photos there are, and which one is showing */}
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
            {images.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => api?.scrollTo(index)}
                aria-label={`${index + 1}/${images.length}`}
                aria-current={index === slide ? "true" : undefined}
                className={cn(
                  "h-1.5 cursor-pointer rounded-full transition-[width,background-color] duration-300 ease-smooth",
                  index === slide
                    ? "w-7 bg-white"
                    : "w-2 bg-white/55 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        </>
      )}
    </Carousel>
  );
}
