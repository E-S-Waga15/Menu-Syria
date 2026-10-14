import { ApiError } from "@/lib/api/client";
import { redirect } from "next/navigation";

import { getSessionAccessToken, getSessionRefreshToken } from "@/lib/api/server-auth";
import { refreshAccessTokenServer } from "@/lib/api/server-refresh";

/**
 * Runs an agent-portal page's data fetching with the cookie-backed access
 * token. A 401 is tried once more with a freshly refreshed token before
 * giving up — the access token is only good for 15 minutes, so without
 * this, any SSR load after that window (most visibly a redeploy, since
 * the first load of a new page is always SSR) 401'd immediately and
 * looked exactly like the session had expired even though the 7-day
 * refresh token was still good. Only redirects to login when that
 * refresh attempt also fails, meaning the session is really gone.
 *
 * Server-only module — it transitively imports `next/headers`, so only
 * server components (the agent pages) may import it. Client components
 * keep fetching through `features/agent-dashboard/services` directly,
 * which authenticates from localStorage.
 */
export async function fetchAgentPage<T>(
  lang: string,
  fetcher: (accessToken: string | null) => Promise<T>,
): Promise<T> {
  const accessToken = await getSessionAccessToken();
  try {
    return await fetcher(accessToken);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      const refreshToken = await getSessionRefreshToken();
      const refreshed = refreshToken
        ? await refreshAccessTokenServer(refreshToken)
        : null;
      if (refreshed) {
        try {
          return await fetcher(refreshed);
        } catch (retryErr) {
          if (!(retryErr instanceof ApiError && retryErr.status === 401)) {
            throw retryErr;
          }
        }
      }
      redirect(`/${lang}/login`);
    }
    throw err;
  }
}