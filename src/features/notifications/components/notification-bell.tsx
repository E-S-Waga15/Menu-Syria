"use client";

import Link from "next/link";
import { useEffect } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";

import {
  listenForForegroundPush,
  syncPushNotificationsIfGranted,
} from "@/features/notifications/lib/push";
import { getNotifications } from "@/features/notifications/services";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";

/**
 * Header bell with an unread count.
 *
 * It is a link, not a popover: the notice list is a page in its own right
 * (reachable from the account menu too), and one destination is easier to
 * reason about than a panel that has to duplicate it. It fetches its own
 * unread count — the backend already scopes `GET /notifications` to the
 * signed-in user, so every role's shell renders the same `<NotificationBell>`
 * with no per-role data to thread in.
 *
 * It's also where the push side quietly piggybacks: mounted on every
 * authenticated page, it's a natural place to (a) silently re-register this
 * device's FCM token if notification permission was already granted in a
 * past visit, and (b) refresh the unread count the moment a push arrives
 * while a tab is focused (a focused tab never shows the OS notification
 * itself, so without this the badge would lag until the next poll).
 */
export function NotificationBell({ href }: { href: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: unreadNotifications = [] } = useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: () => getNotifications(true),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    void syncPushNotificationsIfGranted();
    let unsubscribe = () => {};
    void listenForForegroundPush((title, body) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      if (title || body) toast.info([title, body].filter(Boolean).join(" — "));
    }).then((unsub) => {
      unsubscribe = unsub;
    });
    return () => unsubscribe();
  }, [queryClient]);

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
