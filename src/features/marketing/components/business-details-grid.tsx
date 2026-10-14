"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import {
  Building2,
  Clock,
  Copy,
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
import { fmt } from "@/i18n/fmt";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Business, Governorate, PublicBranch, Region } from "@/lib/types";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const MAIN = "main";
/** the two persistent columns for everything below the gallery: a wide
 * content column (identity, about, facts, branches, menu CTA, quick info)
 * paired against a narrower sidebar (map, contact, hours) — content lands
 * in the row's first/right (RTL start) track, the sidebar in the second/
 * left track */
const SIDE_COLS = "lg:grid-cols-[1.25fr_0.75fr]";

function withProtocol(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Instagram's field takes either a bare handle ("yasmeen.house") or a full
 * profile link — a handle never contains "instagram.com", so that's enough
 * to tell the two apart without needing a separate field for each. */
function toInstagramHref(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed) || /instagram\.com/i.test(trimmed)) {
    return withProtocol(trimmed);
  }
  return `https://instagram.com/${trimmed.replace(/^@/, "")}`;
}

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
  governorates,
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
  governorates: Governorate[];
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
  // a branch has one number that doubles as both its phone and WhatsApp
  const branchPhone = selectedBranch?.phone || restaurant.phone;
  const branchWhatsapp = selectedBranch?.phone || restaurant.whatsapp;
  const location =
    selectedBranch?.latitude != null && selectedBranch?.longitude != null
      ? { lat: selectedBranch.latitude, lng: selectedBranch.longitude }
      : mainLocation;
  const branchRegion = selectedBranch
    ? regions.find((r) => r.id === selectedBranch.districtId)
    : undefined;
  const branchRegionName = branchRegion?.name[lang] ?? "";
  const branchGovernorateName = selectedBranch
    ? (governorates.find(
        (g) => g.id === (selectedBranch.governorateId ?? branchRegion?.governorateId),
      )?.name[lang] ?? "")
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

  // the area tile follows the selected branch, falling back to the main
  // business's governorate/region when "main" (or no branches) is selected
  const effectiveGovernorateName = selectedBranch
    ? branchGovernorateName
    : governorateName;
  const effectiveRegionName = selectedBranch ? branchRegionName : regionName;
  const areaLabel =
    effectiveGovernorateName || effectiveRegionName
      ? [effectiveGovernorateName, effectiveRegionName]
          .filter(Boolean)
          .join(separator)
      : null;

  const isStore = "category" in restaurant;
  const aboutTitle = isStore
    ? t.restaurant.aboutStoreTitle
    : t.restaurant.aboutRestaurantTitle;
  const contactInfoTitle = selectedBranch
    ? `${t.restaurant.contactInfo} (${selectedBranch.name})`
    : t.restaurant.contactInfo;

  const openBadgeClassName = restaurant.isOpen
    ? "bg-success/10 px-2 py-0.5 text-[11px] text-success md:px-2.5 md:text-xs"
    : "bg-muted px-2 py-0.5 text-[11px] text-muted-foreground md:px-2.5 md:text-xs";
  const openBadgeContent = (
    <>
      <span
        className={`me-1 size-1.5 rounded-full ${restaurant.isOpen ? "bg-success" : "bg-muted-foreground"}`}
      />
      {restaurant.isOpen ? t.restaurant.openNow : t.restaurant.closedNow}
    </>
  );

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
      key: "facebook",
      icon: FacebookIcon,
      // the field is always a full page link, never a bare handle
      href: withProtocol(restaurant.facebook),
      className:
        "bg-[#1877F2]/10 text-[#1462c4] hover:bg-[#1877F2]/20 dark:text-[#6ba8f5]",
    },
    restaurant.instagram && {
      key: "instagram",
      icon: InstagramIcon,
      href: toInstagramHref(restaurant.instagram),
      className:
        "bg-gradient-to-r from-[#f9ce34]/15 via-[#ee2a7b]/15 to-[#6228d7]/15 text-[#c13584] hover:from-[#f9ce34]/25 hover:via-[#ee2a7b]/25 hover:to-[#6228d7]/25 dark:text-[#ef7cae]",
    },
  ].filter(Boolean) as {
    key: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    href: string;
    className: string;
  }[];

  return (
    <div className={cn("grid items-start gap-6 pb-2.5", SIDE_COLS)}>
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
          <div className="flex flex-wrap items-start gap-4 ps-5 md:ps-10">
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
                {/* inline beside the name on desktop; on mobile it drops to
                    its own line below the name, freeing the row so the
                    action buttons fit beside the name instead of wrapping
                    under it */}
                <Badge className={cn("hidden shrink-0 md:inline-flex", openBadgeClassName)}>
                  {openBadgeContent}
                </Badge>
              </div>
              <Badge
                className={cn("mt-1.5 w-fit shrink-0 md:hidden", openBadgeClassName)}
              >
                {openBadgeContent}
              </Badge>
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
              businessKind={isStore ? "store" : "restaurant"}
              size="sm"
            />
          </div>
        </div>

        {/* SEO/readability order: name, then type and location (the quick-
            fact tiles), then the about text — a crawler (and a human
            skimming) reads what this place is and where before reading
            about it */}
        {quickFactTiles.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
            {quickFactTiles.map((tile, index) => (
              <div
                key={tile.label}
                className={cn(
                  "rounded-xl border border-border/60 bg-card px-3 py-2.5 sm:px-3.5",
                  // an odd one out (the 3rd of 3) spans both mobile columns
                  // instead of leaving a dangling half-empty row
                  index === quickFactTiles.length - 1 &&
                    quickFactTiles.length % 2 === 1 &&
                    "col-span-2 md:col-span-1",
                )}
              >
                <div className="flex items-center gap-1.5 text-primary">
                  <tile.icon className="size-3.5 shrink-0" />
                  <span className="label-eyebrow">{tile.label}</span>
                </div>
                <p className="mt-1 text-[11px] font-bold break-words sm:text-xs">
                  {tile.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <Panel title={aboutTitle}>
          {description ? (
            <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
              {description}
            </p>
          ) : (
            <p className="text-muted-foreground italic">
              {t.restaurant.noDescription}
            </p>
          )}
        </Panel>

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
            href={menuHref ?? `/${restaurant.slug}/menu`}
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
                  <span className="text-xs font-bold">{address}</span>
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
              <span className="pt-1.5 text-muted-foreground">{address}</span>
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

        <Panel title={contactInfoTitle} icon={Phone}>
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <Phone className="size-4 shrink-0 text-[#90003b] dark:text-[#ff8aa6]" />
              <span dir="ltr" className="truncate text-sm font-semibold">
                {branchPhone}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                aria-label={t.common.copy}
                onClick={() => {
                  navigator.clipboard
                    .writeText(branchPhone)
                    .then(() =>
                      toast.success(
                        fmt(t.restaurant.phoneCopied, {
                          name: restaurant.name[lang],
                        }),
                      ),
                    )
                    .catch(() => toast.error(t.restaurant.shareFailed));
                }}
                className="flex size-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <Copy className="size-3.5" />
              </button>
              <a
                href={`tel:${branchPhone.replace(/\s/g, "")}`}
                className="rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t.restaurant.call}
              </a>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <WhatsAppIcon className="size-4 shrink-0 text-[#128C4A] dark:text-[#4cd97f]" />
              <span dir="ltr" className="truncate text-sm font-semibold">
                {branchWhatsapp}
              </span>
            </div>
            <a
              href={`https://wa.me/${branchWhatsapp.replace(/[+\s]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full bg-[#25D366] px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#1fb855]"
            >
              {t.restaurant.chat}
            </a>
          </div>

          {socialPages.length > 0 && (
            <div className="mt-6 border-t border-border/60 pt-5">
              <h3 className="label-eyebrow text-muted-foreground">
                {t.restaurant.socialPages}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {socialPages.map((page) => (
                  <a
                    key={page.key}
                    href={page.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${page.className}`}
                  >
                    <page.icon className="size-4 shrink-0" />
                    <span>{restaurant.name[lang]}</span>
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
