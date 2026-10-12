"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHydratedSession } from "@/features/auth/use-hydrated-session";
import { RestaurantCard } from "@/features/marketing/components/restaurant-card";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type {
  Governorate,
  LocalizedText,
  Region,
  Restaurant,
  Store,
} from "@/lib/types";
import { useFavoritesStore } from "@/stores/favorites-store";

/**
 * Customer-only favorites grid — merges the favorited restaurants and
 * stores (each fetched server-side in full, then filtered here against the
 * locally-persisted `favorites-store` ids) into one grid, each card routed
 * to the right detail path for its business type.
 */
export function FavoritesList({
  restaurants,
  stores,
  governorates,
  regions,
  lang,
  t,
}: {
  restaurants: Restaurant[];
  stores: Store[];
  governorates: Governorate[];
  regions: Region[];
  lang: Locale;
  t: Dictionary;
}) {
  const router = useRouter();
  const { session, hydrated } = useHydratedSession();
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const isCustomer = session?.role === "user";

  useEffect(() => {
    if (hydrated && !isCustomer) {
      router.replace(`/${lang}/login/user`);
    }
  }, [hydrated, isCustomer, lang, router]);

  if (!hydrated || !isCustomer) return null;

  const separator = lang === "ar" ? "، " : ", ";
  const locationLabel = (item: Restaurant | Store) => {
    const gov = governorates.find((g) => g.id === item.governorateId)?.name[
      lang
    ];
    const region = regions.find((r) => r.id === item.regionId)?.name[lang];
    const base = [gov, region].filter(Boolean).join(separator);
    const category: LocalizedText | undefined =
      "category" in item
        ? item.category
        : "cuisine" in item
          ? item.cuisine
          : undefined;
    return category ? `${base} · ${category[lang]}` : base;
  };

  const favoriteRestaurants = restaurants.filter((r) =>
    favoriteIds.includes(r.id),
  );
  const favoriteStores = stores.filter((s) => favoriteIds.includes(s.id));
  const items = [...favoriteRestaurants, ...favoriteStores];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border p-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-berry-soft text-berry-soft-foreground">
          <Heart className="size-6" />
        </span>
        <p className="text-muted-foreground">{t.favorites.empty}</p>
        <Button render={<a href={`/${lang}/restaurants`} />}>
          {t.favorites.emptyCta}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <RestaurantCard
          key={item.id}
          restaurant={item}
          locationLabel={locationLabel(item)}
        />
      ))}
    </div>
  );
}
