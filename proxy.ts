import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale, locales } from "@/i18n/config";

const LOCALE_COOKIE = "MENU_SYRIA_LOCALE";

/**
 * Storefront/details routes moved from `/menu/:slug`, `/store/:slug`,
 * `/restaurants/:slug` and `/stores/:slug` to a single `/:slug` (details) and
 * `/:slug/menu` (catalog) pair. Restaurants and stores already have QR codes
 * printed against the old paths, so those keep working permanently via a
 * redirect rather than becoming 404s the day this shipped.
 */
const LEGACY_REDIRECTS: [RegExp, (slug: string) => string][] = [
  [/^\/(?:menu|store)\/([^/]+)\/about\/?$/, (slug) => `/${slug}`],
  [/^\/(?:menu|store)\/([^/]+)\/offers\/?$/, (slug) => `/${slug}/offers`],
  [/^\/(?:menu|store)\/([^/]+)\/?$/, (slug) => `/${slug}/menu`],
  [/^\/(?:restaurants|stores)\/([^/]+)\/?$/, (slug) => `/${slug}`],
];

function legacyStorefrontTarget(localelessPath: string): string | null {
  for (const [pattern, toTarget] of LEGACY_REDIRECTS) {
    const match = localelessPath.match(pattern);
    if (match) return toTarget(match[1]!);
  }
  return null;
}

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && isLocale(cookieLocale)) return cookieLocale;

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  for (const part of acceptLanguage.split(",")) {
    const lang = part.split(";")[0]!.trim().toLowerCase().split("-")[0]!;
    if (isLocale(lang)) return lang;
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const pathnameLocale = locales.find(
    (locale) =>
      pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (pathnameLocale) {
    const localelessPath = pathname.slice(`/${pathnameLocale}`.length) || "/";
    const legacyTarget = legacyStorefrontTarget(localelessPath);
    if (legacyTarget) {
      const url = request.nextUrl.clone();
      url.pathname = `/${pathnameLocale}${legacyTarget}`;
      return NextResponse.redirect(url, 308);
    }

    // Remember the visitor's explicit choice for future visits
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, pathnameLocale, {
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Skip Next internals, API routes and static files (anything with a dot)
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
