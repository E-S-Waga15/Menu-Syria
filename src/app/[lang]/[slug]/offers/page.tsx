import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StorefrontOffersScreen } from "@/features/offers/components/storefront-offers-screen";
import { getLiveOffers } from "@/features/offers/services";
import { getRestaurantBySlug } from "@/features/marketing/services";
import { getStoreBySlug } from "@/features/public-store/services";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

async function resolveBusiness(slug: string) {
  const restaurant = await getRestaurantBySlug(slug);
  if (restaurant) return { kind: "restaurant" as const, business: restaurant };
  const store = await getStoreBySlug(slug);
  if (store) return { kind: "store" as const, business: store };
  return undefined;
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/[slug]/offers">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const resolved = await resolveBusiness(slug);
  if (!resolved) return {};
  const t = await getDictionary(lang);
  return {
    title: `${t.offers.title} — ${resolved.business.name[lang]}`,
    description: resolved.business.description[lang],
  };
}

/**
 * A business's live offers, reachable from the strip on its catalog —
 * carries no site header/footer, same as the catalog and details pages.
 */
export default async function PublicOffersPage({
  params,
}: PageProps<"/[lang]/[slug]/offers">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const resolved = await resolveBusiness(slug);
  if (!resolved) notFound();
  const { kind, business } = resolved;

  const offers = await getLiveOffers(business.id);

  return (
    <StorefrontOffersScreen
      business={business}
      menuHref={`/${slug}/menu`}
      isStore={kind === "store"}
      initialOffers={offers}
    />
  );
}
