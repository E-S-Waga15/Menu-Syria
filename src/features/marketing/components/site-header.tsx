"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ChevronDown, Menu } from "lucide-react";

import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useHydratedSession } from "@/features/auth/use-hydrated-session";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { ProfileMenu } from "@/features/marketing/components/profile-menu";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const { t, lang, dir } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { session, hydrated } = useHydratedSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: `/${lang}`, label: t.nav.home },
    { href: `/${lang}/restaurants`, label: t.nav.restaurants },
    { href: `/${lang}/stores`, label: t.nav.stores },
    { href: `/${lang}/agents`, label: t.nav.agents },
    { href: `/${lang}/about`, label: t.nav.about },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-300",
        scrolled
          ? "border-border/70 bg-background/80 shadow-soft backdrop-blur-xl"
          : "border-transparent bg-transparent",
      )}
    >
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Menu"
                />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <Logo lang={lang} brand={t.common.brand} />
          </div>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-accent hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <LanguageSwitcher className="hidden sm:inline-flex" />
            {hydrated && session ? (
              <>
                <NotificationBell href={`/${lang}/notifications`} ids={[]} />
                <ProfileMenu session={session} />
              </>
            ) : (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button className="gap-1 font-semibold" />}
                  >
                    {t.nav.login}
                    <ChevronDown className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-64">
                    <DropdownMenuItem render={<Link href={`/${lang}/login`} />}>
                      {t.nav.loginBusiness}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      render={<Link href={`/${lang}/login/user`} />}
                    >
                      {t.nav.loginCustomer}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  className="hidden border-[1.5px] border-primary/40 font-semibold text-primary hover:bg-berry-soft/40 hover:text-primary md:inline-flex"
                  render={<Link href={`/${lang}#sectors`} />}
                >
                  {t.nav.createStore}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* opens from the inline-start edge — the side the trigger sits on:
            right in Arabic, left in English. Driven by `dir`, not a hardcoded
            "ar", so any future RTL locale is covered too. */}
        <SheetContent
          side={dir === "rtl" ? "right" : "left"}
          showCloseButton={false}
        >
          <SheetHeader>
            <SheetTitle>{t.common.brand}</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-base font-semibold transition-colors hover:bg-accent"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-2">
              <LanguageSwitcher className="self-center" />
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
