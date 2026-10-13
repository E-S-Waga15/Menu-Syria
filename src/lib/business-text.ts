/**
 * Recovers real content from a business record whose `description` is
 * actually the registration request's free-text `notes` dump.
 *
 * `/registration-requests/public` has no dedicated fields for a logo,
 * theme colors, address or map pin — those only had `notes` to ride in on
 * (see `restaurant-register-form.tsx`). Approving a request apparently
 * copies that whole blob straight into the new business's `description`
 * instead of parsing it into the columns that already exist for each of
 * these (`logoUrl`, `theme`, `address`, `location`) — so a visitor sees
 * "Logo: ...\nColors: ...\nLocation: ..." where a description belongs, and
 * the map falls back to Damascus-center because `location` was never
 * actually written.
 *
 * This is a frontend patch for records already in that state, not a fix —
 * the real fix is on the backend, either adding those fields to the public
 * DTO or having request-approval parse `notes` into them. A record that was
 * never put through this is untouched: `looksLikeDump` only fires on the
 * known "Label: value" lines this form itself used to produce.
 */

const KNOWN_PREFIXES = [
  "Logo",
  "Colors",
  "Location",
  "Cuisine",
  "Address",
  "Description",
  "Instagram",
  "Facebook",
  "TikTok",
];

export interface RecoveredBusinessFields {
  /** the real description, or "" if the dump never had one */
  description: string;
  address?: string;
  location?: { lat: number; lng: number };
  logoUrl?: string;
  theme?: { primaryColor: string; secondaryColor: string };
}

function field(lines: string[], label: string): string | undefined {
  const prefix = `${label}:`;
  const line = lines.find((l) => l.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : undefined;
}

export function recoverBusinessFields(raw: string): RecoveredBusinessFields {
  if (!raw) return { description: "" };

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const looksLikeDump = lines.some((line) =>
    KNOWN_PREFIXES.some((prefix) => line.startsWith(`${prefix}:`)),
  );
  if (!looksLikeDump) return { description: raw };

  const address = field(lines, "Address");
  const locationRaw = field(lines, "Location");
  let location: { lat: number; lng: number } | undefined;
  if (locationRaw) {
    const [latStr, lngStr] = locationRaw.split(",").map((s) => s.trim());
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (Number.isFinite(lat) && Number.isFinite(lng)) location = { lat, lng };
  }

  const logoUrl = field(lines, "Logo");

  const colorsRaw = field(lines, "Colors");
  let theme: { primaryColor: string; secondaryColor: string } | undefined;
  if (colorsRaw) {
    const [primaryColor, secondaryColor] = colorsRaw
      .split(",")
      .map((s) => s.trim());
    if (primaryColor && secondaryColor) theme = { primaryColor, secondaryColor };
  }

  return {
    description: field(lines, "Description") ?? "",
    address,
    location,
    logoUrl,
    theme,
  };
}

/**
 * Applies the recovery to a fetched business, once, at the point every
 * `/me/restaurant`, `/restaurants/:slug` and `/stores/:slug` read already
 * passes through — so every screen that reads `business.theme`/`logoUrl`/
 * `address`/`location` downstream (dashboard, public page, menu, cart,
 * offers…) sees the owner's real picked values without each of them having
 * to call `recoverBusinessFields` themselves. A business never put through
 * the old no-fields registration form is returned unchanged — recovery only
 * ever overrides a field the dump actually had a line for.
 */
export function applyRecoveredBusinessFields<
  T extends {
    description: { ar: string; en: string };
    address: { ar: string; en: string };
    location: { lat: number; lng: number };
    logoUrl: string;
    theme: { primaryColor: string; secondaryColor: string };
  },
>(business: T): T {
  const recoveredAr = recoverBusinessFields(business.description.ar);
  const recoveredEn = recoverBusinessFields(business.description.en);

  return {
    ...business,
    description: { ar: recoveredAr.description, en: recoveredEn.description },
    address: {
      ar: recoveredAr.address || business.address.ar,
      en: recoveredEn.address || business.address.en,
    },
    location: recoveredAr.location ?? business.location,
    logoUrl: recoveredAr.logoUrl || business.logoUrl,
    theme: recoveredAr.theme ?? business.theme,
  };
}
