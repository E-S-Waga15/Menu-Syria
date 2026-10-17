import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";

/**
 * Not secret — these are public client identifiers (the security boundary
 * is Firebase's own rules/API-key restrictions, not hiding this object), but
 * still read from env so a different Firebase project can be swapped in per
 * environment without a code change, matching every other external config
 * in this app (`NEXT_PUBLIC_API_URL`, the Google Maps key, …).
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey);

/** `initializeApp` throws if called twice (e.g. Fast Refresh re-running this
 * module) — `getApps()` makes the lookup idempotent. */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}
