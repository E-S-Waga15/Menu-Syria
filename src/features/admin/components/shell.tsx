"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import {
  Bell,
  CreditCard,
  HandCoins,
  Handshake,
  LayoutDashboard,
  Settings2,
  ShoppingBag,
  UsersRound,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

import { AccountMenu } from "@/components/shared/account-menu";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/shared/dashboard-shell";
import { useAuthStore } from "@/features/auth/store";
import { useHydratedSession } from "@/features/auth/use-hydrated-session";
import { useI18n } from "@/i18n/client";

/**
 * Platform console shell.
 *
 * Same DashboardShell every other role gets — one sidebar, one header, one
 * collapse behaviour — so the console is a peer of the other dashboards rather
 * than a separate application with its own conventions.
 *
 * Nav order follows who the console works on: the people, then the businesses,
 * then what they pay for, then the platform itself.
 */
export function AdminDashboardShell({ children }: { children: ReactNode }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { session, hydrated } = useHydratedSession();
  const logout = useAuthStore((s) => s.logout);
  const base = `/${lang}/admin`;

  const navItems: DashboardNavItem[] = [
    {
      href: base,
      label: t.admin.dashboard,
      icon: LayoutDashboard,
      exact: true,
    },
    { href: `${base}/users`, label: t.admin.users, icon: UsersRound },
    {
      href: `${base}/restaurants`,
      label: t.admin.restaurants,
      icon: UtensilsCrossed,
    },
    { href: `${base}/stores`, label: t.admin.stores, icon: ShoppingBag },
    { href: `${base}/agents`, label: t.admin.agents, icon: Handshake },
    {
      href: `${base}/registration-requests`,
      label: t.admin.registrationRequests,
      icon: UsersRound,
    },
    {
      href: `${base}/subscription-requests`,
      label: t.admin.subscriptionRequests,
      icon: HandCoins,
    },
    {
      href: `${base}/subscriptions`,
      label: t.admin.subscriptions,
      icon: CreditCard,
    },
    { href: `${base}/plans`, label: t.admin.plansPage, icon: Wallet },
    {
      href: `${base}/notifications`,
      label: t.notifications.title,
      icon: Bell,
    },
    {
      href: `${base}/settings`,
      label: t.admin.systemSettings,
      icon: Settings2,
    },
  ];

  return (
    <DashboardShell
      navItems={navItems}
      title={t.admin.console}
      accountMenu={
        hydrated && session ? (
          <div className="flex items-center gap-1">
            <NotificationBell href={`${base}/notifications`} />
            <AccountMenu
              session={session}
              navItems={[
                {
                  icon: Bell,
                  label: t.notifications.title,
                  href: `${base}/notifications`,
                },
                {
                  icon: Settings2,
                  label: t.admin.systemSettings,
                  href: `${base}/settings`,
                },
              ]}
              onLogout={() => {
                logout();
                router.push(`/${lang}/admin/login`);
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
