"use client";

import { useState } from "react";

/**
 * Google Maps embed.
 *
 * Shown straight away — the old click-to-activate shade meant a visitor had to
 * discover the map before they could see it, which cost more than the scroll
 * hijack it was guarding against. `touch-pan-y` keeps a vertical swipe on the
 * map scrolling the page rather than panning the tiles.
 */
export function MapEmbed({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  label: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-72 touch-pan-y overflow-hidden rounded-2xl border border-border/60 md:h-80">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-surface-container" />
      )}
      <iframe
        title={label}
        src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
        className="size-full border-0 transition-opacity duration-300"
        style={{ opacity: loaded ? 1 : 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
