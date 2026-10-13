import Image from "next/image";

import { FavoriteButton } from "@/components/shared/favorite-button";
import { Badge } from "@/components/ui/badge";
import { BusinessDetailsGrid } from "@/features/marketing/components/business-details-grid";
import { BusinessShareActions } from "@/features/marketing/components/business-share-actions";
import { ReviewsSection } from "@/features/marketing/components/reviews-section";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { recoverBusinessFields } from "@/lib/business-text";
import type { Business, PublicBranch, Region, Review } from "@/lib/types";

export function RestaurantDetailsBody({
  restaurant,
  reviews,
  governorateName,
  regionName,
  branches,
  regions,
  lang,
  t,
  showMenuCta = true,
  menuHref,
}: {
  restaurant: Business;
  reviews: Review[];
  governorateName: string;
  regionName: string;
  /** other locations this business has, for the branches panel's switcher */
  branches: PublicBranch[];
  regions: Region[];
  lang: Locale;
  t: Dictionary;
  showMenuCta?: boolean;
  /** override the CTA destination */
  menuHref?: string;
}) {
  const separator = lang === "ar" ? "، " : ", ";

  // a request approved before the backend had dedicated columns for these
  // left its logo/colors/address/location dumped as text inside
  // `description` — recovered here so a visitor never sees that raw dump,
  // and the map falls back to the business's real pin instead of Damascus
  // -center when the actual `address`/`location` columns were never filled
  const recovered = recoverBusinessFields(restaurant.description[lang]);
  const description = recovered.description;
  const address = restaurant.address[lang] || recovered.address || "";
  const location = recovered.location ?? restaurant.location;

  // the one field that tells a visitor *what* this place sells — the real
  // sub-type the owner picked (e.g. "مطعم إيطالي") when the business has
  // one; a restaurant without one falls back to `cuisine` (free text, often
  // a generic "منوع" default), a store to `category`
  const typeLabel =
    restaurant.subType?.name ??
    ("cuisine" in restaurant
      ? (restaurant as { cuisine: typeof restaurant.name }).cuisine[lang]
      : "category" in restaurant
        ? (restaurant as { category: typeof restaurant.name }).category[lang]
        : null);

  const areaLabel =
    governorateName || regionName
      ? [governorateName, regionName].filter(Boolean).join(separator)
      : null;

  return (
    <div className="container-page">
      {/* identity bar — sits mostly below the gallery so nothing is cropped */}
      {/* The row is bottom-aligned, so whichever child is taller sets how far
          the logo sits from the gallery. Keeping the badge on the name's line
          (below) shortens the text block back under the logo's height, which
          is what lets the mark ride up into the photo on a phone the way it
          already did on desktop. */}
      <div className="relative -mt-8 flex flex-wrap items-end gap-4 md:-mt-8 md:gap-5">
        <Image
          src={restaurant.logoUrl}
          alt=""
          width={120}
          height={120}
          className="size-28 rounded-2xl border-4 border-background object-cover md:size-32"
        />
        <div className="flex-1 pt-6 pb-1 md:pt-10">
          {/* only "open now" lives beside the name — the business's type,
              area and rating moved to their own cards/tiles below, so this
              row doesn't repeat what a tile right underneath already says */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <h1 className="text-display text-2xl md:text-4xl">
              {restaurant.name[lang]}
            </h1>
            <Badge
              className={
                restaurant.isOpen
                  ? "shrink-0 bg-success/10 px-2 py-0.5 text-[11px] text-success md:px-2.5 md:text-xs"
                  : "shrink-0 bg-muted px-2 py-0.5 text-[11px] text-muted-foreground md:px-2.5 md:text-xs"
              }
            >
              <span
                className={`me-1 size-1.5 rounded-full ${restaurant.isOpen ? "bg-success" : "bg-muted-foreground"}`}
              />
              {restaurant.isOpen
                ? t.restaurant.openNow
                : t.restaurant.closedNow}
            </Badge>
          </div>
        </div>

        {/* favorite + share/QR, grouped beside the identity bar rather than
            buried in a panel — these are actions a visitor reaches for
            immediately, not after reading. All three round buttons share
            one size so the row reads as one control cluster. */}
        <div className="flex items-center gap-2 self-end pb-1">
          <FavoriteButton
            itemId={restaurant.id}
            itemName={restaurant.name[lang]}
            size="lg"
          />
          <BusinessShareActions
            businessName={restaurant.name[lang]}
            businessLocation={areaLabel ?? undefined}
            businessPhotoUrl={restaurant.logoUrl}
          />
        </div>
      </div>

      <BusinessDetailsGrid
        restaurant={restaurant}
        description={description}
        mainAddress={address}
        mainLocation={location}
        typeLabel={typeLabel}
        governorateName={governorateName}
        regionName={regionName}
        branches={branches}
        regions={regions}
        reviewCount={reviews.length}
        showMenuCta={showMenuCta}
        menuHref={menuHref}
        lang={lang}
        t={t}
      />

      <ReviewsSection reviews={reviews} lang={lang} t={t} />
    </div>
  );
}
