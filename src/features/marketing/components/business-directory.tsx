"use client";

import { useMemo } from "react";

import { Search } from "lucide-react";

import {
  DIRECTORY_PAGE_SIZE,
  Pagination,
} from "@/components/shared/pagination";
import { GovernorateRegionSelect } from "@/components/shared/governorate-region-select";
import { Input } from "@/components/ui/input";
import { RestaurantCard } from "@/features/marketing/components/restaurant-card";
import type { Business, Governorate, LocalizedText, Region } from "@/lib/types";
import {
  useFilterParam,
  usePageParam,
  useSearchParam,
} from "@/lib/url-state";

const ALL = "all";

interface DirectoryCopy {
  searchPlaceholder: string;
  governorateLabel: string;
  regionLabel: string;
  allGovernorates: string;
  allRegions: string;
  noResults: string;
}

/**
 * Shared restaurants/stores directory: search-by-name plus governorate and
 * region filters, running locally over the server-fetched (SSR) list — same
 * pattern as `AgentsDirectory`. Card rendering is delegated to
 * `RestaurantCard` for both business types.
 *
 * Server pages can't pass callback props across the client boundary, so
 * location labels and hrefs are built here from plain data (governorates,
 * regions) rather than caller-supplied functions.
 */
export function BusinessDirectory<
  T extends Business & { category?: LocalizedText },
>({
  items,
  governorates,
  regions,
  lang,
  copy,
}: {
  items: T[];
  governorates: Governorate[];
  regions: Region[];
  lang: "ar" | "en";
  copy: DirectoryCopy;
}) {
  const [search, setSearch] = useSearchParam("q");
  const [governorateId, setGovernorateId] = useFilterParam("governorateId");
  const [regionId, setRegionId] = useFilterParam("regionId");
  const [page, setPage] = usePageParam();

  const separator = lang === "ar" ? "، " : ", ";
  const locationLabel = (item: T) => {
    const gov = governorates.find((g) => g.id === item.governorateId)?.name[
      lang
    ];
    const region = regions.find((r) => r.id === item.regionId)?.name[lang];
    const base = [gov, region].filter(Boolean).join(separator);
    return item.category ? `${base} · ${item.category[lang]}` : base;
  };

  const regionChoices = useMemo(
    () =>
      regions.filter(
        (r) => governorateId === ALL || r.governorateId === governorateId,
      ),
    [regions, governorateId],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (governorateId !== ALL && item.governorateId !== governorateId)
        return false;
      if (regionId !== ALL && item.regionId !== regionId) return false;
      if (
        q &&
        !item.name.ar.toLowerCase().includes(q) &&
        !item.name.en.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [items, search, governorateId, regionId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / DIRECTORY_PAGE_SIZE));
  const pageItems = filtered.slice(
    (page - 1) * DIRECTORY_PAGE_SIZE,
    page * DIRECTORY_PAGE_SIZE,
  );

  /** any filter change starts back at page 1 — a narrowed result set that
   * keeps the old page number could land past the new last page */
  const onSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const onGovernorateChange = (value: string) => {
    setGovernorateId(value);
    setRegionId(ALL);
    setPage(1);
  };
  const onRegionChange = (value: string) => {
    setRegionId(value);
    setPage(1);
  };

  const governorateItems = {
    [ALL]: copy.allGovernorates,
    ...Object.fromEntries(governorates.map((gov) => [gov.id, gov.name[lang]])),
  };
  const regionItems = {
    [ALL]: copy.allRegions,
    ...Object.fromEntries(
      regionChoices.map((region) => [region.id, region.name[lang]]),
    ),
  };

  return (
    <div>
      {/* search + filters */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className="h-11 rounded-full ps-10"
          />
        </div>

        <GovernorateRegionSelect
          unwrapped
          triggerClassName="rounded-full"
          governorateValue={governorateId}
          onGovernorateChange={onGovernorateChange}
          governorateItems={governorateItems}
          governorateAriaLabel={copy.governorateLabel}
          regionValue={regionId}
          onRegionChange={onRegionChange}
          regionItems={regionItems}
          regionAriaLabel={copy.regionLabel}
        />
      </div>

      {/* results */}
      <div className="mt-8">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-14 text-center text-muted-foreground">
            {copy.noResults}
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((item) => (
                <RestaurantCard
                  key={item.id}
                  restaurant={item}
                  href={`/${item.slug}`}
                  locationLabel={locationLabel(item)}
                />
              ))}
            </div>
            <div className="mt-8">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
