/**
 * Unified API client. While the backend is not connected
 * (NEXT_PUBLIC_API_URL is empty) every service resolves from mock data —
 * swapping to the real API is a matter of setting the env variable.
 */

import { useAuthStore } from "@/features/auth/store";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const IS_MOCK = API_BASE_URL === "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /**
     * Every message the backend sent, when there was more than one. A
     * class-validator failure answers one string per invalid field;
     * `message` above is already the first of these, picked as the single
     * line worth putting in a toast — this is for a caller (a form) that
     * wants to show the rest too.
     */
    public details: string[] = [message],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Turns a failed response's body into one readable sentence.
 *
 * The backend answers an error as JSON, but the shape of its own `message`
 * field is not uniform: a thrown business error ("a number is already
 * linked") sends a string, while a class-validator failure sends an ARRAY of
 * strings, one per invalid field. Reading `err.message` without unwrapping
 * this first means literally printing the JSON object — `{"statusCode":400,
 * "message":["phone must be 10-15 digits", ...],...}` — wherever an error
 * reaches a toast or an inline message, which is every screen in the app
 * that calls `apiFetch`. Resolving the shape once here, rather than at each
 * of those call sites, is what keeps that from happening anywhere.
 */
export function extractErrorMessage(
  status: number,
  rawBody: string,
): { message: string; details: string[] } {
  // NestJS's default rate-limit guard throws "ThrottlerException: Too Many
  // Requests" — a framework class name, not a sentence meant for a toast.
  // Caught before the JSON parse below so it overrides whatever the body
  // actually says, same as every other 429 the backend might ever send.
  if (status === 429) {
    const message = "Too many requests — please wait a moment and try again.";
    return { message, details: [message] };
  }
  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody) as { message?: unknown };
      if (Array.isArray(parsed.message) && parsed.message.length > 0) {
        const details = parsed.message.map(String);
        return { message: details[0]!, details };
      }
      if (typeof parsed.message === "string" && parsed.message.trim() !== "") {
        return { message: parsed.message, details: [parsed.message] };
      }
    } catch {
      // not JSON (a gateway's own HTML error page, a dropped connection) —
      // fall through and surface whatever text there is
    }
  }
  const fallback = rawBody.trim() || `Request failed with status ${status}`;
  return { message: fallback, details: [fallback] };
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

/** localStorage key the zustand-persisted auth store writes. */
const SESSION_STORAGE_KEY = "menu-syria-session";

/**
 * Reads the access token persisted by the auth store. Browser-only: on the
 * server (SSR) there is no localStorage, so callers there must thread a
 * token explicitly — see `server-auth.ts` for the cookie-backed variant.
 */
export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const persistedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!persistedSession) return null;
  try {
    const parsed = JSON.parse(persistedSession) as {
      state?: { accessToken?: string | null };
    };
    return parsed.state?.accessToken ?? null;
  } catch {
    // Ignore an unreadable persisted session and make the request unauthenticated.
    return null;
  }
}

/**
 * How long an anonymous GET may be served from Next's Data Cache before a
 * fresh copy is fetched. Short enough that nothing meaningful goes stale —
 * a restaurant's rating or an offer's price does not change minute to
 * minute — long enough that browsing the directory, opening a few
 * storefronts and coming back to the list does not re-hit the real backend
 * for data that was just on screen.
 */
const PUBLIC_GET_REVALIDATE_SECONDS = 60;

