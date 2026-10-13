"use client";

import { useState } from "react";

import { Building2, ExternalLink, MapPin, Phone } from "lucide-react";

import { MapEmbed } from "@/features/marketing/components/map-embed";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { PublicBranch, Region } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAIN = "main";

/**
 * The location panel, as its own client island: address, phone and map all
 * swap together when a visitor picks a different branch, while the rest of
 * the details page (description, contact, reviews) stays server-rendered.
 */
export function BranchLocationPanel({
  mainAddress,
  mainLocation,
  mainPhone,
  branches,
  regions,
  lang,
  t,
}: {
  mainAddress: string;
  mainLocation: { lat: number; lng: number };
  mainPhone: string;
  branches: PublicBranch[];
  regions: Region[];
  lang: Locale;
  t: Dictionary;
}) {
  const [selectedId, setSelectedId] = useState<string>(MAIN);

  const selectedBranch =
    selectedId === MAIN ? null : branches.find((b) => b.id === selectedId);

  const address = selectedBranch?.address || mainAddress;
  const location =
    selectedBranch?.latitude != null && selectedBranch?.longitude != null
      ? { lat: selectedBranch.latitude, lng: selectedBranch.longitude }
      : mainLocation;
  const phone = selectedBranch?.phone || mainPhone;
  const regionName = selectedBranch
    ? (regions.find((r) => r.id === selectedBranch.districtId)?.name[lang] ?? "")
    : "";

  return (
    <div className="space-y-4">
      {branches.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setSelectedId(MAIN)}
            aria-pressed={selectedId === MAIN}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-start transition-colors duration-200",
              selectedId === MAIN
                ? "border-primary/40 bg-primary/5"
                : "border-border/60 hover:bg-surface-container",
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Building2 className="size-4" />
            </span>
            <span className="flex-1 text-sm font-semibold">
              {t.restaurant.mainBranch}
            </span>
            {selectedId === MAIN && (
              <span className="shrink-0 rounded-full bg-zest px-3 py-1 text-xs font-bold text-zest-foreground">
                {t.restaurant.selectedBadge}
              </span>
            )}
          </button>
          {branches.map((branch) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => setSelectedId(branch.id)}
              aria-pressed={selectedId === branch.id}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-start transition-colors duration-200",
                selectedId === branch.id
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/60 hover:bg-surface-container",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <MapPin className="size-4" />
              </span>
              <span className="flex-1 text-sm font-semibold">
                {branch.name}
              </span>
              {selectedId === branch.id && (
                <span className="shrink-0 rounded-full bg-zest px-3 py-1 text-xs font-bold text-zest-foreground">
                  {t.restaurant.selectedBadge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {address && (
        <p className="flex items-start gap-2.5 text-sm">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <MapPin className="size-3.5" />
          </span>
          <span className="pt-1.5 text-muted-foreground">
            {address}
            {regionName && ` · ${regionName}`}
          </span>
        </p>
      )}

      {selectedBranch && phone && (
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="flex items-center gap-2.5 text-sm font-semibold transition-colors hover:text-primary"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Phone className="size-3.5" />
          </span>
          <span dir="ltr">{phone}</span>
          <span className="text-xs font-normal text-muted-foreground">
            ({t.restaurant.branchPhone})
          </span>
        </a>
      )}

      <a
        href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-primary/15"
      >
        {t.restaurant.openInMaps}
        <ExternalLink className="size-3.5" />
      </a>

      <MapEmbed
        key={selectedId}
        lat={location.lat}
        lng={location.lng}
        label={t.restaurant.location}
      />
    </div>
  );
}
