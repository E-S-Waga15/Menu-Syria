/** Shared link-shaping for a business's social fields — used wherever an
 * Instagram/Facebook link is turned into a clickable href, so every surface
 * (the details page, the storefront menu header, …) treats a bare handle
 * the same way instead of each reimplementing it slightly differently. */
export function withProtocol(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Instagram's field takes either a bare handle ("yasmeen.house") or a full
 * profile link — a handle never contains "instagram.com", so that's enough
 * to tell the two apart without needing a separate field for each. */
export function toInstagramHref(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed) || /instagram\.com/i.test(trimmed)) {
    return withProtocol(trimmed);
  }
  return `https://instagram.com/${trimmed.replace(/^@/, "")}`;
}
