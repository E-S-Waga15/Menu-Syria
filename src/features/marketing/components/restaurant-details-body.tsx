import Image from "next/image";
import Link from "next/link";

import {
  Building2,
  Clock,
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
import { BranchLocationPanel } from "@/features/marketing/components/branch-location-panel";
import { BusinessShareActions } from "@/features/marketing/components/business-share-actions";
import { OpeningHours } from "@/features/marketing/components/opening-hours";
import { ReviewsSection } from "@/features/marketing/components/reviews-section";
import { getSupportedFulfillment } from "@/features/public-menu/lib/fulfillment";
import { formatPrice } from "@/features/public-menu/lib/format";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { recoverBusinessFields } from "@/lib/business-text";
import type { Business, PublicBranch, Region, Review } from "@/lib/types";

/** one card shell for every block on this page, so nothing drifts */
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

export function RestaurantDetailsBody({
  restaurant,
  reviews,
  governorateName,
  regionName,
  branches,
  regions,
  lang,
  t,
  showMenuCta = true,
  menuHref,
}: {
  restaurant: Business;
  reviews: Review[];
  governorateName: string;
  regionName: string;
  /** other locations this business has, for the location panel's switcher */
  branches: PublicBranch[];
  regions: Region[];
  lang: Locale;
  t: Dictionary;
  showMenuCta?: boolean;
  /** override the CTA destination */
  menuHref?: string;
}) {
  const separator = lang === "ar" ? "، " : ", ";

  // a request approved before the backend had dedicated columns for these
  // left its logo/colors/address/location dumped as text inside
  // `description` — recovered here so a visitor never sees that raw dump,
  // and the map falls back to the business's real pin instead of Damascus
  // -center when the actual `address`/`location` columns were never filled
  const recovered = recoverBusinessFields(restaurant.description[lang]);
  const description = recovered.description;
  const address = restaurant.address[lang] || recovered.address || "";
  const location = recovered.location ?? restaurant.location;

  // the one field that tells a visitor *what* this place sells — the real
  // sub-type the owner picked (e.g. "مطعم إيطالي") when the business has
  // one; a restaurant without one falls back to `cuisine` (free text, often
  // a generic "منوع" default), a store to `category`
  const typeLabel =
    restaurant.subType?.name ??
    ("cuisine" in restaurant
      ? (restaurant as { cuisine: typeof restaurant.name }).cuisine[lang]
      : "category" in restaurant
        ? (restaurant as { category: typeof restaurant.name }).category[lang]
        : null);

  // the quick-facts tile only earns its place when there is a real value to
  // show — a tile that reads a fake "0" for a business with no delivery
  // channel at all is worse than no tile, so this gates on the fulfillment
  // modes the business actually supports rather than assuming every
  // business delivers
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

  /** the three small quick-fact tiles above the About card */
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

  /** the profiles the business keeps, as opposed to ways to reach a person */
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
    <div className="container-page">
      {/* identity bar — sits mostly below the gallery so nothing is cropped */}
      {/* The row is bottom-aligned, so whichever child is taller sets how far
          the logo sits from the gallery. Keeping the badge on the name's line
          (below) shortens the text block back under the logo's height, which
          is what lets the mark ride up into the photo on a phone the way it
          already did on desktop. */}
      <div className="relative -mt-8 flex flex-wrap items-end gap-4 md:-mt-8 md:gap-5">
        <Image
          src={restaurant.logoUrl}
          alt=""
          width={120}
          height={120}
          className="size-28 rounded-2xl border-4 border-background object-cover md:size-32"
        />
        <div className="flex-1 pt-6 pb-1 md:pt-10">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <h1 className="text-display text-2xl md:text-4xl">
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
            {typeLabel && (
              <Badge className="shrink-0 bg-muted px-2 py-0.5 text-[11px] text-muted-foreground md:px-2.5 md:text-xs">
                {typeLabel}
              </Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {governorateName}
              {separator}
              {regionName}
            </span>
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Star className="size-4 fill-zest text-zest" />
              {restaurant.rating}
            </span>
          </div>
        </div>

        {/* favorite + share/QR, grouped beside the identity bar rather than
            buried in a panel — these are actions a visitor reaches for
            immediately, not after reading */}
        <div className="flex items-center gap-2 self-end pb-1">
          <FavoriteButton itemId={restaurant.id} itemName={restaurant.name[lang]} />
          <BusinessShareActions
            businessName={restaurant.name[lang]}
            businessLocation={
              areaLabel ?? undefined
            }
            businessPhotoUrl={restaurant.logoUrl}
          />
        </div>
      </div>

      {/* quick-facts row — type / governorate+area / delivery fee, each its
          own small bordered tile rather than one dense panel, so a visitor
          scanning the page gets the basics before reading anything */}
      {quickFactTiles.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-3">
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

      <div className="mt-6 grid items-start gap-6 pb-6 lg:grid-cols-[1.2fr_1fr]">
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

          {/* branches card — the switcher and its address/phone/map, read
              right after About rather than tucked in the side column, per
              the page's top-to-bottom reading order */}
          <Panel title={t.restaurant.location} icon={MapPin}>
            <BranchLocationPanel
              mainAddress={address}
              mainLocation={location}
              mainPhone={restaurant.phone}
              branches={branches}
              regions={regions}
              lang={lang}
              t={t}
            />
          </Panel>

          {/* the one action that matters — themed with the business's own colour */}
          {showMenuCta && (
            <Link
              href={menuHref ?? `/${lang}/${restaurant.slug}/menu`}
              className="group relative flex w-full transform-gpu items-center justify-center gap-3 overflow-hidden rounded-2xl px-8 py-5 text-lg font-bold text-white transition-[scale] duration-300 ease-smooth hover:scale-[1.01]"
              style={{
                background: `linear-gradient(135deg, ${restaurant.theme.primaryColor}, color-mix(in oklch, ${restaurant.theme.primaryColor}, ${restaurant.theme.secondaryColor} 35%))`,
              }}
            >
              {/* a slow sheen across the button — the only flourish on the page,
                  so it reads as considered rather than decorated */}
              <span
                aria-hidden
                className="absolute inset-y-0 -inset-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-smooth group-hover:translate-x-full"
              />
              <UtensilsCrossed className="relative size-5 transition-transform duration-300 group-hover:rotate-12" />
              <span className="relative">{t.restaurant.browseMenu}</span>
            </Link>
          )}

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
        </div>

        <div className="space-y-6">
          {/* quick info — rating and the full address, each a labelled row
              rather than folded into another panel */}
          <Panel title={t.restaurant.quickInfoTitle}>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {t.restaurant.ratingLabel}
                  </span>
                  <span className="text-base font-bold" dir="ltr">
                    {restaurant.rating}/5
                    {reviews.length > 0 && ` (${reviews.length})`}
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

          <Panel title={t.restaurant.workingHours} icon={Clock}>
            <OpeningHours hours={restaurant.openingHours} t={t} />
          </Panel>
        </div>
      </div>

      <ReviewsSection reviews={reviews} lang={lang} t={t} />
    </div>
  );
}
