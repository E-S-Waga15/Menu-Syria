"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";

import {
  Bell,
  Building2,
  ChartNoAxesCombined,
  LayoutDashboard,
  QrCode,
  Receipt,
  Tag,
  Settings,
  ShoppingBag,
  Table2,
  UtensilsCrossed,
} from "lucide-react";

import { AccountMenu } from "@/components/shared/account-menu";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/shared/dashboard-shell";
import { useAuthStore } from "@/features/auth/store";
import { useHydratedSession } from "@/features/auth/use-hydrated-session";
import { getMyRestaurant } from "@/features/restaurant-dashboard/services";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";

export function RestaurantDashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { session, hydrated } = useHydratedSession();
  const logout = useAuthStore((s) => s.logout);
  const businessType = useAuthStore(
    (s) => s.session?.businessType ?? "restaurant",
  );
  const isStore = businessType === "store";
  const base = `/${lang}/dashboard`;

  // Only fetched for its slug — the preview link has to point at this
  // owner's own real storefront, not a stand-in that happened to exist.
  const { data: restaurant } = useQuery({
    queryKey: queryKeys.me.business,
    queryFn: getMyRestaurant,
    enabled: hydrated && !!session,
  });
  const previewHref = restaurant
    ? `/${lang}/${isStore ? "store" : "menu"}/${restaurant.slug}`
    : undefined;

  const navItems: DashboardNavItem[] = [
    {
      href: base,
      label: t.dashboard.overview,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: `${base}/menu`,
      label: isStore ? t.dashboard.myProducts : t.dashboard.myMenu,
      icon: isStore ? ShoppingBag : UtensilsCrossed,
    },
    { href: `${base}/offers`, label: t.offers.title, icon: Tag },
    { href: `${base}/orders`, label: t.dashboard.orders, icon: Receipt },
    // dining-table management is restaurant-only
    ...(isStore
      ? []
      : [{ href: `${base}/tables`, label: t.dashboard.tables, icon: Table2 }]),
    { href: `${base}/branches`, label: t.dashboard.branches, icon: Building2 },
    {
      href: `${base}/analytics`,
      label: t.dashboard.analytics,
      icon: ChartNoAxesCombined,
    },
    { href: `${base}/qr`, label: t.dashboard.qrCode, icon: QrCode },
    { href: `${base}/settings`, label: t.dashboard.settings, icon: Settings },
  ];

  return (
    <DashboardShell
      navItems={navItems}
      title={t.dashboard.overview}
      previewHref={previewHref}
      previewLabel={t.dashboard.preview}
      accountMenu={
        hydrated && session ? (
          <div className="flex items-center gap-1">
            <NotificationBell href={`${base}/notifications`} ids={[]} />
            <AccountMenu
              session={session}
              navItems={[
                {
                  icon: Bell,
                  label: t.notifications.title,
                  href: `${base}/notifications`,
                },
                {
                  icon: Settings,
                  label: t.dashboard.settings,
                  href: `${base}/settings`,
                },
              ]}
              onLogout={() => {
                logout();
                router.push(`/${lang}`);
              }}
            />
          </div>
        ) : undefined
      }
    >
      {children}
    </DashboardShell>
  );
}
