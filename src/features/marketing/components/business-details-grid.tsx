"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  Building2,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  Star,
  Tag,
  Truck,
  UtensilsCrossed,
} from "lucide-react";

import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
} from "@/components/shared/brand-icons";
import { FavoriteButton } from "@/components/shared/favorite-button";
import { Badge } from "@/components/ui/badge";
import { BusinessShareActions } from "@/features/marketing/components/business-share-actions";
import { MapEmbed } from "@/features/marketing/components/map-embed";
import { OpeningHours } from "@/features/marketing/components/opening-hours";
import { getSupportedFulfillment } from "@/features/public-menu/lib/fulfillment";
import { formatPrice } from "@/features/public-menu/lib/format";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Business, PublicBranch, Region } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAIN = "main";
/** the two persistent columns for everything below the gallery: a wide
 * content column (identity, about, facts, branches, menu CTA, quick info)
 * paired against a narrower sidebar (map, contact, hours) — content lands
 * in the row's first/right (RTL start) track, the sidebar in the second/
 * left track */
const SIDE_COLS = "lg:grid-cols-[1.25fr_0.75fr]";

/** one card shell for every block on this page — smaller, lighter headings
 * than a default <h2> for a quieter, more composed read */
function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  /** small mark beside the heading — purely decorative, never the only cue */
  icon?: React.ComponentType<{ className?: string }>;
  /** sits opposite the heading rather than under the content */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
          {Icon && <Icon className="size-4 text-primary" />}
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Everything on the details page below the gallery, as two persistent
 * columns: identity/about/facts/branches/menu/quick-info in the wide
 * content column, map/contact/hours in the narrow sidebar beside it. All
 * one client component because the map and the branches list share one
 * piece of state — which branch (or the main address) is picked — even
 * though they land apart in the layout; splitting that state across
 * separate server-rendered slots isn't possible in one React tree, so this
 * owns the whole section instead of being a small island inside it.
 */
