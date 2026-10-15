"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
  LogOut,
  Moon,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

export interface AccountMenuSession {
  name: string;
  identifier: string;
  avatarUrl?: string;
}

export interface AccountMenuNavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

/** A field that unfolds its option list directly beneath itself (in-flow,
 * pushing the rest of the panel down) instead of floating a popup — the
 * chevron flips to point up while open. */
function ExpandableField({
  label,
  icon: Icon,
  valueLabel,
  open,
  onToggle,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  valueLabel: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="px-0.5 text-xs">{label}</Label>
      <div className="rounded-lg border border-input">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex h-10 w-full items-center gap-2 px-3 text-sm font-semibold"
        >
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-start">{valueLabel}</span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </button>
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-smooth"
          style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="space-y-0.5 border-t border-input p-1.5">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Everything below the trigger — a separate component so its own
 * open/closed accordion state is local and naturally resets each time the
 * panel mounts, instead of being reset by an effect. */
function AccountPanel({
  session,
  panelRef,
  style,
  onClose,
  navItems,
  go,
  lang,
  languageItems,
  setLocale,
  currentThemeMode,
  themeIcons,
  themeItems,
  setTheme,
  handleLogout,
  t,
}: {
  session: AccountMenuSession;
  panelRef: React.RefObject<HTMLDivElement | null>;
  style: React.CSSProperties;
  onClose: () => void;
  navItems: AccountMenuNavItem[];
  go: (href: string) => void;
  lang: Locale;
  languageItems: Record<Locale, string>;
  setLocale: (locale: Locale) => void;
  currentThemeMode: "light" | "dark";
  themeIcons: Record<
    "light" | "dark",
    React.ComponentType<{ className?: string }>
  >;
  themeItems: Record<"light" | "dark", string>;
  setTheme: (mode: string) => void;
  handleLogout: () => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const [languageOpen, setLanguageOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const ThemeIcon = themeIcons[currentThemeMode];

  return (
    <div
      ref={panelRef}
      style={style}
      className="animate-fade-up fixed inset-0 z-[60] overflow-y-auto bg-popover p-4 text-popover-foreground md:inset-auto md:w-80 md:max-h-[calc(100vh-96px)] md:rounded-2xl md:border md:border-border/60 md:p-3"
    >
      <div className="flex items-center gap-3 rounded-xl px-1.5 py-2">
        <Avatar
          session={session}
          className="size-11 shrink-0 rounded-full"
          size={44}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{session.name}</p>
          <p className="truncate text-xs text-muted-foreground" dir="ltr">
            {session.identifier}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-accent md:hidden"
        >
          <X className="size-5" />
        </button>
      </div>

      {navItems.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-border/60">
          {navItems.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => go(item.href)}
              className="flex w-full items-center gap-3 border-b border-border/60 px-3.5 py-3 text-sm font-semibold last:border-b-0 hover:bg-accent"
            >
              <item.icon className="size-4 shrink-0 text-muted-foreground" />
              {item.label}
              <ChevronRight className="ms-auto size-4 shrink-0 text-muted-foreground/60 rtl:rotate-180" />
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 mb-1.5 px-1.5 text-xs font-semibold text-muted-foreground">
        {t.common.settings}
      </p>

      <div className="space-y-3 px-0.5">
        <ExpandableField
          label={t.common.language}
          icon={Globe}
          valueLabel={languageItems[lang]}
          open={languageOpen}
          onToggle={() => setLanguageOpen((v) => !v)}
        >
          {Object.entries(languageItems).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setLanguageOpen(false);
                setLocale(value as Locale);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm font-semibold transition-colors",
                lang === value
                  ? "bg-berry-soft/50 text-primary"
                  : "text-foreground/80 hover:bg-accent",
              )}
            >
              {label}
              {lang === value && <Check className="size-3.5" />}
            </button>
          ))}
        </ExpandableField>

        <ExpandableField
          label={t.common.theme}
          icon={ThemeIcon}
          valueLabel={themeItems[currentThemeMode]}
          open={themeOpen}
          onToggle={() => setThemeOpen((v) => !v)}
        >
          {Object.entries(themeItems).map(([value, label]) => {
            const OptIcon = themeIcons[value as keyof typeof themeIcons];
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setThemeOpen(false);
                  setTheme(value);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-semibold transition-colors",
                  currentThemeMode === value
                    ? "bg-berry-soft/50 text-primary"
                    : "text-foreground/80 hover:bg-accent",
                )}
              >
                <OptIcon className="size-4 shrink-0" />
                <span className="flex-1 text-start">{label}</span>
                {currentThemeMode === value && (
                  <Check className="size-3.5 shrink-0" />
                )}
              </button>
            );
          })}
        </ExpandableField>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-3 flex w-full items-center gap-2 rounded-xl border border-destructive/20 px-3.5 py-3 text-sm font-semibold text-destructive hover:bg-destructive/8"
      >
        <LogOut className="size-4" />
        {t.auth.logout}
      </button>
    </div>
  );
}

