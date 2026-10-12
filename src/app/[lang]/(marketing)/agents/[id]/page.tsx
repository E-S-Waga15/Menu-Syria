import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { BadgeCheck, MapPin, Phone, Store } from "lucide-react";

import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
} from "@/components/shared/brand-icons";
import { AgentRestaurants } from "@/features/marketing/components/agent-restaurants";
import { AgentShareActions } from "@/features/marketing/components/agent-share-actions";
import {
  getAgentByCode,
  getAgentRestaurants,
  getGovernorates,
  getRegions,
} from "@/features/marketing/services";
import { isLocale } from "@/i18n/config";
import { fmt } from "@/i18n/fmt";
import { getDictionary } from "@/i18n/get-dictionary";
import { alternatesFor } from "@/lib/seo/site";

/**
 * Shared links have to introduce the person, not the site: a WhatsApp or
 * Twitter card built from the site-wide description would say nothing about
 * whose page it is. So the name leads, the agent's own bio is the description,
 * and their photo is the preview image — with the platform named inside the OG
 * title, since the layout title template that appends it does not reach Open
 * Graph.
 */
export async function generateMetadata({
  params,
}: PageProps<"/[lang]/agents/[id]">): Promise<Metadata> {
  // the dynamic segment is still folder-named [id], but it carries the
  // agent's public referral code now, not their internal uuid
  const { lang, id: code } = await params;
  if (!isLocale(lang)) return {};

  const [t, agent, governorates, regions] = await Promise.all([
    getDictionary(lang),
    getAgentByCode(code),
    getGovernorates(),
    getRegions(),
  ]);
  if (!agent) return {};

  const governorate =
    governorates.find((g) => g.id === agent.governorateId)?.name[lang] ?? "";
  const region = regions.find((r) => r.id === agent.regionId)?.name[lang] ?? "";

  const name = agent.name[lang];
  const description = agent.bio[lang];
  const values = { name, governorate, region };

  return {
    title: fmt(t.agentPage.metaTitle, values),
    description,
    alternates: alternatesFor(lang, `/agents/${agent.referralCode}`),
    openGraph: {
      type: "profile",
      title: fmt(t.agentPage.metaOgTitle, values),
      description,
      siteName: t.seo.siteName,
      images: [{ url: agent.photoUrl, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title: fmt(t.agentPage.metaOgTitle, values),
      description,
      images: [agent.photoUrl],
    },
  };
}

/**
 * An agent's page answers one question: should I sign up through this person?
 * So it reads top to bottom as that decision — who they are and where they
 * work, then what they say about themselves and how to reach them, then the
 * restaurants they have already signed up as the evidence behind it.
 *
 * One ground throughout: separation comes from the card and its rules, not
 * from banding the page into tinted sections.
 */
export default async function AgentDetailsPage({
  params,
}: PageProps<"/[lang]/agents/[id]">) {
  const { lang, id: code } = await params;
  if (!isLocale(lang)) notFound();

  const [t, agent, governorates, regions] = await Promise.all([
    getDictionary(lang),
    getAgentByCode(code),
    getGovernorates(),
    getRegions(),
  ]);
  if (!agent) notFound();

  const agentRestaurants = await getAgentRestaurants(agent.referralCode);

  const governorateName =
    governorates.find((g) => g.id === agent.governorateId)?.name[lang] ?? "";
  const regionName =
    regions.find((r) => r.id === agent.regionId)?.name[lang] ?? "";

  const socials = [
    {
      label: t.restaurant.call,
      icon: Phone,
      href: `tel:${agent.phone.replace(/\s/g, "")}`,
      className: "bg-muted text-foreground hover:bg-surface-container-high",
    },
    {
      label: t.restaurant.whatsapp,
      icon: WhatsAppIcon,
      href: `https://wa.me/${agent.whatsapp.replace(/[+\s]/g, "")}`,
      className:
        "bg-[#25D366]/10 text-[#128C4A] hover:bg-[#25D366]/20 dark:text-[#4cd97f]",
    },
    agent.facebook && {
      label: t.restaurant.facebook,
      icon: FacebookIcon,
      href: `https://facebook.com/${agent.facebook}`,
      className:
        "bg-[#1877F2]/10 text-[#1462c4] hover:bg-[#1877F2]/20 dark:text-[#6ba8f5]",
    },
    agent.instagram && {
      label: t.restaurant.instagram,
      icon: InstagramIcon,
      href: `https://instagram.com/${agent.instagram}`,
      className:
        "bg-gradient-to-r from-[#f9ce34]/15 via-[#ee2a7b]/15 to-[#6228d7]/15 text-[#c13584] hover:from-[#f9ce34]/25 hover:via-[#ee2a7b]/25 hover:to-[#6228d7]/25 dark:text-[#ef7cae]",
    },
  ].filter(Boolean) as {
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    href: string;
    className: string;
  }[];

  return (
    <main className="container-page pt-28 pb-20 md:pt-32">
      {/* identity — photo and name only; the bio has its own card below */}
      <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-end md:gap-8 md:text-start">
        <div className="relative shrink-0">
          {/* decorative: the name is the heading right beside it */}
          {agent.photoUrl ? (
            <Image
              src={agent.photoUrl}
              alt=""
              width={224}
              height={224}
              priority
              className="size-40 rounded-3xl border-4 border-berry-soft object-cover md:size-48"
            />
          ) : (
            <span className="flex size-40 items-center justify-center rounded-3xl border-4 border-berry-soft bg-berry-soft text-4xl font-bold text-berry-soft-foreground md:size-48">
              {agent.name[lang].charAt(0)}
            </span>
          )}
          <span className="absolute -bottom-2 -end-2 flex size-10 items-center justify-center rounded-2xl bg-primary text-white">
            <BadgeCheck className="size-5" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="label-eyebrow text-primary">
            {fmt(t.agentPage.roleIn, {
              governorate: governorateName,
              region: regionName,
            })}
          </p>
          {/* name leads the row, the two actions sit at its far edge */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:flex-nowrap md:justify-between">
            <h1 className="text-display text-3xl md:text-4xl">
              {agent.name[lang]}
            </h1>
            <AgentShareActions
              agentName={agent.name[lang]}
              agentRole={fmt(t.agentPage.roleIn, {
                governorate: governorateName,
                region: regionName,
              })}
              agentPhotoUrl={agent.photoUrl}
            />
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3.5 py-1.5 text-sm">
              <MapPin className="size-4 text-muted-foreground" />
              {governorateName}
              {lang === "ar" ? "، " : ", "}
              {regionName}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3.5 py-1.5 text-sm font-semibold">
              <Store className="size-4 text-primary" />
              {agent.restaurantsCount} {t.home.agentRestaurantsCount}
            </span>
          </div>
        </div>
      </div>

      {/* what they say about themselves, then how to reach them */}
      <section className="mt-10 rounded-3xl border border-border/60 bg-card p-6 md:mt-12 md:p-8">
        <h2 className="label-eyebrow text-muted-foreground">
          {t.agentPage.about}
        </h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground md:text-lg">
          {agent.bio[lang]}
        </p>

        <div className="mt-8 border-t border-border/60 pt-6">
          <h2 className="font-heading text-lg font-bold">
            {t.agentPage.contactTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t.agentPage.contactHint}
          </p>

          <p className="mt-5 flex items-center gap-2.5 text-base font-semibold">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-berry-soft text-berry-soft-foreground">
              <Phone className="size-4" />
            </span>
            <span dir="ltr">{agent.phone}</span>
          </p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target={social.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-200 ${social.className}`}
              >
                <social.icon className="size-4" />
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <AgentRestaurants
        businesses={agentRestaurants}
        governorates={governorates}
        regions={regions}
        businessesCount={agent.restaurantsCount}
        lang={lang}
        t={t}
      />
    </main>
  );
}