export function BusinessDetailsGrid({
  restaurant,
  description,
  mainAddress,
  mainLocation,
  typeLabel,
  governorateName,
  regionName,
  branches,
  regions,
  reviewCount,
  showMenuCta = true,
  menuHref,
  lang,
  t,
}: {
  restaurant: Business;
  /** already recovered from the old notes-dump, plain text or "" */
  description: string;
  mainAddress: string;
  mainLocation: { lat: number; lng: number };
  typeLabel: string | null;
  governorateName: string;
  regionName: string;
  branches: PublicBranch[];
  regions: Region[];
  reviewCount: number;
  showMenuCta?: boolean;
  menuHref?: string;
  lang: Locale;
  t: Dictionary;
}) {
  const separator = lang === "ar" ? "، " : ", ";
  const [selectedId, setSelectedId] = useState<string>(MAIN);

  const selectedBranch =
    selectedId === MAIN ? null : branches.find((b) => b.id === selectedId);

  const address = selectedBranch?.address || mainAddress;
  // no per-branch whatsapp in the data model — only the phone switches
  const branchPhone = selectedBranch?.phone || restaurant.phone;
  const location =
    selectedBranch?.latitude != null && selectedBranch?.longitude != null
      ? { lat: selectedBranch.latitude, lng: selectedBranch.longitude }
      : mainLocation;
  const branchRegionName = selectedBranch
    ? (regions.find((r) => r.id === selectedBranch.districtId)?.name[lang] ?? "")
    : "";

  const supportsDelivery = getSupportedFulfillment(restaurant).includes(
    "delivery",
  );
  const deliveryFeeValue =
    supportsDelivery && restaurant.deliveryFee !== undefined
      ? restaurant.deliveryFee && restaurant.deliveryFee > 0
        ? formatPrice(restaurant.deliveryFee, t.common.currency, lang)
        : t.restaurant.freeDeliveryValue
      : null;

  const areaLabel =
    governorateName || regionName
      ? [governorateName, regionName].filter(Boolean).join(separator)
      : null;

  const quickFactTiles = [
    typeLabel && { icon: Tag, label: t.restaurant.typeTileLabel, value: typeLabel },
    areaLabel && {
      icon: Building2,
      label: t.restaurant.areaTileLabel,
      value: areaLabel,
    },
    deliveryFeeValue && {
      icon: Truck,
      label: t.restaurant.deliveryFeeTileLabel,
      value: deliveryFeeValue,
    },
  ].filter(Boolean) as { icon: typeof Tag; label: string; value: string }[];

  const socialPages = [
    restaurant.facebook && {
      label: t.restaurant.facebook,
      handle: restaurant.facebook,
      icon: FacebookIcon,
      href: `https://facebook.com/${restaurant.facebook}`,
      className:
        "bg-[#1877F2]/10 text-[#1462c4] hover:bg-[#1877F2]/20 dark:text-[#6ba8f5]",
    },
    restaurant.instagram && {
      label: t.restaurant.instagram,
      handle: restaurant.instagram,
      icon: InstagramIcon,
      href: `https://instagram.com/${restaurant.instagram}`,
      className:
        "bg-gradient-to-r from-[#f9ce34]/15 via-[#ee2a7b]/15 to-[#6228d7]/15 text-[#c13584] hover:from-[#f9ce34]/25 hover:via-[#ee2a7b]/25 hover:to-[#6228d7]/25 dark:text-[#ef7cae]",
    },
  ].filter(Boolean) as {
    label: string;
    handle: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    href: string;
    className: string;
  }[];

  return (
    <div className={cn("grid items-start gap-6", SIDE_COLS)}>
      {/* main content column: identity, about, facts, branches, menu CTA,
          quick info — everything that isn't "where/how to reach this
          place" lives here, paired against the sidebar column so the page
          reads as two persistent columns instead of stacked rows */}
      <div className="space-y-6">
        {/* logo rides up over the gallery's bottom edge on its own; the name
            stays in normal flow with a small mt-2.5 gap below the gallery —
            the same gap the sidebar's map panel starts with, so both
            columns begin at the same visual height. The actions sit at the
            row's far end, same level as the name, right next to where the
            map column starts beside it — not stacked above the map. */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-start gap-4">
            <div className="relative z-10 -mt-8">
              <Image
                src={restaurant.logoUrl}
                alt=""
                width={96}
                height={96}
                className="size-20 shrink-0 rounded-2xl border-4 border-background object-cover md:size-24"
              />
            </div>
            <div className="mt-2.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <h1 className="text-display text-xl md:text-3xl">
                  {restaurant.name[lang]}
                </h1>
                <Badge
                  className={
                    restaurant.isOpen
                      ? "shrink-0 bg-success/10 px-2 py-0.5 text-[11px] text-success md:px-2.5 md:text-xs"
                      : "shrink-0 bg-muted px-2 py-0.5 text-[11px] text-muted-foreground md:px-2.5 md:text-xs"
                  }
                >
                  <span
                    className={`me-1 size-1.5 rounded-full ${restaurant.isOpen ? "bg-success" : "bg-muted-foreground"}`}
                  />
                  {restaurant.isOpen
                    ? t.restaurant.openNow
                    : t.restaurant.closedNow}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex shrink-0 items-center gap-2">
            <FavoriteButton
              itemId={restaurant.id}
              itemName={restaurant.name[lang]}
              size="sm"
            />
            <BusinessShareActions
              businessName={restaurant.name[lang]}
              businessLocation={areaLabel ?? undefined}
              businessPhotoUrl={restaurant.logoUrl}
              size="sm"
            />
          </div>
        </div>

        <Panel title={t.restaurant.aboutTitle}>
          {description ? (
            <p className="leading-relaxed text-muted-foreground md:text-lg">
              {description}
            </p>
          ) : (
            <p className="text-muted-foreground italic">
              {t.restaurant.noDescription}
            </p>
          )}
        </Panel>

        {quickFactTiles.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {quickFactTiles.map((tile) => (
              <div
                key={tile.label}
                className="rounded-xl border border-border/60 bg-card px-3.5 py-2.5"
              >
                <div className="flex items-center gap-1.5 text-primary">
                  <tile.icon className="size-3.5 shrink-0" />
                  <span className="label-eyebrow truncate">{tile.label}</span>
                </div>
                <p className="mt-1 truncate text-sm font-bold">{tile.value}</p>
              </div>
            ))}
          </div>
        )}

        {branches.length > 0 && (
          <Panel title={t.restaurant.branches} icon={Building2}>
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
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                    selectedId === MAIN
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
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
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                      selectedId === branch.id
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
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
          </Panel>
        )}

        {showMenuCta && (
          <Link
            href={menuHref ?? `/${lang}/${restaurant.slug}/menu`}
            className="group relative flex w-full transform-gpu items-center justify-center gap-3 overflow-hidden rounded-2xl px-8 py-5 text-lg font-bold text-white transition-[scale] duration-300 ease-smooth hover:scale-[1.01]"
            style={{
              background: `linear-gradient(135deg, ${restaurant.theme.primaryColor}, color-mix(in oklch, ${restaurant.theme.primaryColor}, ${restaurant.theme.secondaryColor} 35%))`,
            }}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 -inset-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-smooth group-hover:translate-x-full"
            />
            <UtensilsCrossed className="relative size-5 transition-transform duration-300 group-hover:rotate-12" />
            <span className="relative">{t.restaurant.browseMenu}</span>
          </Link>
        )}

        <Panel title={t.restaurant.quickInfoTitle}>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <span className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">
                  {t.restaurant.ratingLabel}
                </span>
                <span className="text-base font-bold" dir="ltr">
                  {restaurant.rating}/5
                  {reviewCount > 0 && ` (${reviewCount})`}
                </span>
              </span>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Star className="size-4 fill-zest text-zest" />
              </span>
            </div>

            {address && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {t.restaurant.addressLabel}
                  </span>
                  <span className="text-sm font-bold">{address}</span>
                </span>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <MapPin className="size-4" />
                </span>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* sidebar column: everything about reaching/visiting the place —
          map, contact, hours — paired beside the main content so it reads
          as a persistent "how to get here" rail instead of a lower section
          of the page. mt-2.5 offsets the content column's -mt-8 identity
          overlap so both columns start at the same visual height. */}
      <div className="mt-2.5 space-y-6">
        <Panel
          title={t.restaurant.location}
          icon={MapPin}
          action={
            <a
              href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors duration-200 hover:bg-primary/15"
            >
              {t.restaurant.openInMaps}
              <ExternalLink className="size-3.5" />
            </a>
          }
        >
          {address && (
            <p className="flex items-start gap-2.5 text-sm">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <MapPin className="size-3.5" />
              </span>
              <span className="pt-1.5 text-muted-foreground">
                {address}
                {branchRegionName && ` · ${branchRegionName}`}
              </span>
            </p>
          )}
          <div className="mt-3">
            <MapEmbed
              key={selectedId}
              lat={location.lat}
              lng={location.lng}
              label={t.restaurant.location}
            />
          </div>
        </Panel>

        <Panel title={t.restaurant.contactInfo} icon={Phone}>
          <a
            href={`tel:${branchPhone.replace(/\s/g, "")}`}
            className="flex items-center gap-2.5 text-base font-semibold transition-colors hover:text-primary"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ffd9de] text-[#90003b]">
              <Phone className="size-4" />
            </span>
            <span dir="ltr">{branchPhone}</span>
          </a>

          <a
            href={`https://wa.me/${restaurant.whatsapp.replace(/[+\s]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2.5 text-base font-semibold transition-colors hover:text-[#128C4A]"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/12 text-[#128C4A] dark:text-[#4cd97f]">
              <WhatsAppIcon className="size-4" />
            </span>
            <span dir="ltr">{restaurant.whatsapp}</span>
          </a>

          {socialPages.length > 0 && (
            <div className="mt-6 border-t border-border/60 pt-5">
              <h3 className="label-eyebrow text-muted-foreground">
                {t.restaurant.socialPages}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {socialPages.map((page) => (
                  <a
                    key={page.label}
                    href={page.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${page.className}`}
                  >
                    <page.icon className="size-4 shrink-0" />
                    <span className="flex flex-col leading-tight">
                      <span>{page.label}</span>
                      <span
                        className="text-[11px] font-medium opacity-70"
                        dir="ltr"
                      >
                        @{page.handle}
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel title={t.restaurant.workingHours} icon={Clock}>
          <OpeningHours hours={restaurant.openingHours} t={t} />
        </Panel>
      </div>
    </div>
  );
}
