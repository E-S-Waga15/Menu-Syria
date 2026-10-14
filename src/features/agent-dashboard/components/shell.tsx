"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import {
  Bell,
  LayoutDashboard,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
} from "lucide-react";

import { AccountMenu } from "@/components/shared/account-menu";
import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/shared/dashboard-shell";
import { useAuthStore } from "@/features/auth/store";
import { useHydratedSession } from "@/features/auth/use-hydrated-session";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { buildSubscriptionNotifications } from "@/features/notifications/services";
import { useI18n } from "@/i18n/client";
import type { Business } from "@/lib/types";

export function AgentDashboardShell({
  children,
  /** the businesses this agent holds, so the bell can count what is due */
  businesses = [],
}: {
  children: ReactNode;
  businesses?: Business[];
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { session, hydrated } = useHydratedSession();
  const logout = useAuthStore((s) => s.logout);
  const base = `/${lang}/agent`;

  const navItems: DashboardNavItem[] = [
    { href: base, label: t.agent.earnings, icon: LayoutDashboard, exact: true },
    { href: `${base}/restaurants`, label: t.agent.myRestaurants, icon: Store },
    { href: `${base}/stores`, label: t.agent.myStores, icon: ShoppingBag },
    { href: `${base}/plans`, label: t.agent.plansTab, icon: Sparkles },
    {
      href: `${base}/notifications`,
      label: t.notifications.title,
      icon: Bell,
    },
    { href: `${base}/profile`, label: t.agent.profileTab, icon: UserRound },
  ];

  return (
    <DashboardShell
      navItems={navItems}
      title={t.agent.dashboard}
      accountMenu={
        hydrated && session ? (
          <div className="flex items-center gap-1">
            <NotificationBell
              href={`${base}/notifications`}
              ids={buildSubscriptionNotifications(
                businesses,
                (b) => `${base}/subscriptions/${b.id}`,
              ).map((n) => n.id)}
            />
            <AccountMenu
              session={session}
              navItems={[]}
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
