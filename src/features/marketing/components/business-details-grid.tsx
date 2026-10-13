"use client";

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
import { MapEmbed } from "@/features/marketing/components/map-embed";
import { OpeningHours } from "@/features/marketing/components/opening-hours";
import { getSupportedFulfillment } from "@/features/public-menu/lib/fulfillment";
import { formatPrice } from "@/features/public-menu/lib/format";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Business, PublicBranch, Region } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAIN = "main";

/** one card shell for every block below the identity bar, so nothing drifts */
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
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
          {Icon && <Icon className="size-4.5 text-primary" />}
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Everything below the identity bar: a left column (map, contact, hours)
 * and a right column (about, quick facts, branches, the menu CTA, quick
 * info), all as one client component because the map and the branches list
 * share one piece of state — which branch (or the main address) is picked —
 * even though they land in different grid columns. Splitting that state
 * across two server-rendered slots isn't possible in one React tree, so this
 * owns the whole grid instead of being a small island inside it.
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
    <div className="mt-6 grid items-start gap-6 pb-6 lg:grid-cols-[1fr_1.1fr]">
      {/* left column — the map, then how to reach the business, then when */}
      <div className="space-y-6">
        <Panel title={t.restaurant.location} icon={MapPin}>
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
          <a
            href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary transition-colors duration-200 hover:bg-primary/15"
          >
            {t.restaurant.openInMaps}
            <ExternalLink className="size-3.5" />
          </a>
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
            href={`tel:${restaurant.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-2.5 text-base font-semibold transition-colors hover:text-primary"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ffd9de] text-[#90003b]">
              <Phone className="size-4" />
            </span>
            <span dir="ltr">{restaurant.phone}</span>
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

      {/* right column — what it is, the basics, where else to find it, then
          the one action that matters */}
      <div className="space-y-6">
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
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-card px-3 py-4 text-center"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <tile.icon className="size-4" />
                </span>
                <span className="label-eyebrow text-muted-foreground">
                  {tile.label}
                </span>
                <span className="line-clamp-1 text-sm font-bold">
                  {tile.value}
                </span>
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

            {mainAddress && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {t.restaurant.addressLabel}
                  </span>
                  <span className="text-sm font-bold">{mainAddress}</span>
                </span>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <MapPin className="size-4" />
                </span>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
