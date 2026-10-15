import { notFound } from "next/navigation";

import { AuthBackButton } from "@/components/shared/auth-back-button";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Logo } from "@/components/shared/logo";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function AuthLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getDictionary(lang);

  return (
    <div className="relative flex min-h-dvh flex-col bg-gradient-to-b from-background to-surface-container-low">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo lang={lang} brand={t.common.brand} />
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
        </div>
      </header>

      {/* its own row, clear of both the header above and the card the page
          centres below — a control for leaving the screen, not a detail
          riding on the card's own border */}
      <div className="container-page mt-3 sm:mt-4">
        <AuthBackButton />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 pt-6 pb-10">
        {children}
      </main>
    </div>
  );
}
