import { MenuSyriaLoader } from "@/components/shared/menu-syria-loader";

/**
 * The storefront or its details page, waiting — a QR visitor lands here
 * cold, often on a phone network, with nothing prefetched. Covers `/:slug`,
 * `/:slug/menu` and `/:slug/offers` alike since none of them override it.
 *
 * This is the platform's own loader, not the business's: the whole point of
 * `loading.tsx` is to appear the instant navigation starts, before any data
 * — including which business this even is, let alone its brand colour —
 * has been fetched. Making this file wait for that colour would mean
 * waiting for the very request it exists to cover, which defeats it. The
 * moment the real page takes over, it already paints in the business's own
 * colour via `--menu-primary`; this screen only ever covers the instant
 * before that is known.
 */
export default function StorefrontLoading() {
  return <MenuSyriaLoader size="lg" fullScreen />;
}
