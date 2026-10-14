import { API_BASE_URL } from "@/lib/api/client";

/**
 * Server-side counterpart to the client's own refresh-on-401 logic in
 * `apiFetch` (see the comment there). The access token is only good for
 * 15 minutes, but a server component only ever had the access-token
 * cookie to read — so any SSR page load more than 15 minutes after the
 * last client-side refresh 401'd immediately with no way to recover,
 * which looked exactly like the session had been logged out (most
 * visibly after a redeploy: the first load of a fresh page is always an
 * SSR pass). This calls the same `/auth/refresh` endpoint the client
 * uses, from the server, with the refresh-token cookie `server-auth.ts`
 * now also reads.
 *
 * Returning only the new access token (not persisting it anywhere) is
 * deliberate: a plain server component can't set response cookies in the
 * App Router. This just gets the *current* render a token that works —
 * the client's own store/cookie gets a fresh pair the moment any
 * client-side request runs after hydration, same as it always has.
 */
export async function refreshAccessTokenServer(
  refreshToken: string,
): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { accessToken?: string };
    return data.accessToken ?? null;
  } catch {
    return null;
  }
}
