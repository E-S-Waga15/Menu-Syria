"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import { getNotifications } from "@/features/notifications/services";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * Header bell with an unread count.
 *
 * It is a link, not a popover: the notice list is a page in its own right
 * (reachable from the account menu too), and one destination is easier to
 * reason about than a panel that has to duplicate it. It fetches its own
 * unread count — the backend already scopes `GET /notifications` to the
 * signed-in user, so every role's shell renders the same `<NotificationBell>`
 * with no per-role data to thread in.
 */
export function NotificationBell({ href }: { href: string }) {
  const { t } = useI18n();
  const { data: unreadNotifications = [] } = useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: () => getNotifications(true),
    refetchInterval: 60_000,
  });

  const unread = unreadNotifications.length;

  return (
    <Link
      href={href}
      aria-label={t.notifications.title}
      title={t.notifications.title}
      className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Bell className="size-5" />
      {unread > 0 && (
        <span
          className="absolute -top-0.5 -end-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tabular-nums"
          aria-hidden
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
      {/* the badge is decorative; the count belongs in the accessible name */}
      <span className="sr-only">{unread}</span>
    </Link>
  );
}
