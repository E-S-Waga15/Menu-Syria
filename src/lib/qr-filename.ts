/**
 * Builds a downloaded QR/image filename from its parts — "مطعم بيت الياسمين
 * qr.png" rather than a generic "qr.png" or a bare slug, so a restaurant
 * owner, store owner, or agent who downloads several codes can tell them
 * apart in their downloads folder. Strips characters a filesystem would
 * reject and collapses whitespace to single dashes.
 */
export function qrFileName(parts: (string | undefined | null)[], ext = "png") {
  const base = parts
    .filter((p): p is string => !!p && p.trim().length > 0)
    .join(" ")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-");
  return `${base || "qr"}.${ext}`;
}
