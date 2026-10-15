import { BusinessDetailsGrid } from "@/features/marketing/components/business-details-grid";
import { ReviewsSection } from "@/features/marketing/components/reviews-section";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { recoverBusinessFields } from "@/lib/business-text";
import type {
  Business,
  Governorate,
  PublicBranch,
  Region,
  Review,
} from "@/lib/types";

export function RestaurantDetailsBody({
  restaurant,
  kind,
  reviews,
  governorateName,
  regionName,
  branches,
  regions,
  governorates,
  lang,
  t,
  showMenuCta = true,
  menuHref,
}: {
  restaurant: Business;
  /** which kind this business actually resolved as — trusted over any
   * duck-typing on the business object's own fields (see the `isStore`
   * note in `BusinessDetailsGrid`) */
  kind: "restaurant" | "store";
  reviews: Review[];
  governorateName: string;
  regionName: string;
  /** other locations this business has, for the branches panel's switcher */
  branches: PublicBranch[];
  regions: Region[];
  /** resolves a branch's own governorate, for the area quick-fact tile when
   * a branch other than the main one is selected */
  governorates: Governorate[];
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
  // a generic "منوع" default), a store to `category`. Branches on `kind`,
  // not on which of `cuisine`/`category` happens to be present on the
  // object — a stray `category` key on a restaurant's own API response
  // (even unused) would otherwise misread it as a store.
  const typeLabel =
    restaurant.subType?.name ??
    (kind === "restaurant"
      ? (restaurant as unknown as { cuisine: typeof restaurant.name }).cuisine[lang]
      : (restaurant as unknown as { category: typeof restaurant.name }).category[lang]);

  return (
    <div className="container-page">
      <BusinessDetailsGrid
        restaurant={restaurant}
        kind={kind}
        description={description}
        mainAddress={address}
        mainLocation={location}
        typeLabel={typeLabel}
        governorateName={governorateName}
        regionName={regionName}
        branches={branches}
        regions={regions}
        governorates={governorates}
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
