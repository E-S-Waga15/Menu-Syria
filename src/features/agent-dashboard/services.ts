import { apiFetch, IS_MOCK, mockDelay } from "@/lib/api/client";
import {
  agents,
  agentTransactions,
  plans,
  restaurants,
  stores,
} from "@/lib/mock/data";
import type { Agent, Plan, Restaurant, Store, Transaction } from "@/lib/types";

/**
 * An agent asks the platform to renew (or upgrade) a referred business's
 * subscription — the actual hand-to-hand payment is confirmed by an admin,
 * so this only files the request rather than changing billing itself.
 */
export async function requestBusinessRenewal(
  businessId: string,
  planId: string,
): Promise<{ message?: string } | undefined> {
  if (IS_MOCK) return mockDelay(undefined, 200);
  return apiFetch("/subscription-requests", {
    method: "POST",
    body: { businessId, planId },
  });
}

/**
 * Extra auth the portal's server components thread in: server-side
 * fetches read the session cookie (see `features/agent-dashboard/server.ts`),
 * while client components skip this and let `apiFetch` attach the
 * localStorage token itself.
 */
export type AgentAuth = { accessToken?: string | null };

/** Authorization header for an explicitly-provided token, if any. */
function authHeaders({ accessToken }: AgentAuth): HeadersInit {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export async function getMyAgentProfile(
  auth: AgentAuth = {},
): Promise<Agent> {
  if (IS_MOCK) return mockDelay(agents[0]!);
  return apiFetch("/me/agent", { headers: authHeaders(auth) });
}

export async function getMyTransactions(
  auth: AgentAuth = {},
): Promise<Transaction[]> {
  if (IS_MOCK) return mockDelay(agentTransactions);
  return apiFetch("/me/agent/transactions", { headers: authHeaders(auth) });
}

/**
 * The plans an agent can sell, at the agent's own (discounted) price —
 * every number here, monthly or yearly, is already computed server-side;
 * this just reads the same `Plan` shape the admin console does.
 */
export async function getAgentPlans(auth: AgentAuth = {}): Promise<Plan[]> {
  if (IS_MOCK) return mockDelay(plans);
  return apiFetch("/subscription-plans", { headers: authHeaders(auth) });
}

export async function getMyReferredRestaurants(
  auth: AgentAuth = {},
): Promise<Restaurant[]> {
  if (IS_MOCK) return mockDelay(restaurants);
  return apiFetch("/me/agent/restaurants", { headers: authHeaders(auth) });
}

export async function getMyReferredStores(
  auth: AgentAuth = {},
): Promise<Store[]> {
  if (IS_MOCK) return mockDelay(stores);
  return apiFetch("/me/agent/stores", { headers: authHeaders(auth) });
}

/**
 * One business by id across both kinds — the subscription page is addressed by
 * id alone, so it has to resolve without knowing which list it came from.
 */
export async function getReferredBusiness(
  id: string,
  auth: AgentAuth = {},
) {
  const [referredRestaurants, referredStores] = await Promise.all([
    getMyReferredRestaurants(auth),
    getMyReferredStores(auth),
  ]);

  const restaurant = referredRestaurants.find((r) => r.id === id);
  if (restaurant) return { business: restaurant, kind: "restaurant" as const };

  const store = referredStores.find((s) => s.id === id);
  if (store) return { business: store, kind: "store" as const };

  return null;
}
