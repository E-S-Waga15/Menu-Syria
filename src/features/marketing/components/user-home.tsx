"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Heart,
  ShoppingBag,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";

import {
  QuickAccess,
  type QuickAccessItem,
} from "@/components/shared/quick-access";
import { Skeleton } from "@/components/ui/skeleton";
import { RestaurantCard } from "@/features/marketing/components/restaurant-card";
import { getFeaturedRestaurants } from "@/features/marketing/services";
import { OfferBanner } from "@/features/offers/components/offer-banner";
import { getFeaturedOffers } from "@/features/offers/services";
import { getStores } from "@/features/public-store/services";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";

/** how many storefronts each directory teaser shows before deferring */
const TEASER_LIMIT = 3;

/**
 * A section heading in the marketing page's own rhythm: eyebrow, display
 * title, supporting line, and an optional "view all" opposite.
 *
 * The signed-in home is still the same website, so it is built from the same
 * parts as the public one rather than a denser dashboard-style stack.
 */
function SectionHead({
  eyebrow,
  title,
  body,
  href,
  viewAll,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href?: string;
  viewAll?: string;
}) {
  const { lang } = useI18n();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="max-w-2xl">
        <p className="label-eyebrow text-primary">{eyebrow}</p>
        <h2 className="text-display mt-3 text-2xl md:text-4xl">{title}</h2>
        <p className="mt-3 leading-relaxed text-muted-foreground md:text-lg">
          {body}
        </p>
      </div>

      {href && viewAll && (
        <Link
          href={href}
          className="group/all inline-flex shrink-0 items-center gap-1.5 pb-1 text-sm font-bold text-primary transition-colors hover:text-berry-bright"
        >
          {viewAll}
          <Arrow className="size-4 transition-[translate] duration-200 ease-smooth group-hover/all:-translate-x-0.5 rtl:group-hover/all:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

/**
 * The storefront teasers: a rail you drag on a phone, a grid from `sm`.
 *
 * Three cards stacked vertically is most of a phone screen spent on a teaser
 * for a directory the reader has not asked for yet. Side by side they cost one
 * card's height, and the cut-off edge of the next one says there are more
 * without a heading having to. Snap points keep the drag landing on a card
 * rather than half way between two.
 *
 * The negative margin lets the rail bleed to the screen edges while its own
 * padding keeps the first card aligned with the text above it.
 */
function TeaserRail({ children }: { children: React.ReactNode }) {
  return (
    <div className="scrollbar-none -mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 md:gap-6 lg:grid-cols-3">
      {children}
    </div>
  );
}

/**
 * One cell of that rail: a share of the phone's width, a grid cell above it.
 *
 * 72% rather than a full card — the card comes out a little smaller than it is
 * on a desktop, which is what keeps a cover, a name and an address readable at
 * phone size without the card eating the whole screen, and it leaves the next
 * one's edge showing.
 */
function TeaserCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[72%] shrink-0 snap-start sm:w-auto sm:shrink">
      {children}
    </div>
  );
}

/**
 * The home page a signed-in customer gets instead of the marketing site.
 *
 * The pitch is already won, so it opens on what changes between visits — the
 * offers banner — then the places they actually go, then the two directories.
 *
 * One continuous ground, no alternating bands: a signed-in home is a place to
 * get something done, and tinted stripes turn a short list of sections into a
 * sequence of landing-page pitches. What separates the sections instead is one
 * spacing step used everywhere — every band gets the same `py`, every heading
 * the same gap to its content — so the rhythm is predictable rather than
 * decorative.
 *
 * Data is fetched here rather than on the server page so an anonymous visitor,
 * who never sees this, does not pay for the requests.
 */
export function UserHome() {
  const { t, lang } = useI18n();

  const { data: offers } = useQuery({
    queryKey: queryKeys.offers.featured,
    queryFn: () => getFeaturedOffers(6),
  });
  const { data: restaurants } = useQuery({
    queryKey: queryKeys.restaurants.featured,
    queryFn: getFeaturedRestaurants,
  });
  const { data: stores } = useQuery({
    queryKey: ["stores"],
    queryFn: getStores,
  });

  const quickAccess: QuickAccessItem[] = [
    {
      href: `/${lang}/restaurants`,
      label: t.nav.restaurants,
      hint: t.userHome.restaurantsHint,
      icon: UtensilsCrossed,
    },
    {
      href: `/${lang}/stores`,
      label: t.nav.stores,
      hint: t.userHome.storesHint,
      icon: ShoppingBag,
    },
    {
      href: `/${lang}/favorites`,
      label: t.nav.myFavorites,
      hint: t.userHome.favoritesHint,
      icon: Heart,
    },
    {
      href: `/${lang}/notifications`,
      label: t.notifications.title,
      hint: t.userHome.notificationsHint,
      icon: Bell,
    },
    {
      href: `/${lang}/profile`,
      label: t.nav.accountInfo,
      hint: t.userHome.profileHint,
      icon: UserRound,
    },
  ];

  return (
    <main>
      {/* the site header is fixed, so the first band clears it exactly the way
          the marketing hero does */}
      <section className="pt-32 pb-10 md:pt-40 md:pb-14">
        <div className="container-page">
          <SectionHead
            eyebrow={t.userHome.offersEyebrow}
            title={t.userHome.offersTitle}
            body={t.userHome.offersBody}
          />

          {!offers ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[16/9] rounded-2xl" />
              ))}
            </div>
          ) : offers.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              {t.userHome.noOffers}
            </p>
          ) : (
            <div className="mt-8">
              <OfferBanner offers={offers} />
            </div>
          )}
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container-page">
          <SectionHead
            eyebrow={t.userHome.quickAccessEyebrow}
            title={t.userHome.quickAccess}
            body={t.userHome.quickAccessBody}
          />
          <div className="mt-8">
            <QuickAccess items={quickAccess} />
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container-page">
          <SectionHead
            eyebrow={t.userHome.storesEyebrow}
            title={t.userHome.featuredStores}
            body={t.userHome.storesBody}
            href={`/${lang}/stores`}
            viewAll={t.common.viewAll}
          />
          <TeaserRail>
            {!stores
              ? Array.from({ length: TEASER_LIMIT }).map((_, i) => (
                  <TeaserCell key={i}>
                    <Skeleton className="h-44 rounded-2xl sm:h-52" />
                  </TeaserCell>
                ))
              : stores.slice(0, TEASER_LIMIT).map((store) => (
                  <TeaserCell key={store.id}>
                    <RestaurantCard
                      restaurant={store}
                      locationLabel={store.address[lang]}
                    />
                  </TeaserCell>
                ))}
          </TeaserRail>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container-page">
          <SectionHead
            eyebrow={t.userHome.restaurantsEyebrow}
            title={t.userHome.featuredRestaurants}
            body={t.userHome.restaurantsBody}
            href={`/${lang}/restaurants`}
            viewAll={t.common.viewAll}
          />
          <TeaserRail>
            {!restaurants
              ? Array.from({ length: TEASER_LIMIT }).map((_, i) => (
                  <TeaserCell key={i}>
                    <Skeleton className="h-44 rounded-2xl sm:h-52" />
                  </TeaserCell>
                ))
              : restaurants.slice(0, TEASER_LIMIT).map((restaurant) => (
                  <TeaserCell key={restaurant.id}>
                    <RestaurantCard
                      restaurant={restaurant}
                      locationLabel={restaurant.address[lang]}
                    />
                  </TeaserCell>
                ))}
          </TeaserRail>
        </div>
      </section>
    </main>
  );
}
