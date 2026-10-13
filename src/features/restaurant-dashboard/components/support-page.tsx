"use client";

import { useQuery } from "@tanstack/react-query";

import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { SupportSection } from "@/features/restaurant-dashboard/components/business-profile";
import { getMyRestaurant } from "@/features/restaurant-dashboard/services";
import { getGovernorates, getRegions } from "@/features/marketing/services";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";

/** Its own sidebar page (not a settings tab) so an owner can reach "who do
 * I contact" without having to find it buried in Settings. */
export function SupportPage() {
  const { t, lang } = useI18n();

  const { data: restaurant } = useQuery({
    queryKey: queryKeys.me.business,
    queryFn: getMyRestaurant,
  });
  const { data: governorates } = useQuery({
    queryKey: queryKeys.governorates,
    queryFn: getGovernorates,
  });
  const { data: regions } = useQuery({
    queryKey: queryKeys.regions,
    queryFn: getRegions,
  });

  if (!restaurant) return <LoadingSpinner />;

  return (
    <SupportSection
      restaurant={restaurant}
      governorates={governorates}
      regions={regions}
      t={t}
      lang={lang}
    />
  );
}
