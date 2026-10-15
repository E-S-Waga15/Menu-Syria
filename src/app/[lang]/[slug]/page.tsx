import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RestaurantDetailsBody } from "@/features/marketing/components/restaurant-details-body";
import { RestaurantGallery } from "@/features/marketing/components/restaurant-gallery";
import {
  getGovernorates,
  getRegions,
  getRestaurantBySlug,
  getRestaurantReviews,
} from "@/features/marketing/services";
import { getStoreBySlug } from "@/features/public-store/services";
import { BackToMenuBar } from "@/features/public-menu/components/back-to-menu-bar";
import { isLocale } from "@/i18n/config";
import { fmt } from "@/i18n/fmt";
import { getDictionary } from "@/i18n/get-dictionary";
import { breadcrumbsJsonLd, JsonLd, restaurantJsonLd, storeJsonLd } from "@/lib/seo/json-ld";
import { alternatesFor, SITE_URL } from "@/lib/seo/site";

/**
 * A slug belongs to exactly one of the two kinds — tried as a restaurant
 * first (the larger of the two), falling back to a store. One lookup
 * resolves, so the other costs nothing but an extra 404 round-trip at most.
 */
async function resolveBusiness(slug: string) {
  const restaurant = await getRestaurantBySlug(slug);
  if (restaurant) return { kind: "restaurant" as const, business: restaurant };
  const store = await getStoreBySlug(slug);
  if (store) return { kind: "store" as const, business: store };
  return undefined;
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const [resolved, governorates, regions, t] = await Promise.all([
    resolveBusiness(slug),
    getGovernorates(),
    getRegions(),
    getDictionary(lang),
  ]);
  if (!resolved) return {};
  const { kind, business } = resolved;
  // trusted from `kind` (which lookup resolved), not duck-typed off the
  // business object's own fields — see the note in BusinessDetailsGrid
  const typeLabel =
    business.subType?.name ??
    (kind === "restaurant"
      ? (business as unknown as { cuisine: typeof business.name }).cuisine[lang]
      : (business as unknown as { category: typeof business.name }).category[lang]);
  const areaLabel = [
    governorates.find((g) => g.id === business.governorateId)?.name[lang],
    regions.find((r) => r.id === business.regionId)?.name[lang],
  ]
    .filter(Boolean)
    .join(lang === "ar" ? "، " : ", ");
  const title = `${business.name[lang]} | ${t.common.brand}`;
  // location, then type, then the business's own description — a crawler
  // (and a share link's unfurled preview card) reads where/what before why
  const description = [
    areaLabel,
    typeLabel && fmt(t.restaurant.metaSpecializesIn, { type: typeLabel }),
    business.description[lang] &&
      fmt(t.restaurant.metaDescriptionPrefix, { description: business.description[lang] }),
  ]
    .filter(Boolean)
    .join("\n");
  return {
    title,
    description,
    alternates: alternatesFor(lang, `/${slug}`),
    openGraph: {
      title,
      description,
      images: business.coverImages[0] ? [business.coverImages[0]] : undefined,
    },
  };
}

/**
 * The one details page for both a restaurant and a store — merges what used
 * to be four near-identical pages (the isolated /menu/:slug/about and
 * /store/:slug/about, plus the chrome-carrying /restaurants/:slug and
 * /stores/:slug reached from the directory). No site header/nav/footer here,
 * same as the storefront it links back to — a QR visitor and a directory
 * visitor land on the exact same page either way.
 */
export default async function BusinessDetailsPage({
  params,
}: PageProps<"/[lang]/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const [t, resolved] = await Promise.all([
    getDictionary(lang),
    resolveBusiness(slug),
  ]);
  if (!resolved) notFound();
  const { kind, business } = resolved;

  const [reviews, governorates, regions] = await Promise.all([
    kind === "restaurant" ? getRestaurantReviews(business.id) : Promise.resolve([]),
    getGovernorates(),
    getRegions(),
  ]);
  // the storefront endpoints now embed branches directly — no extra call
  const branches = business.branches ?? [];

  const governorateName =
    governorates.find((g) => g.id === business.governorateId)?.name[lang] ?? "";
  const regionName =
    regions.find((r) => r.id === business.regionId)?.name[lang] ?? "";

  // storefront slugs are locale-less on purpose — the URL prints on a
  // physical QR code, so it never carries an `/ar` or `/en` prefix
  const pageUrl = `${SITE_URL}/${slug}`;
  const directoryLabel = kind === "restaurant" ? t.nav.restaurants : t.nav.stores;
  const directoryPath = kind === "restaurant" ? "restaurants" : "stores";

  return (
    <main className="pt-14">
      <JsonLd
        data={
          kind === "restaurant"
            ? restaurantJsonLd(business, lang, pageUrl)
            : storeJsonLd(business, lang, pageUrl)
        }
      />
      <JsonLd
        data={breadcrumbsJsonLd([
          { name: t.nav.home, url: `${SITE_URL}/${lang}` },
          { name: directoryLabel, url: `${SITE_URL}/${lang}/${directoryPath}` },
          { name: business.name[lang], url: pageUrl },
        ])}
      />
      <BackToMenuBar menuHref={`/${slug}/menu`} />
      <div className="container-page pt-4">
        <RestaurantGallery images={business.coverImages} />
      </div>
      <RestaurantDetailsBody
        restaurant={business}
        kind={kind}
        reviews={reviews}
        governorateName={governorateName}
        regionName={regionName}
        branches={branches}
        regions={regions}
        governorates={governorates}
        lang={lang}
        t={t}
        menuHref={`/${slug}/menu`}
      />
    </main>
  );
}
