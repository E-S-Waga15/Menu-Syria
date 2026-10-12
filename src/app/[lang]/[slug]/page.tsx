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
  const resolved = await resolveBusiness(slug);
  if (!resolved) return {};
  const { business } = resolved;
  return {
    title: business.name[lang],
    description: business.description[lang],
    alternates: alternatesFor(lang, `/${slug}`),
    openGraph: {
      title: business.name[lang],
      description: business.description[lang],
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

  const governorateName =
    governorates.find((g) => g.id === business.governorateId)?.name[lang] ?? "";
  const regionName =
    regions.find((r) => r.id === business.regionId)?.name[lang] ?? "";

  const pageUrl = `${SITE_URL}/${lang}/${slug}`;
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
      <BackToMenuBar menuHref={`/${lang}/${slug}/menu`} />
      <RestaurantGallery images={business.coverImages} />
      <RestaurantDetailsBody
        restaurant={business}
        reviews={reviews}
        governorateName={governorateName}
        regionName={regionName}
        lang={lang}
        t={t}
        menuHref={`/${lang}/${slug}/menu`}
      />
    </main>
  );
}
