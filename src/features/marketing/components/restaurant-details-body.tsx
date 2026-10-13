import { BusinessDetailsGrid } from "@/features/marketing/components/business-details-grid";
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

  return (
    <div className="container-page">
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
