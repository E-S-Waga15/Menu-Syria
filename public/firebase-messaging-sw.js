// Firebase Cloud Messaging service worker — handles a push that arrives
// while no tab is focused. Runs as its own isolated script outside the
// Next.js bundle, so it can't read NEXT_PUBLIC_* env vars or import the
// app's TypeScript config; the values below must be kept in sync by hand
// with src/lib/firebase.ts (none of this is secret — these are public
// client identifiers, not credentials, matching Firebase's own guidance to
// hardcode them here).
importScripts("https://www.gstatic.com/firebasejs/13.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/13.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD_jQVGuFeIa5hgdyhPr1rl0PjXDxnJ2xM",
  authDomain: "menu-syria.firebaseapp.com",
  projectId: "menu-syria",
  storageBucket: "menu-syria.firebasestorage.app",
  messagingSenderId: "569427678087",
  appId: "1:569427678087:web:3a36c5129c1125d712b922",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "منيو سوريا";
  const body = payload.notification?.body ?? "";
  self.registration.showNotification(title, {
    body,
    icon: "/notification-icon.png",
  });
});
