import type { Locale } from "@/i18n/config";

/** Canonical production origin — override per environment. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://menusyria.app";

/**
 * hreflang + canonical for a localized path.
 * `path` is the locale-less pathname, e.g. "/restaurants" or "".
 */
export function alternatesFor(lang: Locale, path: string) {
  return {
    canonical: `${SITE_URL}/${lang}${path}`,
    languages: {
      ar: `${SITE_URL}/ar${path}`,
      en: `${SITE_URL}/en${path}`,
      "x-default": `${SITE_URL}/ar${path}`,
    },
  };
}

/**
 * A business's own uploaded logo, routed through Next's image optimizer
 * before it's used as an `og:image` — the original upload can be several
 * megabytes (nothing compresses it on the way in), and link-preview
 * crawlers (WhatsApp's especially) are known to silently drop an og:image
 * past a few hundred KB rather than showing it. This is still the real
 * photo, just resized/recompressed the same way `next/image` already does
 * everywhere else on the site — not a generated placeholder.
 */
export function ogImageFor(logoUrl: string): string {
  return `${SITE_URL}/_next/image?url=${encodeURIComponent(logoUrl)}&w=1200&q=75`;
}
