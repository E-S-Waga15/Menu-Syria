import Image from "next/image";
import Link from "next/link";

import { ArrowLeft, ArrowRight, MapPin, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import type { Agent, Governorate } from "@/lib/types";

/** the home page shows a shortlist; the full network lives on /agents */
const PREVIEW_COUNT = 5;

/**
 * The agent network, previewed.
 *
 * An agent is the route in, not a support line: usually a local food creator
 * who knows the area's restaurants and signs them up. So the cards lead to the
 * agent's own page — where their work, their restaurants and their referral
 * code live — rather than firing off a phone call from a card that has not yet
 * explained who the person is.
 *
 * No filtering here on purpose either: picking a governorate on the home page
 * meant a visitor could land on an empty grid before they knew what an agent
 * was. The shortlist shows the network exists and hands off to the directory,
 * which is where searching belongs. With no state left, this renders on the
 * server.
 */
export function AgentsSection({
  lang,
  t,
  agents,
  governorates,
}: {
  lang: Locale;
  t: Dictionary;
  agents: Agent[];
  governorates: Governorate[];
}) {
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;
  const preview = agents.slice(0, PREVIEW_COUNT);

  const governorateName = (id: string) =>
    governorates.find((g) => g.id === id)?.name[lang] ?? "";

  return (
    <section id="agents" className="scroll-mt-20 py-16 md:py-24">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="label-eyebrow text-primary">{t.home.agentsEyebrow}</p>
            <h2 className="text-display mt-3 text-3xl md:text-4xl">
              {t.home.agentsTitle}
            </h2>
            <p className="mt-4 text-muted-foreground md:text-lg">
              {t.home.agentsBody}
            </p>
          </div>

          <Link
            href={`/${lang}/agents`}
            className="group/all inline-flex shrink-0 items-center gap-1.5 pb-1 text-sm font-bold text-primary transition-colors hover:text-berry-bright"
          >
            {t.home.agentsViewAll}
            <Arrow className="size-4 transition-[translate] duration-200 ease-smooth group-hover/all:-translate-x-0.5 rtl:group-hover/all:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {preview.map((agent) => (
            <article
              key={agent.id}
              className="group relative transform-gpu overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition-[translate,scale,border-color] duration-300 ease-smooth hover:-translate-y-0.5 hover:border-primary/35"
            >
              {/* business-card accent stripe */}
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
                  <h3 className="truncate font-heading font-semibold group-hover:text-primary">
                    {agent.name[lang]}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {governorateName(agent.governorateId)}
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
    </section>
  );
}
