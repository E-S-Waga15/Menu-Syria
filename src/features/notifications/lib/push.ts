"use client";

import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
} from "firebase/messaging";

import {
  registerPushToken,
  unregisterPushToken,
} from "@/features/notifications/services";
import { getFirebaseApp } from "@/lib/firebase";

/** this device's current FCM token, kept locally so logout (or an explicit
 * disable) knows which one to tell the backend to drop */
const PUSH_TOKEN_STORAGE_KEY = "menu-syria-push-token";

async function canUsePush(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    console.warn("[push] Notification/serviceWorker API not available in this browser");
    return false;
  }
  const supported = await isSupported();
  if (!supported) {
    console.warn(
      "[push] Firebase Messaging reports this browser/context as unsupported " +
        "(common cause: not served over HTTPS — localhost is exempt, but a plain " +
        "http:// LAN address is not)",
    );
  }
  return supported;
}

/**
 * Registers this browser for push: asks for notification permission (a
 * no-op if already granted or denied — the browser never re-prompts),
 * registers the FCM service worker, obtains a token and sends it to the
 * backend. Safe to call on every page load; it only does real work the
 * first time or after the token has actually changed.
 *
 * Every early return logs why via `console.warn`/`console.error` first —
 * this fails silently to the end user (just a generic toast), so the
 * browser console is the only way to tell which of several unrelated things
 * (missing env config, denied permission, a network error registering the
 * token with the backend, …) actually happened.
 */
export async function enablePushNotifications(): Promise<boolean> {
  if (!(await canUsePush())) return false;
  const app = getFirebaseApp();
  if (!app) {
    console.warn(
      "[push] Firebase isn't configured — NEXT_PUBLIC_FIREBASE_API_KEY is " +
        "missing at runtime. If this is a deployed environment, the env vars " +
        "were likely added after the last build: Vercel bakes NEXT_PUBLIC_* " +
        "values in at build time, so a redeploy is needed for them to take effect.",
    );
    return false;
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn("[push] NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing at runtime");
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn(`[push] notification permission was "${permission}", not "granted"`);
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
    );
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!token) {
      console.warn("[push] getToken() resolved with no token");
      return false;
    }

    const previous = localStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    if (previous !== token) {
      await registerPushToken(token, navigator.userAgent);
      localStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
    }
    return true;
  } catch (error) {
    console.error("[push] enablePushNotifications failed", error);
    return false;
  }
}

/** Silently re-registers this device's token if permission was already
 * granted in a past visit — never prompts, so it's safe to call on every
 * authenticated page load without surprising anyone. */
export async function syncPushNotificationsIfGranted(): Promise<void> {
  if (!(await canUsePush())) return;
  if (Notification.permission !== "granted") return;
  await enablePushNotifications();
}

/** Tells the backend to drop this device's token and clears it locally —
 * called on logout so a signed-out browser stops receiving another
 * account's pushes. */
export async function disablePushNotifications(): Promise<void> {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  if (!token) return;
  localStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  try {
    await unregisterPushToken(token);
  } catch {
    // best-effort — the backend token can go stale harmlessly; what matters
    // is this device no longer thinks it's registered
  }
}

/** A push that arrives while a tab has focus doesn't trigger the browser's
 * native notification UI — the caller decides how to surface it (a toast,
 * a refetch of the unread count, ...). */
export async function listenForForegroundPush(
  onReceive: (title: string, body: string) => void,
): Promise<() => void> {
  if (!(await canUsePush())) return () => {};
  const app = getFirebaseApp();
  if (!app) return () => {};

  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    onReceive(
      payload.notification?.title ?? "",
      payload.notification?.body ?? "",
    );
  });
}
