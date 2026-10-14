import type { Locale } from "@/i18n/config";
import { SITE_URL } from "@/lib/seo/site";
import type { Business, Restaurant, Store } from "@/lib/types";

/** Renders a JSON-LD structured-data block for search engines. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function organizationJsonLd(siteName: string, description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: siteName,
    url: SITE_URL,
    description,
    logo: `${SITE_URL}/icon.png`,
    areaServed: { "@type": "Country", name: "Syria" },
    knowsAbout: [
      "QR digital menus",
      "restaurant order management",
      "online stores",
      "Syria",
    ],
  };
}

export function websiteJsonLd(siteName: string, lang: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/${lang}/#website`,
    name: siteName,
    url: `${SITE_URL}/${lang}`,
    inLanguage: lang,
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/${lang}/restaurants?query={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

function businessBaseJsonLd(business: Business, lang: Locale) {
  return {
    name: business.name[lang],
    description: business.description[lang],
    image: business.coverImages[0] ?? business.logoUrl,
    logo: business.logoUrl,
    telephone: business.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address[lang],
      addressCountry: "SY",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: business.location.lat,
      longitude: business.location.lng,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: business.rating,
      bestRating: 5,
    },
  };
}

export function restaurantJsonLd(
  restaurant: Restaurant,
  lang: Locale,
  url: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": url,
    url,
    servesCuisine: restaurant.cuisine[lang],
    // storefront slugs are locale-less on purpose — see proxy.ts
    hasMenu: `${SITE_URL}/${restaurant.slug}/menu`,
    ...businessBaseJsonLd(restaurant, lang),
  };
}

export function storeJsonLd(store: Store, lang: Locale, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": url,
    url,
    ...businessBaseJsonLd(store, lang),
  };
}

export function breadcrumbsJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * FAQPage schema. Google can surface these as expandable results, but only
 * when the answers are also present in the rendered HTML — which is why the
 * FAQ ships as a server component rather than fetching its copy on the client.
 */
export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
