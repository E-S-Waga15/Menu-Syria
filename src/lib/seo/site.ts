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
