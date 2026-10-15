import Image from "next/image";
import Link from "next/link";

import { Mail, Phone } from "lucide-react";

import codeMastersLogo from "@/assets/logo-code-masters.png";
import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
} from "@/components/shared/brand-icons";
import { Logo } from "@/components/shared/logo";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import {
  PLATFORM_EMAIL,
  PLATFORM_FACEBOOK_URL,
  PLATFORM_INSTAGRAM_URL,
  PLATFORM_PHONE,
  PLATFORM_PHONE_DISPLAY,
  PLATFORM_WHATSAPP_URL,
} from "@/lib/platform-contact";

/** the developer's site — external, so it opens in a new tab */
const CODE_MASTERS_URL = "https://code-masters-gray.vercel.app/";

/**
 * Code Masters' brand purple is #8441A4, which only clears 2.6:1 against this
 * footer's near-black ground — below the 4.5:1 AA floor. This is the same hue
 * lightened to sit at ~7:1, so the brand still reads as itself.
 */
const CODE_MASTERS_INK = "#8441A4";

/** Syrian flag — green / white / black with three red stars. */
const STAR =
  "M0,-2.2 L0.53,-0.73 L2.09,-0.68 L0.86,0.28 L1.29,1.78 L0,0.9 L-1.29,1.78 L-0.86,0.28 L-2.09,-0.68 L-0.53,-0.73 Z";

function SyriaFlag() {
  return (
    <svg
      viewBox="0 0 30 20"
      className="h-auto w-[22px] shrink-0 rounded-[3px]"
      aria-hidden
    >
      <rect width="30" height="20" fill="#006C35" />
      <rect y="6.67" width="30" height="6.66" fill="#FFFFFF" />
      <rect y="13.33" width="30" height="6.67" fill="#000000" />
      {[7.5, 15, 22.5].map((x) => (
        <path
          key={x}
          d={STAR}
          fill="#CE1126"
          transform={`translate(${x},10)`}
        />
      ))}
    </svg>
  );
}

export function SiteFooter({ lang, t }: { lang: Locale; t: Dictionary }) {
  const year = new Date().getFullYear();

  const quickLinks = [
    { href: `/${lang}#services`, label: t.nav.services },
    { href: `/${lang}/restaurants`, label: t.nav.restaurants },
    { href: `/${lang}/stores`, label: t.nav.stores },
    { href: `/${lang}/agents`, label: t.nav.agents },
    { href: `/${lang}/about`, label: t.nav.about },
    { href: `/${lang}#sectors`, label: t.nav.createStore },
  ];

  // Colours in here are pinned, not tokenised. The band is dark in both
  // themes, so anything inside it reading from a theme token shifted shade
  // while the ground under it did not. Pinned to the light-mode values, so the
  // footer looks identical whichever theme is on.
  return (
    <footer className="bg-[#141617] text-white/80">
      {/* six columns so the brand can take two: the responsive logo lockup is
          ~214px wide at lg and would overflow a fifth of the container */}
      <div className="container-page grid gap-x-8 gap-y-12 py-16 md:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-4 md:col-span-2">
          <Logo lang={lang} brand={t.common.brand} inverted />
          <p className="max-w-xs text-sm leading-relaxed text-white/60">
            {t.footer.about}
          </p>
        </div>

        <nav aria-label={t.footer.linksTitle}>
          <h3 className="label-eyebrow mb-4 text-[#fe9800]">
            {t.footer.linksTitle}
          </h3>
          <ul className="space-y-2.5">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t.footer.legalTitle}>
          <h3 className="label-eyebrow mb-4 text-[#fe9800]">
            {t.footer.legalTitle}
          </h3>
          <ul className="space-y-2.5">
            <li>
              <Link
                href={`/${lang}/privacy`}
                className="text-sm transition-colors hover:text-white"
              >
                {t.footer.privacy}
              </Link>
            </li>
            <li>
              <Link
                href={`/${lang}/terms`}
                className="text-sm transition-colors hover:text-white"
              >
                {t.footer.terms}
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h3 className="label-eyebrow mb-4 text-[#fe9800]">
            {t.footer.contactTitle}
          </h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 text-white/40" />
              <a href={`tel:${PLATFORM_PHONE}`} dir="ltr" className="hover:text-white">
                {PLATFORM_PHONE_DISPLAY}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 text-white/40" />
              <a
                href={`mailto:${PLATFORM_EMAIL}`}
                dir="ltr"
                className="hover:text-white"
              >
                {PLATFORM_EMAIL}
              </a>
            </li>
          </ul>
          <div className="mt-5 flex gap-2">
            {[
              { icon: InstagramIcon, label: "Instagram", href: PLATFORM_INSTAGRAM_URL },
              { icon: FacebookIcon, label: "Facebook", href: PLATFORM_FACEBOOK_URL },
              { icon: WhatsAppIcon, label: "WhatsApp", href: PLATFORM_WHATSAPP_URL },
            ].map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex size-9 items-center justify-center rounded-lg bg-white/5 transition-colors hover:bg-primary hover:text-white"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        {/* The studio behind the platform. The whole column is dir="ltr" —
            heading and card are both Latin, so they share one alignment
            instead of the heading flipping to the RTL edge on Arabic pages.
            Grid placement is unaffected: slots follow the container's dir. */}
        <div dir="ltr">
          {/* spelled out rather than `label-eyebrow`: globals.css narrows that
              utility's tracking to 0.02em under html[lang="ar"], and at
              specificity (0,2,1) it beats any tracking utility layered on top.
              This heading is Latin in both locales, so it keeps the wide
              tracking the eyebrow has on English pages. */}
          <h3 className="mb-4 text-xs leading-4 font-bold tracking-[0.09em] text-[#fe9800] uppercase">
            {t.footer.poweredBy}
          </h3>
          {/* inline-flex, so the card hugs its content rather than stretching
              to the full column — and to the full screen on a phone */}
          <a
            href={CODE_MASTERS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors hover:border-white/25 hover:bg-white/10"
          >
            {/* decorative: the studio name is spelled out beside it */}
            <Image
              src={codeMastersLogo}
              alt=""
              className="size-8 shrink-0 object-contain"
            />
            <span
              className="text-sm font-bold tracking-wide"
              style={{ color: CODE_MASTERS_INK }}
            >
              {t.footer.codeMasters}
            </span>
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page space-y-3 py-5">
          <p className="flex items-center gap-2 text-xs font-medium text-white/60">
            {t.footer.madeIn}
            <SyriaFlag />
          </p>
          <p className="text-center text-xs text-white/40">
            © {year} {t.common.brand} — {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
