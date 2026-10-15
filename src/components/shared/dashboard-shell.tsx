"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { ExternalLink, LogOut } from "lucide-react";

import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { Logo } from "@/components/shared/logo";
import { LogoMark } from "@/components/shared/logo-mark";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useI18n } from "@/i18n/client";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  exact?: boolean;
}

export function DashboardShell({
  navItems,
  title,
  previewHref,
  previewLabel,
  accountMenu,
  children,
}: {
  navItems: DashboardNavItem[];
  title: string;
  previewHref?: string;
  previewLabel?: string;
  /** avatar-triggered account menu (language/theme/logout) — omit to leave
   * the header as-is (e.g. the admin console doesn't get one) */
  accountMenu?: ReactNode;
  children: ReactNode;
}) {
  const { t, lang, dir } = useI18n();
  const pathname = usePathname();

  const isNavActive = (item: DashboardNavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);
  // the header names whichever section is actually open rather than a fixed
  // label, falling back to the shell's own title for a page — settings, a
  // detail view — that isn't one of the sidebar's own entries
  const activeLabel = navItems.find(isNavActive)?.label ?? title;

  return (
    <SidebarProvider>
      {/* `icon`, not `offcanvas`: collapsing should leave a usable rail —
          the mark on top and one icon per section — rather than removing the
          navigation entirely */}
      <Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="icon">
        {/* h-14 matches the content header's own height exactly, so the
            logo row and the page-title row sit on the same line across the
            sidebar/content split */}
        <SidebarHeader className="h-14 justify-center px-4 group-data-[collapsible=icon]:px-2">
          {/* full lockup when open; the bare mark once there is only a rail */}
          <Logo
            lang={lang}
            brand={t.common.brand}
            className="group-data-[collapsible=icon]:hidden"
          />
          <Link
            href={`/${lang}`}
            aria-label={t.common.brand}
            className="hidden justify-center group-data-[collapsible=icon]:flex"
          >
            <LogoMark className="h-7" />
          </Link>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {navItems.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        className="h-10 gap-3 rounded-xl px-3.5 font-semibold data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-glow"
                        render={<Link href={item.href} />}
                      >
                        <item.icon className="size-4.5" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-2 p-4 group-data-[collapsible=icon]:p-2">
          {previewHref && (
            <Button
              variant="outline"
              className="w-full justify-center gap-2 font-semibold group-data-[collapsible=icon]:px-0"
              render={
                <a
                  href={previewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <ExternalLink className="size-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">
                {previewLabel ?? t.dashboard.preview}
              </span>
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full justify-center gap-2 font-semibold text-muted-foreground group-data-[collapsible=icon]:px-0 hover:text-destructive"
            render={<Link href={`/${lang}`} />}
          >
            <LogOut className="size-4 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">
              {t.common.logout}
            </span>
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-surface-container-low/60 dark:bg-background">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl">
          <SidebarTrigger />
          <h1 className="flex-1 truncate font-heading text-base font-bold md:text-lg">
            {activeLabel}
          </h1>
          {accountMenu ?? <LanguageSwitcher />}
        </header>
        <div className="flex-1 p-4 md:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
