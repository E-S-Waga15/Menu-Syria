"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";

import {
  Bell,
  Building2,
  ChartNoAxesCombined,
  ChefHat,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  MessageCircle,
  QrCode,
  Receipt,
  Tag,
  Settings,
  ShoppingBag,
  Table2,
  UtensilsCrossed,
  Users,
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
  const previewHref = restaurant ? `/${restaurant.slug}/menu` : undefined;

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
      exact: true,
    },
    {
      href: `${base}/menu/categories`,
      label: t.dashboard.categories,
      icon: LayoutGrid,
    },
    { href: `${base}/offers`, label: t.offers.title, icon: Tag },
    { href: `${base}/orders`, label: t.dashboard.orders, icon: ClipboardList },
    {
      href: `${base}/kitchen`,
      label: t.dashboard.kitchenScreen,
      icon: ChefHat,
    },
    // Tables/reservations are a restaurant-only concept — a store has no
    // dine-in floor, so the nav item is left out entirely rather than shown
    // locked (not a plan upsell, just not applicable to this business type).
    ...(isStore
      ? []
      : [{ href: `${base}/tables`, label: t.dashboard.tables, icon: Table2 }]),
    {
      href: `${base}/whatsapp-orders`,
      label: t.dashboard.whatsappOrders,
      icon: MessageCircle,
    },
    { href: `${base}/branches`, label: t.dashboard.branches, icon: Building2 },
    { href: `${base}/invoices`, label: t.dashboard.invoices, icon: Receipt },
    { href: `${base}/customers`, label: t.dashboard.customers, icon: Users },
    {
      href: `${base}/analytics`,
      label: t.dashboard.analytics,
      icon: ChartNoAxesCombined,
    },
    { href: `${base}/qr`, label: t.dashboard.qrCode, icon: QrCode },
    { href: `${base}/settings`, label: t.dashboard.settings, icon: Settings },
    { href: `${base}/support`, label: t.dashboard.supportTab, icon: LifeBuoy },
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
            <NotificationBell href={`${base}/notifications`} />
            <AccountMenu
              session={{
                ...session,
                avatarUrl: restaurant?.logoUrl || session.avatarUrl,
              }}
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
