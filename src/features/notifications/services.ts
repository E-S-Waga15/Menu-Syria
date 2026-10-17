import { apiFetch, IS_MOCK, mockDelay } from "@/lib/api/client";
import type { AppNotification } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** whole days from today to `iso`; negative once the date has passed */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const target = new Date(iso).getTime();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  return Math.round((target - today) / DAY_MS);
}

/** The signed-in user's own notices, newest first — the backend scopes this
 * to the caller's token, so the same call serves every role's dashboard. */
export async function getNotifications(
  unreadOnly = false,
): Promise<AppNotification[]> {
  if (IS_MOCK) return mockDelay([]);
  return apiFetch(`/notifications${unreadOnly ? "?unread=true" : ""}`);
}

export async function markNotificationRead(
  id: string,
  isRead: boolean,
): Promise<AppNotification | undefined> {
  if (IS_MOCK) return mockDelay(undefined, 100);
  return apiFetch(`/notifications/${id}/read`, {
    method: "PATCH",
    body: { isRead },
  });
}

/** Registers this browser/device for real push notifications — called once
 * the user has granted permission and an FCM token has been obtained. */
export async function registerPushToken(
  token: string,
  userAgent?: string,
): Promise<{ message?: string } | undefined> {
  if (IS_MOCK) return mockDelay(undefined, 100);
  return apiFetch("/push-tokens", {
    method: "POST",
    body: { token, userAgent },
  });
}

/** Unregisters this device's push token — called on logout so a signed-out
 * browser stops receiving another account's pushes. */
export async function unregisterPushToken(
  token: string,
): Promise<{ message?: string } | undefined> {
  if (IS_MOCK) return mockDelay(undefined, 100);
  return apiFetch("/push-tokens", {
    method: "DELETE",
    body: { token },
  });
}
