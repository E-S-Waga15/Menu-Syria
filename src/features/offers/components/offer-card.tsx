"use client";

import { FadeImage } from "@/components/shared/fade-image";
import Link from "next/link";
import { useState } from "react";

import { Tag } from "lucide-react";

import type { ReactNode } from "react";

import { offerDiscount } from "@/features/offers/services";
import { Price } from "@/components/shared/price";
import { fmt, useI18n } from "@/i18n/client";
import type { Offer, OfferBadge } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * One offer, everywhere an offer is shown as a card.
 *
 * The whole card is the photograph. What sits on it is arranged by corner so
 * nothing has to compete for the same space: what kind of offer it is reads
 * top-start, what it saves reads top-end, and the foot carries the name with
 * whoever is behind it on one side and the two prices on the other.
 *
 * Two things keep this from repeating the failure it had before. The scrim is
 * a real gradient, dark enough at the foot to carry white type over any
 * photograph rather than hoping the image is dark there. And the card holds
 * its shape without the image: `min-h` backs up the aspect ratio so it can
 * never collapse to its border, and a missing or failed `src` falls back to a
 * tinted panel with the offer mark instead of an empty frame.
 */
export function OfferCard({
  offer,
  href,
  onClick,
  startBadge,
  endBadge,
  actions,
  footnote,
  muted = false,
  eager = false,
  className,
}: {
  offer: Offer;
  /** renders the card as a link */
  href?: string;
  /** renders the card as a button; ignored when `href` is set */
  onClick?: () => void;
  /** top-start chip; defaults to the offer's own type wording */
  startBadge?: ReactNode;
  /** top-end chip; defaults to the saving, and is dropped when `actions` needs
   *  that corner instead */
  endBadge?: ReactNode;
  /** controls pinned to the top-end corner, outside the link/button */
  actions?: ReactNode;
  /** the line under the name — the business behind the offer, a date window */
  footnote?: ReactNode;
  /** desaturates an offer that is switched off, without hiding it */
  muted?: boolean;
  /**
   * Loads the photograph immediately instead of on intersection. A carousel
   * moves its slides with a transform inside an `overflow:hidden` viewport, so
   * a lazy image on slide four is still un-fetched when autoplay brings it
   * into view a few seconds in — the slide arrives empty and fills in late.
   */
  eager?: boolean;
  className?: string;
}) {
  const { t, lang } = useI18n();

  // a src that 404s or is blocked would otherwise leave the browser's broken
  // -image glyph on the card; falling back keeps it looking deliberate
  const [failed, setFailed] = useState(false);
  const cover = failed ? undefined : offer.images[0];
  const discount = offerDiscount(offer);

  const badgeLabel: Record<OfferBadge, string> = {
    limited: t.offers.badgeLimited,
    bestValue: t.offers.badgeBestValue,
    new: t.offers.badgeNew,
  };

  const body = (
    <>
      {cover ? (
        <FadeImage
          src={cover}
          alt=""
          fill
          draggable={false}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          loading={eager ? "eager" : undefined}
          onError={() => setFailed(true)}
          className={cn(
            "transform-gpu object-cover transition-transform duration-500 ease-smooth group-hover:scale-105",
            muted && "grayscale",
          )}
        />
      ) : (
        <span className="flex size-full items-center justify-center bg-berry-soft text-berry-soft-foreground">
          <Tag className="size-8" />
        </span>
      )}

      {/* dark at the foot where the type sits, clear through the middle so the
          photograph is still the thing you look at */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/45"
      />

      <span className="absolute start-3 top-3 flex items-center gap-1.5">
        {startBadge ?? (
          <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white">
            {offer.badge ? badgeLabel[offer.badge] : t.offers.typeGeneric}
          </span>
        )}
      </span>

      {!actions && (
        <span className="absolute end-3 top-3">
          {endBadge ??
            (discount > 0 && (
              <span className="rounded-full bg-zest px-2.5 py-1 text-[11px] font-bold text-zest-foreground">
                {fmt(t.offers.discount, { percent: discount })}
              </span>
            ))}
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-heading text-base font-bold text-white sm:text-lg">
            {offer.name[lang]}
          </h3>
          {footnote && <div className="mt-1.5 min-w-0">{footnote}</div>}
        </div>

        <p className="shrink-0 text-end">
          <Price
            amount={offer.price}
            currency={t.common.currency}
            lang={lang}
            className="block font-heading text-lg font-bold text-zest"
          />
          {offer.originalPrice > offer.price && (
            /* The rule through the old price is drawn rather than set with
               `line-through`: a text decoration sits wherever the font's own
               strikeout metric puts it, and its thickness rounds to whole
               pixels — neither can be placed exactly. Drawn, it sits 2px below
               the middle of the figure at a hairline 1.5px. */
            <span className="relative inline-block text-[13px] font-semibold text-white">
              <Price amount={offer.originalPrice} currency={t.common.currency} lang={lang} />
              <span
                aria-hidden
                className="absolute inset-x-0 top-1/2 mt-[2px] h-[1.5px] bg-zest"
              />
            </span>
          )}
        </p>
      </div>
    </>
  );

  const shell = cn(
    // `min-h` is the floor the aspect ratio sits on: even with the ratio gone
    // the card is still a card, never a hairline
    "group relative block aspect-[16/9] min-h-40 w-full transform-gpu overflow-hidden rounded-2xl border border-border/60 bg-surface-container text-start transition-[border-color,translate] duration-300 ease-smooth",
    (href || onClick) &&
      "cursor-pointer hover:-translate-y-1 hover:border-primary/35",
    className,
  );

  return (
    <div className="relative">
      {href ? (
        <Link href={href} draggable={false} className={shell}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={shell}>
          {body}
        </button>
      ) : (
        <div className={shell}>{body}</div>
      )}

      {/* outside the link so its own clicks never navigate */}
      {actions && <div className="absolute end-2.5 top-2.5 z-10">{actions}</div>}
    </div>
  );
}
