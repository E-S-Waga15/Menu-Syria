"use client";

import Link from "next/link";
import { useState } from "react";

import {
  AlertTriangle,
  Bell,
  BellRing,
  CalendarClock,
  CheckCheck,
  FileText,
  HandCoins,
  RefreshCw,
  ShieldBan,
  UserCheck,
  UserPlus,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { notificationHref } from "@/features/notifications/lib/href";
import { enablePushNotifications } from "@/features/notifications/lib/push";
import { markNotificationRead } from "@/features/notifications/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import type { AppNotification, NotificationType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  new_user_registered: UserPlus,
  new_registration_request: FileText,
  new_subscription_request: Wallet,
  agent_referral_used: UserCheck,
  agent_dues_settled: HandCoins,
  subscription_activated: CheckCheck,
  subscription_renewed: RefreshCw,
  subscription_expiring: CalendarClock,
  subscription_expired: AlertTriangle,
  account_disabled: ShieldBan,
};

const URGENT_TYPES: NotificationType[] = [
  "subscription_expired",
  "account_disabled",
];

/**
 * The notice list, shared by every dashboard and by customers.
 *
 * Unread is carried by a left edge and weight rather than a coloured row: the
 * list is read top to bottom, and tinting whole rows made the urgent ones
 * compete with the merely unread.
 */
export function NotificationsList({
  notifications,
  onChange,
}: {
  notifications: AppNotification[];
  /** called after a read/unread toggle actually succeeds, so the caller's
   * own fetched list (and the header bell's unread count) can refresh */
  onChange?: () => void;
}) {
  const { t, lang } = useI18n();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    () =>
      typeof window === "undefined" || !("Notification" in window)
        ? "unsupported"
        : Notification.permission,
  );
  const [enabling, setEnabling] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const shown = unreadOnly ? notifications.filter((n) => !n.isRead) : notifications;

  const enableBrowserNotifications = async () => {
    setEnabling(true);
    try {
      const granted = await enablePushNotifications();
      setPermission(granted ? "granted" : Notification.permission);
      toast[granted ? "success" : "error"](
        granted ? t.notifications.pushEnabled : t.notifications.pushEnableFailed,
      );
    } finally {
      setEnabling(false);
    }
  };

  const setRead = async (id: string, isRead: boolean) => {
    setPendingId(id);
    try {
      await markNotificationRead(id, isRead);
      onChange?.();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setPendingId(null);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => markNotificationRead(n.id, true)));
    onChange?.();
  };

  const pushBanner = permission === "default" && (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <BellRing className="size-4 shrink-0 text-primary" />
        {t.notifications.pushPromptBody}
      </p>
      <Button
        size="sm"
        loading={enabling}
        onClick={() => void enableBrowserNotifications()}
      >
        {t.notifications.pushPromptAction}
      </Button>
    </div>
  );

  if (notifications.length === 0) {
    return (
      <div className="space-y-4">
        {pushBanner}
        <div className="rounded-2xl border border-dashed border-border p-14 text-center">
          <Bell className="mx-auto size-10 text-muted-foreground/40" />
          <p className="mt-3 font-semibold">{t.notifications.empty}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.notifications.emptyBody}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pushBanner}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(
            [
              { value: false, label: t.notifications.filterAll },
              { value: true, label: t.notifications.filterUnread },
            ] as const
          ).map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => setUnreadOnly(filter.value)}
              aria-pressed={unreadOnly === filter.value}
              className={cn(
                "cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200",
                unreadOnly === filter.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-container text-foreground/70 hover:bg-surface-container-high",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => void markAllRead()}>
            <CheckCheck className="size-4" />
            {t.notifications.markAllRead}
          </Button>
        )}
      </div>

      <ul className="space-y-2.5">
        {shown.map((notification) => {
          const Icon = TYPE_ICON[notification.type] ?? Bell;
          const read = notification.isRead;
          const urgent = URGENT_TYPES.includes(notification.type);
          const href = notificationHref(notification, lang);
          const pending = pendingId === notification.id;

          const body = (
            <>
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  urgent
                    ? "bg-destructive/10 text-destructive"
                    : "bg-berry-soft text-berry-soft-foreground",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-sm",
                    read ? "font-medium text-muted-foreground" : "font-bold",
                  )}
                >
                  {notification.message}
                </span>
              </span>
              {!read && (
                <span
                  aria-hidden
                  className="mt-2 size-2 shrink-0 rounded-full bg-primary"
                />
              )}
            </>
          );

          const className = cn(
            "flex w-full items-start gap-3 rounded-2xl border border-border/60 border-s-2 bg-card p-3.5 text-start transition-colors duration-200 hover:border-primary/35",
            pending && "opacity-60",
            read
              ? "border-s-border"
              : urgent
                ? "border-s-destructive"
                : "border-s-primary",
          );

          return (
            <li key={notification.id}>
              {href ? (
                <Link
                  href={href}
                  onClick={() => !read && void setRead(notification.id, true)}
                  className={className}
                >
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void setRead(notification.id, !read)}
                  className={cn(className, "cursor-pointer")}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