function Avatar({
  session,
  className,
  size,
}: {
  session: AccountMenuSession;
  className: string;
  size: number;
}) {
  return session.avatarUrl ? (
    <Image
      src={session.avatarUrl}
      alt=""
      width={size}
      height={size}
      unoptimized
      className={`${className} object-cover`}
    />
  ) : (
    // Pinned rather than `bg-berry-soft`: that token inverts between themes
    // (pale pink to near-black), so the same person's avatar changed identity
    // when the theme flipped. One chip, both themes.
    <span
      className={`${className} flex items-center justify-center bg-[#ffd9de] text-[#90003b]`}
    >
      <UserRound className="size-[55%]" />
    </span>
  );
}

/** Avatar-triggered account menu shared by every logged-in header (marketing
 * navbar, restaurant/store dashboard, agent dashboard): account info,
 * caller-supplied role-appropriate nav links, a language + theme picker,
 * sign out. Full-screen below `md`, a small anchored panel above it. */
export function AccountMenu({
  session,
  navItems,
  onLogout,
}: {
  session: AccountMenuSession;
  navItems: AccountMenuNavItem[];
  onLogout: () => void;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // the panel is portaled to <body> so it never inherits a containing
  // block from an ancestor (a `position: sticky` dashboard header, for
  // instance, otherwise clips a `fixed` descendant to its own box in
  // Chromium) — so above `md` it has to be anchored under the trigger by
  // hand instead of relying on `absolute` + a `relative` wrapper.
  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (!triggerRef.current) return;
      if (!window.matchMedia("(min-width: 768px)").matches) {
        setPanelStyle({});
        return;
      }
      const rect = triggerRef.current.getBoundingClientRect();
      const isRtl = document.documentElement.dir === "rtl";
      setPanelStyle({
        position: "fixed",
        top: rect.bottom + 8,
        ...(isRtl
          ? { left: rect.left }
          : { right: window.innerWidth - rect.right }),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // the panel covers the full viewport below `md` — lock background scroll
  // while it's open there (the `md:` anchored dropdown shouldn't block it)
  useEffect(() => {
    if (!open || window.matchMedia("(min-width: 768px)").matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const go = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  const setLocale = (locale: Locale) => {
    const segments = pathname.split("/");
    segments[1] = locale;
    router.replace(segments.join("/") || `/${locale}`);
    setOpen(false);
  };

  const handleLogout = () => {
    setOpen(false);
    onLogout();
  };

  const languageItems: Record<Locale, string> = {
    ar: "العربية",
    en: "English",
  };
  const themeIcons = { light: Sun, dark: Moon };
  const themeItems = {
    light: t.common.themeLight,
    dark: t.common.themeDark,
  };
  const currentThemeMode = (
    theme === "dark" ? "dark" : "light"
  ) as keyof typeof themeIcons;

  return (
    <div className="relative">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className="overflow-hidden rounded-full border border-border/60"
        aria-label={t.nav.myAccount}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar
          session={session}
          className="size-full rounded-full"
          size={32}
        />
      </Button>

      {open &&
        createPortal(
          <AccountPanel
            session={session}
            panelRef={panelRef}
            style={panelStyle}
            onClose={() => setOpen(false)}
            navItems={navItems}
            go={go}
            lang={lang}
            languageItems={languageItems}
            setLocale={setLocale}
            currentThemeMode={currentThemeMode}
            themeIcons={themeIcons}
            themeItems={themeItems}
            setTheme={setTheme}
            handleLogout={handleLogout}
            t={t}
          />,
          document.body,
        )}
    </div>
  );
}
