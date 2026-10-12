import type { MetadataRoute } from "next";

import {
  getAgents,
  getFeaturedRestaurants,
} from "@/features/marketing/services";
import { getStores } from "@/features/public-store/services";
import { locales } from "@/i18n/config";
import { SITE_URL } from "@/lib/seo/site";

function localized(
  path: string,
  priority: number,
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly",
): MetadataRoute.Sitemap {
  return locales.map((lang) => ({
    url: `${SITE_URL}/${lang}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: {
      languages: Object.fromEntries(
        locales.map((l) => [l, `${SITE_URL}/${l}${path}`]),
      ),
    },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [restaurants, stores, agents] = await Promise.all([
    getFeaturedRestaurants(),
    getStores(),
    getAgents(),
  ]);

  return [
    ...localized("", 1, "weekly"),
    ...localized("/restaurants", 0.9, "daily"),
    ...localized("/stores", 0.9, "daily"),
    ...localized("/agents", 0.8, "weekly"),
    ...localized("/about", 0.7, "monthly"),
    ...localized("/privacy", 0.3, "yearly"),
    ...localized("/terms", 0.3, "yearly"),
    ...localized("/login", 0.3, "monthly"),
    ...localized("/register/restaurant", 0.6, "monthly"),
    ...localized("/register/agent", 0.5, "monthly"),
    ...restaurants.flatMap((r) => [
      ...localized(`/${r.slug}`, 0.8, "weekly"),
      ...localized(`/${r.slug}/menu`, 0.7, "daily"),
    ]),
    ...stores.flatMap((s) => [
      ...localized(`/${s.slug}`, 0.8, "weekly"),
      ...localized(`/${s.slug}/menu`, 0.8, "daily"),
    ]),
    ...agents.flatMap((a) =>
      localized(`/agents/${a.referralCode}`, 0.6, "monthly"),
    ),
  ];
}
