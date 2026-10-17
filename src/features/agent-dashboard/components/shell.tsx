"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";
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
import { getMyAgentProfile } from "@/features/agent-dashboard/services";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";

export function AgentDashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { session, hydrated } = useHydratedSession();
  const logout = useAuthStore((s) => s.logout);
  const base = `/${lang}/agent`;

  const { data: agentProfile } = useQuery({
    queryKey: queryKeys.me.agentProfile,
    queryFn: () => getMyAgentProfile(),
    enabled: hydrated && !!session,
  });

  const navItems: DashboardNavItem[] = [
    { href: base, label: t.agent.overview, icon: LayoutDashboard, exact: true },
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
            <NotificationBell href={`${base}/notifications`} />
            <AccountMenu
              session={{
                ...session,
                avatarUrl: agentProfile?.photoUrl || session.avatarUrl,
              }}
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
