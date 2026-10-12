import Image from "next/image";
import Link from "next/link";

import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Restaurant } from "@/lib/types";

function MarqueeRow({
  restaurants,
  lang,
  ariaHidden = false,
}: {
  restaurants: Restaurant[];
  lang: Locale;
  ariaHidden?: boolean;
}) {
  return (
    <div
      aria-hidden={ariaHidden || undefined}
      className="flex w-max shrink-0 transform-gpu animate-marquee items-center gap-12 pe-12 will-change-transform group-hover:[animation-play-state:paused] motion-reduce:animate-none"
    >
      {restaurants.map((restaurant) => (
        <Link
          key={restaurant.id}
          href={`/${lang}/${restaurant.slug}`}
          tabIndex={ariaHidden ? -1 : undefined}
          className="flex items-center gap-3 opacity-50 grayscale transition-[opacity,filter] duration-300 hover:opacity-100 hover:grayscale-0"
        >
          {restaurant.logoUrl ? (
            <Image
              src={restaurant.logoUrl}
              alt=""
              width={44}
              height={44}
              className="size-11 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-berry-soft text-xs font-bold uppercase text-berry-soft-foreground">
              {restaurant.name[lang].charAt(0)}
            </span>
          )}
          <span className="whitespace-nowrap font-heading text-lg font-semibold">
            {restaurant.name[lang]}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function RestaurantsMarquee({
  lang,
  t,
  restaurants,
}: {
  lang: Locale;
  t: Dictionary;
  restaurants: Restaurant[];
}) {
  return (
    <section
      id="restaurants"
      className="scroll-mt-20 border-y border-border/60 bg-surface-container-low py-12 dark:bg-surface-container-low"
    >
      <div className="container-page mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-eyebrow text-primary">
            {t.home.restaurantsEyebrow}
          </p>
          <h2 className="text-display mt-2 text-2xl md:text-3xl">
            {t.home.restaurantsTitle}
          </h2>
        </div>
      </div>

      {/* infinite marquee — duplicated row creates the seamless loop */}
      <div
        className="group flex overflow-hidden"
        style={{ "--marquee-gap": "3rem" } as React.CSSProperties}
        dir="ltr"
      >
        <MarqueeRow restaurants={restaurants} lang={lang} />
        <MarqueeRow restaurants={restaurants} lang={lang} ariaHidden />
      </div>
    </section>
  );
}
