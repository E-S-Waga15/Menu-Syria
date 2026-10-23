"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { MapPin, Search, Store, X } from "lucide-react";

import { GovernorateRegionSelect } from "@/components/shared/governorate-region-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmt, useI18n } from "@/i18n/client";
import type { Agent, Governorate, Region } from "@/lib/types";

const ALL = "all";

/**
 * Data arrives from the server (SSR — the directory is in the initial HTML);
 * search and filters run locally on the hydrated list.
 *
 * The controls sit in their own panel rather than floating loose above the
 * grid, and the result count sits between the two — the one spot where it
 * answers a question the reader is actually asking.
 *
 * Cards carry one action, "view details". Calling an agent is a decision you
 * make after reading who they are and which restaurants they have signed up,
 * so the phone and WhatsApp buttons live on the agent's own page now.
 */
export function AgentsDirectory({
  agents,
  governorates,
  regions,
}: {
  agents: Agent[];
  governorates: Governorate[];
  regions: Region[];
}) {
  const { t, lang } = useI18n();

  const [search, setSearch] = useState("");
  const [governorateId, setGovernorateId] = useState(ALL);
  const [regionId, setRegionId] = useState(ALL);

  const hasFilters =
    search.trim() !== "" || governorateId !== ALL || regionId !== ALL;

  const clearFilters = () => {
    setSearch("");
    setGovernorateId(ALL);
    setRegionId(ALL);
  };

  // regions narrow to the picked governorate
  const regionChoices = useMemo(
    () =>
      regions.filter(
        (r) => governorateId === ALL || r.governorateId === governorateId,
      ),
    [regions, governorateId],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter((agent) => {
      if (governorateId !== ALL && agent.governorateId !== governorateId)
        return false;
      if (regionId !== ALL && !agent.regionIds.includes(regionId)) return false;
      if (
        q &&
        !agent.name.ar.toLowerCase().includes(q) &&
        !agent.name.en.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [agents, search, governorateId, regionId]);

  const governorateName = (id: string) =>
    governorates.find((g) => g.id === id)?.name[lang] ?? "";
  const regionName = (id: string) =>
    regions.find((r) => r.id === id)?.name[lang] ?? "";
  const regionNames = (ids: string[]) =>
    ids
      .map(regionName)
      .filter(Boolean)
      .join(lang === "ar" ? " و" : " & ");

  const governorateItems = {
    [ALL]: t.agentsPage.allGovernorates,
    ...Object.fromEntries(governorates.map((gov) => [gov.id, gov.name[lang]])),
  };
  const regionItems = {
    [ALL]: t.agentsPage.allRegions,
    ...Object.fromEntries(
      regionChoices.map((region) => [region.id, region.name[lang]]),
    ),
  };

  return (
    <div>
      <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="label-eyebrow text-muted-foreground">
            {t.agentsPage.filtersLabel}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-berry-soft/40"
            >
              <X className="size-3.5" />
              {t.agentsPage.clearFilters}
            </button>
          )}
        </div>

        <div className="mt-3.5 grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.agentsPage.searchPlaceholder}
              aria-label={t.agentsPage.searchPlaceholder}
              className="h-11 rounded-full ps-11"
            />
          </div>

          <GovernorateRegionSelect
            unwrapped
            triggerClassName="rounded-full"
            governorateValue={governorateId}
            onGovernorateChange={(value) => {
              setGovernorateId(value);
              setRegionId(ALL);
            }}
            governorateItems={governorateItems}
            governorateAriaLabel={t.agentsPage.governorate}
            regionValue={regionId}
            onRegionChange={setRegionId}
            regionItems={regionItems}
            regionAriaLabel={t.agentsPage.region}
          />
        </div>
      </div>

      <p
        className="mt-6 text-sm font-semibold text-muted-foreground"
        aria-live="polite"
      >
        {filtered.length === 1
          ? t.agentsPage.resultsOne
          : fmt(t.agentsPage.resultsCount, { count: filtered.length })}
      </p>

      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-14 text-center text-muted-foreground">
            {t.agentsPage.noResults}
          </div>
        )}

        {filtered.map((agent) => (
          <article
            key={agent.id}
            className="group relative overflow-hidden rounded-2xl border border-border/60 transform-gpu bg-card p-5 transition-[translate,scale,border-color] duration-300 ease-smooth hover:-translate-y-0.5 hover:border-primary/35"
          >
            <div className="absolute inset-y-0 start-0 w-1 bg-gradient-to-b from-primary to-zest" />

            <Link
              href={`/${lang}/agents/${agent.referralCode}`}
              className="flex items-center gap-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {agent.photoUrl ? (
                <Image
                  unoptimized
                  src={agent.photoUrl}
                  alt=""
                  width={64}
                  height={64}
                  className="size-16 shrink-0 rounded-full border-2 border-berry-soft object-cover"
                />
              ) : (
                <span className="flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-berry-soft bg-berry-soft text-sm font-bold text-berry-soft-foreground">
                  {agent.name[lang].charAt(0)}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="truncate font-heading font-semibold group-hover:text-primary">
                  {agent.name[lang]}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {governorateName(agent.governorateId)}
                    {lang === "ar" ? "، " : ", "}
                    {regionNames(agent.regionIds)}
                  </span>
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Store className="size-3.5 shrink-0" />
                  {agent.restaurantsCount} {t.home.agentRestaurantsCount}
                </p>
              </div>
            </Link>

            <Button
              variant="outline"
              size="sm"
              className="mt-5 w-full border-[1.5px] group-hover:border-primary/40 group-hover:text-primary"
              render={<Link href={`/${lang}/agents/${agent.referralCode}`} />}
            >
              {t.home.agentViewDetails}
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