/**
 * The access token is deliberately short-lived (15 minutes) — that's correct
 * backend design, not a bug. What was missing on this side was ever calling
 * `/auth/refresh` with the 7-day refresh token to get a new one: every
 * request just kept using the same token until it expired, at which point
 * every call failed with 401 and the app looked logged out while the session
 * was, underneath, still perfectly valid. This refreshes once and lets every
 * in-flight 401 ride the same attempt, instead of each firing its own.
 */
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) throw new Error("refresh failed");
        const data = (await response.json()) as {
          accessToken: string;
          refreshToken?: string;
        };
        setTokens(data.accessToken, data.refreshToken ?? refreshToken);
        return data.accessToken;
      } catch {
        // the refresh token itself is gone or expired — there is no way back
        // short of logging in again, so the session is cleared for real here
        logout();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  { body, headers, ...init }: RequestOptions = {},
  _isRetry = false,
): Promise<T> {
  const authHeaders: HeadersInit = {};
  const accessToken = getStoredAccessToken();
  if (accessToken) {
    authHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const mergedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(authHeaders as Record<string, string>),
    ...(headers as Record<string, string> | undefined),
  };

  // Next's fetch cache keys on the URL and these options, not on request
  // headers — a cached response would be handed to whoever asks next,
  // regardless of whose token sent the original request. So a request that
  // carries an Authorization header (the local one above, or one a caller
  // merged in, e.g. the SSR console pages threading a cookie-backed token)
  // is NEVER covered by the default below, however it was authenticated.
  // Anything a caller already opted into explicitly (`cache`, `next`) is
  // left exactly as given, and anything other than a bare read (POST,
  // PATCH, DELETE, …) is never cached by default either.
  const isAuthenticated = "Authorization" in mergedHeaders;
  const isGet = !init.method || init.method === "GET";
  const alreadyDecided = "cache" in init || "next" in init;
  const cacheDefault =
    isGet && !isAuthenticated && !alreadyDecided
      ? { next: { revalidate: PUBLIC_GET_REVALIDATE_SECONDS } }
      : {};

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...cacheDefault,
    ...init,
    headers: mergedHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // An expired access token, not an invalid session — retried once with a
  // fresh token before giving up and surfacing it as a real auth failure.
  if (response.status === 401 && accessToken && !_isRetry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, { body, headers, ...init }, true);
    }
  }

  if (!response.ok) {
    const { message, details } = extractErrorMessage(
      response.status,
      await response.text(),
    );
    throw new ApiError(response.status, message, details);
  }

  // A handful of endpoints (204 No Content, or an old route never migrated
  // to the envelope below) still answer with no body at all.
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const raw = await response.text();
  if (raw === "") return undefined as T;
  return unwrapEnvelope(JSON.parse(raw)) as T;
}

/**
 * Most write endpoints now answer `{ success, message, data }` instead of
 * the entity directly — including deletes, which moved from 204 to 200 with
 * `data: null` so they could carry a message at all. A handful of routes
 * (login, OTP, refresh, analytics pings, the public WhatsApp-order endpoint)
 * were deliberately left unwrapped because the frontend's session handling
 * depends on their exact shape — those simply don't have a `data` key and
 * pass through untouched below.
 *
 * `data` is returned merged with `message` rather than bare: a delete or a
 * dynamic-message route (forgot/reset password, WhatsApp unlink…) has
 * `data: null` and nothing but the message worth returning, while an entity
 * route gains a harmless extra `message` field callers that only destructure
 * known columns never notice.
 */
function unwrapEnvelope(parsed: unknown): unknown {
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    !("success" in parsed) ||
    !("data" in parsed)
  ) {
    return parsed;
  }
  const envelope = parsed as { message?: string; data: unknown };
  if (
    envelope.data !== null &&
    typeof envelope.data === "object" &&
    !Array.isArray(envelope.data)
  ) {
    return { ...envelope.data, message: envelope.message };
  }
  return envelope.data ?? { message: envelope.message };
}

/** Keeps mock mode asynchronous without adding noticeable artificial latency. */
export function mockDelay<T>(data: T, ms = 80): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

/**
 * A list endpoint migrating to server pagination (see update.md) starts
 * answering `{ items, meta }` instead of a bare array — but per that same
 * doc the rollout is endpoint-by-endpoint, so some still answer the old bare
 * array. This accepts either shape and always returns the array, so a caller
 * that isn't paginating yet (every admin list page still slices client-side)
 * doesn't care which one it got.
 */
export function unwrapListItems<T>(response: T[] | { items: T[] }): T[] {
  return Array.isArray(response) ? response : response.items;
}

/**
 * GET that resolves to `undefined` on a 404 instead of throwing.
 *
 * Services whose pages render `notFound()` when an entity is missing (a
 * restaurant by slug, a store catalog, an agent…) route through this so a
 * missing row becomes a clean 404 page rather than a 500.
 */
export async function apiGetOrUndefined<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T | undefined> {
  try {
    return await apiFetch<T>(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}
