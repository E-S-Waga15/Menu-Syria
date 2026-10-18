import type { Metadata } from "next";
import { Cairo, Epilogue, Geist_Mono, Manrope } from "next/font/google";
import { notFound } from "next/navigation";

import { Analytics } from "@vercel/analytics/next";
import { DirectionProvider } from "@base-ui/react/direction-provider";

import { I18nProvider } from "@/i18n/client";
import { isLocale, localeDirections, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { alternatesFor, SITE_URL } from "@/lib/seo/site";
import { AppProviders } from "@/providers/app-providers";

import "../globals.css";

const epilogue = Epilogue({
  variable: "--font-epilogue",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getDictionary(lang);

  return {
    metadataBase: new URL(SITE_URL),
    applicationName: t.seo.siteName,
    authors: [{ name: t.seo.siteName, url: SITE_URL }],
    creator: t.seo.siteName,
    publisher: t.seo.siteName,
    title: {
      default: t.seo.homeTitle,
      template: `%s | ${t.seo.siteName}`,
    },
    description: t.seo.homeDescription,
    keywords: t.seo.keywords,
    alternates: alternatesFor(lang, ""),
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon.png", type: "image/png", sizes: "512x512" },
      ],
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    },
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      siteName: t.seo.siteName,
      locale: lang === "ar" ? "ar_SY" : "en_US",
      title: t.seo.homeTitle,
      description: t.seo.homeDescription,
      url: `${SITE_URL}/${lang}`,
      images: [
        {
          url: `${SITE_URL}/${lang}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: t.seo.homeTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t.seo.homeTitle,
      description: t.seo.homeDescription,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dir = localeDirections[lang];
  const dictionary = await getDictionary(lang);

  return (
    <html
      lang={lang}
      dir={dir}
      suppressHydrationWarning
      className={`${epilogue.variable} ${manrope.variable} ${cairo.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla) inject
          attributes into <body> before React hydrates — harmless, so ignore */}
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        <DirectionProvider direction={dir}>
          <I18nProvider lang={lang} dictionary={dictionary}>
            <AppProviders>{children}</AppProviders>
          </I18nProvider>
        </DirectionProvider>
        <Analytics />
      </body>
    </html>
  );
}
