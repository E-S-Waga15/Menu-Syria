import Link from "next/link";

import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RestaurantCard } from "@/features/marketing/components/restaurant-card";
import type { Locale } from "@/i18n/config";
import { fmt } from "@/i18n/fmt";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Business, Governorate, Region } from "@/lib/types";

/**
 * Server component — the agent's registered businesses ship as crawlable
 * HTML. Only the favorite button inside each card hydrates on the client.
 *
 * The backend's list mixes restaurants and stores, so this takes the shared
 * `Business` shape and uses neutral wording instead of restaurant-specific
 * copy — showing a store under a "restaurants" heading used to be wrong
 * whenever an agent's list included one.
 */
export function AgentRestaurants({
  businesses,
  governorates,
  regions,
  businessesCount,
  lang,
  t,
}: {
  businesses: Business[];
  governorates: Governorate[];
  regions: Region[];
  businessesCount: number;
  lang: Locale;
  t: Dictionary;
}) {
  const separator = lang === "ar" ? "، " : ", ";
  const locationLabel = (governorateId: string, regionId: string) => {
    const gov = governorates.find((g) => g.id === governorateId)?.name[lang];
    const region = regions.find((r) => r.id === regionId)?.name[lang];
    return [gov, region].filter(Boolean).join(separator);
  };

  const ViewAllArrow = lang === "ar" ? ArrowLeft : ArrowRight;
  // a mixed list has no single matching directory to send "view all" to —
  // only offer the button when every business shown is the same kind
  const allRestaurants = businesses.every((b) => "cuisine" in b);
  const allStores = businesses.every((b) => "category" in b);
  const viewAllHref = allRestaurants
    ? `/${lang}/restaurants`
    : allStores
      ? `/${lang}/stores`
      : null;

  return (
    <section className="mt-14 border-t border-border/60 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold">
            {t.agentPage.partnerBusinesses}
          </h2>
          <p className="mt-1.5 text-sm font-semibold text-muted-foreground">
            {fmt(t.agentPage.businessesCount, { count: businessesCount })}
          </p>
        </div>
        {viewAllHref && (
          <Button
            variant="outline"
            className="rounded-full"
            render={<Link href={viewAllHref} />}
          >
            {t.agentPage.viewAllBusinesses}
            <ViewAllArrow className="size-4" />
          </Button>
        )}
      </div>

      <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {businesses.slice(0, 4).map((business) => (
          <RestaurantCard
            key={business.id}
            restaurant={business}
            locationLabel={locationLabel(
              business.governorateId,
              business.regionId,
            )}
          />
        ))}
      </div>
    </section>
  );
}
