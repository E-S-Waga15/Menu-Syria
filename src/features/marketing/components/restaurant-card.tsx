"use client";

import { FadeImage } from "@/components/shared/fade-image";
import Link from "next/link";
import { useState } from "react";

import { MapPin, Star, Store } from "lucide-react";

import { FavoriteButton } from "@/components/shared/favorite-button";
import { useI18n } from "@/i18n/client";
import type { Business } from "@/lib/types";

export function RestaurantCard({
  restaurant,
  locationLabel,
  href,
}: {
  restaurant: Business;
  locationLabel: string;
  /** defaults to the restaurant details page */
  href?: string;
}) {
  const { lang } = useI18n();

  const [failed, setFailed] = useState(false);
  const cover = failed
    ? undefined
    : (restaurant.coverImages[0] ?? restaurant.logoUrl);

  return (
    <article className="group relative transform-gpu overflow-hidden rounded-2xl border border-border/60 bg-card transition-[translate,scale,border-color] duration-300 ease-smooth hover:-translate-y-1 hover:border-primary/35">
      <Link
        href={href ?? `/${lang}/${restaurant.slug}`}
        className="block outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="relative aspect-[8/3] overflow-hidden">
          {cover ? (
            <FadeImage
              src={cover}
              alt={restaurant.name[lang]}
              fill
              sizes="(max-width: 640px) 75vw, (max-width: 1024px) 50vw, 33vw"
              onError={() => setFailed(true)}
              className="transform-gpu object-cover transition-transform duration-500 ease-smooth group-hover:scale-105"
            />
          ) : (
            <span className="flex size-full items-center justify-center bg-berry-soft text-berry-soft-foreground">
              <Store className="size-8" />
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          {/* glass rating chip */}
          <span className="absolute bottom-2.5 start-2.5 flex items-center gap-1.5 rounded-full border border-white/25 bg-white/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
            <Star className="size-3.5 fill-zest text-zest" />
            {restaurant.rating}
          </span>
        </div>

        <div className="p-3">
          <h3 className="truncate font-heading text-sm font-bold">
            {restaurant.name[lang]}
          </h3>
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            {locationLabel}
          </p>
        </div>
      </Link>

      <FavoriteButton
        itemId={restaurant.id}
        itemName={restaurant.name[lang]}
        size="sm"
        className="absolute end-2.5 top-2.5"
      />
    </article>
  );
}
