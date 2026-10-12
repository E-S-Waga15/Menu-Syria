"use client";

import { useState } from "react";

import { ExternalLink, MapPin, Phone } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapEmbed } from "@/features/marketing/components/map-embed";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Branch, Region } from "@/lib/types";

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
  branches: Branch[];
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
        <Select
          value={selectedId}
          onValueChange={(value) => setSelectedId(value ?? MAIN)}
        >
          <SelectTrigger className="h-11! w-full" aria-label={t.restaurant.selectBranch}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={MAIN}>{t.restaurant.mainBranch}</SelectItem>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {address && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          <span>
            {address}
            {regionName && ` · ${regionName}`}
          </span>
        </p>
      )}

      {selectedBranch && phone && (
        <a
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="flex items-center gap-2 text-sm font-semibold transition-colors hover:text-primary"
        >
          <Phone className="size-3.5" />
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
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
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
