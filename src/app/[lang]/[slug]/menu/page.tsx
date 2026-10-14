import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MenuScreen } from "@/features/public-menu/components/menu-screen";
import { getPublicMenu } from "@/features/public-menu/services";
import { getPublicStoreCatalog } from "@/features/public-store/services";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { JsonLd, restaurantJsonLd, storeJsonLd } from "@/lib/seo/json-ld";
import { alternatesFor, SITE_URL } from "@/lib/seo/site";
import type { Business, LocalizedText } from "@/lib/types";

/** The business's real structured type (e.g. "مطعم إيطالي") when the owner
 * picked one, in place of the legacy free-text cuisine/category fallback —
 * see the doc comment on `Business.subType`. */
function subtitleFor(business: Business, fallback: LocalizedText): LocalizedText {
  if (!business.subType) return fallback;
  return { ar: business.subType.name, en: business.subType.name };
}

/**
 * One catalog loader for a slug that could be either kind of business — tried
 * restaurant first since that is the larger of the two, falling back to the
 * store catalog. Slugs are unique across both, so at most one of these ever
 * resolves.
 */
async function getCatalog(slug: string) {
  const menu = await getPublicMenu(slug);
  if (menu) return { kind: "restaurant" as const, ...menu };
  const catalog = await getPublicStoreCatalog(slug);
  if (catalog)
    return {
      kind: "store" as const,
      business: catalog.store,
      categories: catalog.categories,
      items: catalog.products,
      governorateName: catalog.governorateName,
      regionName: catalog.regionName,
    };
  return undefined;
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/[slug]/menu">): Promise<Metadata> {
  const { lang, slug } = await params;
  const catalog = await getCatalog(slug);
  const business = catalog?.kind === "restaurant" ? catalog.restaurant : catalog?.business;
  if (!business || !isLocale(lang)) return {};
  // the business's type, then its own description — what a share link's
  // auto-unfurled preview card (WhatsApp and the like) shows under the name
  const description = business.subType?.name
    ? `${business.subType.name}\n${business.description[lang]}`
    : business.description[lang];
  return {
    title: business.name[lang],
    description,
    alternates: alternatesFor(lang, `/${slug}/menu`),
    openGraph: {
      title: business.name[lang],
      description,
      images: business.coverImages[0] ? [business.coverImages[0]] : undefined,
    },
  };
}

export default async function PublicCatalogPage({
  params,
  searchParams,
}: PageProps<"/[lang]/[slug]/menu">) {
  const { lang, slug } = await params;
  const { t: tableParam } = await searchParams;
  if (!isLocale(lang)) notFound();

  const [catalog, t] = await Promise.all([getCatalog(slug), getDictionary(lang)]);
  if (!catalog) notFound();

  // storefront slugs are locale-less on purpose — see proxy.ts
  const pageUrl = `${SITE_URL}/${slug}/menu`;
  const business = catalog.kind === "restaurant" ? catalog.restaurant : catalog.business;

  return (
    <>
      <JsonLd
        data={
          catalog.kind === "restaurant"
            ? restaurantJsonLd(catalog.restaurant, lang, pageUrl)
            : storeJsonLd(catalog.business, lang, pageUrl)
        }
      />
      <MenuScreen
        business={business}
        subtitle={
          catalog.kind === "restaurant"
            ? subtitleFor(catalog.restaurant, catalog.restaurant.cuisine)
            : subtitleFor(catalog.business, catalog.business.category)
        }
        categories={catalog.categories}
        items={catalog.items}
        governorateName={catalog.governorateName}
        regionName={catalog.regionName}
        aboutHref={`/${slug}`}
        offersHref={`/${slug}/offers`}
        copy={catalog.kind === "restaurant" ? t.menu : t.storeFront}
        tableParam={
          catalog.kind === "restaurant" && typeof tableParam === "string"
            ? tableParam
            : undefined
        }
      />
    </>
  );
}
