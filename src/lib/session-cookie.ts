/**
 * Name of the cookie that mirrors the access token for server-side
 * reads. Shared by the client writers below and the server reader in
 * `lib/api/server-auth.ts`, so both halves always address the same jar.
 */
export const SESSION_COOKIE = "menu-syria-access-token";

/**
 * Mirrors the refresh token too, alongside the access token above — the
 * access token alone is only good for 15 minutes, so a server component
 * that only had that cookie had no way to recover once it went stale (see
 * `lib/api/server-refresh.ts`). Same non-httpOnly tradeoff as the access
 * token: it's already sitting in localStorage, so a cookie mirror adds no
 * new exposure.
 */
export const REFRESH_SESSION_COOKIE = "menu-syria-refresh-token";

/**
 * Mirror of the access token the connected logins write alongside the
 * zustand-persisted store: server components can read a cookie where
 * localStorage is out of reach, so SSR-time data fetching authenticates
 * exactly like the browser flow. Not httpOnly — it carries the same
 * token already readable in localStorage, so it adds no exposure.
 */
export function writeSessionCookie(accessToken: string): void {
  if (typeof window === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=${accessToken}; path=/; max-age=604800; SameSite=Lax`;
}

export function clearSessionCookie(): void {
  if (typeof window === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function writeRefreshCookie(refreshToken: string): void {
  if (typeof window === "undefined") return;
  document.cookie = `${REFRESH_SESSION_COOKIE}=${refreshToken}; path=/; max-age=604800; SameSite=Lax`;
}

export function clearRefreshCookie(): void {
  if (typeof window === "undefined") return;
  document.cookie = `${REFRESH_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
