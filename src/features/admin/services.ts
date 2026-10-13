import { apiFetch, apiGetOrUndefined, IS_MOCK, mockDelay } from "@/lib/api/client";
import {
  agentTransactions,
  agents,
  plans,
  platformUsers,
  restaurants,
  stores,
} from "@/lib/mock/data";
import type {
  Agent,
  Business,
  Plan,
  PlatformUser,
  Restaurant,
  Governorate,
  Region,
  Store,
  Transaction,
} from "@/lib/types";

/**
 * Extra auth the console's server components thread in: server-side
 * fetches read the session cookie (see `features/admin/server.ts`),
 * while client components skip this and let `apiFetch` attach the
 * localStorage token itself.
 */
export type AdminAuth = { accessToken?: string | null };

export type AdminBusinessStatus = "active" | "inactive" | "suspended";

export type RegistrationRequestStatus = "pending" | "approved" | "rejected";

export interface RegistrationRequest {
  id: string;
  applicantName: string;
  phone: string;
  notes: string | null;
  type: "restaurant" | "store" | "agent";
  status: RegistrationRequestStatus;
  applicantUserId: string | null;
  planId: string | null;
  plan?: { id: string; name: string; durationDays: number } | null;
  createdAt: string;
  district?: { name?: string };
  agent?: { name?: string };
  /** when approved, the subscription period this request was given —
   * absent on a still-pending request */
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
}

/** How long the subscription an admin grants on approval runs for — never
 * more than a year, whichever way it's expressed. */
export type SubscriptionDurationType = "monthly" | "custom" | "yearly";

export interface SubscriptionDurationInput {
  durationType: SubscriptionDurationType;
  /** only for "monthly" — whole months, 1 to 12 */
  durationMonths?: number;
  /** only for "custom" — ISO date, at most a year from the approval moment */
  endDate?: string;
}

export interface BusinessSubscription {
  id: string;
  businessId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: string;
  plan?: { id: string; name: string; durationDays: number };
}

type GovernorateResponse = { id: string; governorateName: string };
type DistrictResponse = {
  id: string;
  governorateId: string;
  districtName: string;
};

function toGovernorate(
  item: GovernorateResponse & { message?: string },
): Governorate & { message?: string } {
  return {
    id: item.id,
    name: { ar: item.governorateName, en: item.governorateName },
    message: item.message,
  };
}

function toRegion(
  item: DistrictResponse & { message?: string },
): Region & { message?: string } {
  return {
    id: item.id,
    governorateId: item.governorateId,
    name: { ar: item.districtName, en: item.districtName },
    message: item.message,
  };
}

export async function createAdminGovernorate(
  name: string,
  auth: AdminAuth = {},
): Promise<Governorate & { message?: string }> {
  if (IS_MOCK) {
    return mockDelay({
      id: `g${Date.now()}`,
      name: { ar: name, en: name },
    });
  }
  const item = await apiFetch<GovernorateResponse>("/locations/governorates", {
    method: "POST",
    headers: authHeaders(auth),
    body: { governorateName: name },
  });
  return toGovernorate(item);
}

export async function updateAdminGovernorate(
  id: string,
  name: string,
  auth: AdminAuth = {},
): Promise<Governorate & { message?: string }> {
  if (IS_MOCK) {
    return mockDelay({ id, name: { ar: name, en: name } });
  }
  const item = await apiFetch<GovernorateResponse>(
    `/locations/governorates/${id}`,
    {
      method: "PATCH",
      headers: authHeaders(auth),
      body: { governorateName: name },
    },
  );
  return toGovernorate(item);
}

export async function deleteAdminGovernorate(
  id: string,
  auth: AdminAuth = {},
): Promise<{ message?: string } | undefined> {
  if (IS_MOCK) return mockDelay(undefined, 150);
  return apiFetch<{ message?: string }>(`/locations/governorates/${id}`, {
    method: "DELETE",
    headers: authHeaders(auth),
  });
}

export async function createAdminRegion(
  governorateId: string,
  name: string,
  auth: AdminAuth = {},
): Promise<Region & { message?: string }> {
  if (IS_MOCK) {
    return mockDelay({
      id: `r${Date.now()}`,
      governorateId,
      name: { ar: name, en: name },
    });
  }
  const item = await apiFetch<DistrictResponse>("/locations/districts", {
    method: "POST",
    headers: authHeaders(auth),
    body: { governorateId, districtName: name },
  });
  return toRegion(item);
}

export async function updateAdminRegion(
  id: string,
  name: string,
  auth: AdminAuth = {},
): Promise<Region & { message?: string }> {
  if (IS_MOCK) {
    return mockDelay({
      id,
      governorateId: "",
      name: { ar: name, en: name },
    });
  }
  const item = await apiFetch<DistrictResponse>(`/locations/districts/${id}`, {
    method: "PATCH",
    headers: authHeaders(auth),
    body: { districtName: name },
  });
  return toRegion(item);
}

export async function deleteAdminRegion(
  id: string,
  auth: AdminAuth = {},
): Promise<{ message?: string } | undefined> {
  if (IS_MOCK) return mockDelay(undefined, 150);
  return apiFetch<{ message?: string }>(`/locations/districts/${id}`, {
    method: "DELETE",
    headers: authHeaders(auth),
  });
}

/** Authorization header for an explicitly-provided token, if any. */
function authHeaders({ accessToken }: AdminAuth): HeadersInit {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export interface AdminStats {
  totalRestaurants: number;
  totalAgents: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
}

export async function getAdminStats(
  auth: AdminAuth = {},
): Promise<AdminStats> {
  if (IS_MOCK)
    return mockDelay({
      totalRestaurants: 642,
      totalAgents: 41,
      monthlyRevenue: 128500000,
      activeSubscriptions: 587,
    });
  return apiFetch("/admin/stats", { headers: authHeaders(auth) });
}

export async function getAdminRestaurants(
  auth: AdminAuth = {},
): Promise<Restaurant[]> {
  if (IS_MOCK) return mockDelay(restaurants);
  return apiFetch("/admin/restaurants", { headers: authHeaders(auth) });
}

export async function getAdminAgents(auth: AdminAuth = {}): Promise<Agent[]> {
  if (IS_MOCK) return mockDelay(agents);
  return apiFetch("/admin/agents", { headers: authHeaders(auth) });
}

export async function getAdminAgentById(
  id: string,
  auth: AdminAuth = {},
): Promise<Agent | undefined> {
  if (IS_MOCK) return mockDelay(agents.find((a) => a.id === id));
  return apiGetOrUndefined(`/admin/agents/${id}`, { headers: authHeaders(auth) });
}

export async function getAdminAgentLedger(
  id: string,
  auth: AdminAuth = {},
): Promise<Transaction[]> {
  if (IS_MOCK) return mockDelay(agentTransactions);
  return apiFetch(`/admin/agents/${id}/ledger`, { headers: authHeaders(auth) });
}

export async function getAdminStores(auth: AdminAuth = {}): Promise<Store[]> {
  if (IS_MOCK) return mockDelay(stores);
  return apiFetch("/admin/stores", { headers: authHeaders(auth) });
}

export async function getAdminUsers(
  auth: AdminAuth = {},
): Promise<PlatformUser[]> {
  if (IS_MOCK) return mockDelay(platformUsers);
  return apiFetch("/admin/users", { headers: authHeaders(auth) });
}

export async function getAdminPlans(auth: AdminAuth = {}): Promise<Plan[]> {
  if (IS_MOCK) return mockDelay(plans);
  return apiFetch("/admin/plans", { headers: authHeaders(auth) });
}

export async function updateAdminBusinessStatus(
  businessId: string,
  status: AdminBusinessStatus,
  auth: AdminAuth = {},
): Promise<{ message?: string } | undefined> {
  if (IS_MOCK) return mockDelay(undefined, 150);
  return apiFetch(`/businesses/${businessId}/status`, {
    method: "PATCH",
    headers: authHeaders(auth),
    body: { status },
  });
}

/**
 * Bans/unbans a platform account — `PATCH /users/:id/status`, confirmed
 * against the live backend's `UsersController`/`UpdateUserStatusDto`, which
 * only ever accepts `{ status: "active" | "banned" }`. There is no delete
 * endpoint for a user in that controller (just `GET /users`, `GET /users/:id`
 * and this status patch), so the admin card's kebab menu has no delete
 * action — see the Users controller, which only exposes those three routes.
 */
export async function updateAdminUserStatus(
  userId: string,
  status: "active" | "banned",
  auth: AdminAuth = {},
): Promise<{ message?: string } | undefined> {
  if (IS_MOCK) return mockDelay(undefined, 150);
  return apiFetch(`/users/${userId}/status`, {
    method: "PATCH",
    headers: authHeaders(auth),
    body: { status },
  });
}

export async function getRegistrationRequests(
  auth: AdminAuth = {},
): Promise<RegistrationRequest[]> {
  if (IS_MOCK) return mockDelay([]);
  return apiFetch("/registration-requests", { headers: authHeaders(auth) });
}

export async function updateRegistrationRequestStatus(
  id: string,
  status: RegistrationRequestStatus,
  planId?: string,
  /** required when approving — the subscription period starts at the
   * moment of approval, so only its length needs to be chosen */
  duration?: SubscriptionDurationInput,
  auth: AdminAuth = {},
): Promise<RegistrationRequest> {
  return apiFetch(`/registration-requests/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(auth),
    body: { status, planId, ...(duration ?? {}) },
  });
}

export async function getBusinessSubscriptions(
  businessId: string,
  auth: AdminAuth = {},
): Promise<BusinessSubscription[]> {
  if (IS_MOCK) return mockDelay([]);
  return apiFetch(`/subscriptions?businessId=${businessId}`, {
    headers: authHeaders(auth),
  });
}

export async function changeBusinessPlan(
  subscriptionId: string,
  planId: string,
  auth: AdminAuth = {},
): Promise<BusinessSubscription> {
  return apiFetch(`/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    headers: authHeaders(auth),
    body: { planId },
  });
}

export async function updateAdminAgent(
  id: string,
  input: { commissionRate: number },
  auth: AdminAuth = {},
): Promise<{ message?: string }> {
  return apiFetch(`/agents/${id}`, {
    method: "PATCH",
    headers: authHeaders(auth),
    body: input,
  });
}

export async function updateAdminAgentStatus(
  id: string,
  status: "active" | "inactive",
  auth: AdminAuth = {},
): Promise<{ message?: string }> {
  return apiFetch(`/agents/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(auth),
    body: { status },
  });
}

/** "تجديد الاشتراك" — extends a subscription another billing cycle on the
 * same plan, amount and dates computed server-side. */
export async function renewSubscription(
  subscriptionId: string,
  auth: AdminAuth = {},
): Promise<{ message?: string }> {
  return apiFetch(`/subscriptions/${subscriptionId}/renew`, {
    method: "POST",
    headers: authHeaders(auth),
  });
}

export interface AdminPlanWriteInput {
  name: string;
  price: number;
  agentPrice: number;
  durationDays: number;
  hasCart?: boolean;
  hasStatistics?: boolean;
}

export async function createAdminPlan(
  input: AdminPlanWriteInput,
  auth: AdminAuth = {},
): Promise<Plan> {
  if (IS_MOCK) {
    return mockDelay({
      id: `p${Date.now()}`,
      name: { ar: input.name, en: input.name },
      priceMonthly: input.price,
      features: [],
      subscriberCount: 0,
      isPopular: false,
    });
  }
  return apiFetch("/subscription-plans", {
    method: "POST",
    headers: authHeaders(auth),
    body: input,
  });
}

export async function updateAdminPlan(
  id: string,
  input: Partial<AdminPlanWriteInput>,
  auth: AdminAuth = {},
): Promise<Plan> {
  if (IS_MOCK) {
    return mockDelay({
      id,
      name: { ar: input.name ?? "", en: input.name ?? "" },
      priceMonthly: input.price ?? 0,
      features: [],
      subscriberCount: 0,
      isPopular: false,
    });
  }
  return apiFetch(`/subscription-plans/${id}`, {
    method: "PATCH",
    headers: authHeaders(auth),
    body: input,
  });
}

export async function deleteAdminPlan(
  id: string,
  auth: AdminAuth = {},
): Promise<{ message?: string } | undefined> {
  if (IS_MOCK) return mockDelay(undefined, 150);
  return apiFetch<{ message?: string }>(`/subscription-plans/${id}`, {
    method: "DELETE",
    headers: authHeaders(auth),
  });
}

/**
 * Every paying business in one list, tagged by kind.
 *
 * Subscriptions are not a separate record in the mock: a subscription *is* a
 * business's plan dates, so the console reads them off the businesses rather
 * than keeping a second list that could disagree.
 */
export async function getAdminSubscriptions(
  auth: AdminAuth = {},
): Promise<{ business: Business; kind: "restaurant" | "store" }[]> {
  const [restaurantList, storeList] = await Promise.all([
    getAdminRestaurants(auth),
    getAdminStores(auth),
  ]);

  return [
    ...restaurantList.map((business) => ({
      business,
      kind: "restaurant" as const,
    })),
    ...storeList.map((business) => ({ business, kind: "store" as const })),
  ];
}

/** one business by id, whichever kind it is — the console addresses by id */
export async function getAdminBusiness(
  id: string,
  auth: AdminAuth = {},
) {
  const [restaurantList, storeList] = await Promise.all([
    getAdminRestaurants(auth),
    getAdminStores(auth),
  ]);

  const restaurant = restaurantList.find((r) => r.id === id);
  if (restaurant) return { business: restaurant, kind: "restaurant" as const };

  const store = storeList.find((s) => s.id === id);
  if (store) return { business: store, kind: "store" as const };

  return null;
}

// ---------------------------------------------------------------------------
// WhatsApp OTP gateway
// ---------------------------------------------------------------------------

/** Where the gateway's status lives. */
export const WHATSAPP_OTP_STATUS_PATH = "/whatsapp-otp/status";

/**
 * The gateway's health, as the console needs to read it.
 *
 * Four booleans rather than one status string, because they fail
 * independently and the panel says something different for each: the service
 * may be unconfigured on the server, configured but unreachable over the
 * network, reachable but not paired to a phone, or paired and working.
 */
export interface WhatsappOtpStatus {
  /** the gateway is set up on the server at all */
  configured: boolean;
  /** it answered this particular request */
  reachable: boolean;
  /** paired to a phone right now — the one that decides "connected" */
  connected: boolean;
  hasPendingQr: boolean;
  /** a full `data:image/png;base64,...` URL, ready for `src` as-is */
  qrBase64: string | null;
  /** the linked number, when the gateway reports one */
  phone: string | null;
  /** the name the device is paired under */
  profileName: string | null;
}

/**
 * The response, read loosely.
 *
 * The OpenAPI document declares no schema for this endpoint — the 200 carries
 * an empty description — so the exact spelling of the identity fields is not
 * knowable from the contract. Rather than guess one name and render a blank
 * line when it is wrong, the reader below accepts the handful of spellings a
 * WhatsApp gateway realistically uses and takes the first that holds a value.
 * When the real shape is confirmed this can collapse to one field each.
 */
interface WhatsappOtpStatusResponse {
  configured?: boolean;
  reachable?: boolean;
  connected?: boolean;
  has_pending_qr?: boolean;
  qr_base64?: string | null;
  [key: string]: unknown;
}

/** first of `keys` that holds a non-empty string */
function pickString(
  raw: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
}

/** a jid arrives as `963...@s.whatsapp.net`; only the number is wanted */
function toDisplayPhone(value: string | null): string | null {
  if (!value) return null;
  const digits = value.split("@")[0]!.replace(/\D/g, "");
  if (digits === "") return null;
  return `+${digits}`;
}

export async function getWhatsappOtpStatus(
  auth: AdminAuth = {},
): Promise<WhatsappOtpStatus> {
  if (IS_MOCK)
    return mockDelay({
      configured: true,
      reachable: true,
      connected: true,
      hasPendingQr: false,
      qrBase64: null,
      phone: "+963959825575",
      profileName: "Menu Syria",
    });

  const raw = await apiFetch<WhatsappOtpStatusResponse>(
    WHATSAPP_OTP_STATUS_PATH,
    { headers: authHeaders(auth) },
  );

  return {
    configured: raw.configured ?? false,
    reachable: raw.reachable ?? false,
    connected: raw.connected ?? false,
    hasPendingQr: raw.has_pending_qr ?? false,
    qrBase64: raw.qr_base64 ?? null,
    phone: toDisplayPhone(
      pickString(raw, [
        "phone",
        "phoneNumber",
        "phone_number",
        "number",
        "msisdn",
        "jid",
        "wid",
      ]),
    ),
    profileName: pickString(raw, [
      "profileName",
      "profile_name",
      "pushName",
      "push_name",
      "instanceName",
      "instance_name",
      "name",
    ]),
  };
}

/**
 * What the pairing endpoints answer with: the connection's state plus, when a
 * phone still has to scan, the code to scan. `qrDataUrl` is a full
 * `data:image/png;base64,...` string, ready for `src` as it stands.
 */
export interface WhatsappOtpPairing {
  connected: boolean;
  qrDataUrl: string | null;
}

interface WhatsappOtpPairingResponse {
  connected?: boolean;
  qr?: string | null;
  qrDataUrl?: string | null;
  qr_data_url?: string | null;
}

function toPairing(raw: WhatsappOtpPairingResponse): WhatsappOtpPairing {
  return {
    connected: raw.connected ?? false,
    qrDataUrl: raw.qrDataUrl ?? raw.qr_data_url ?? raw.qr ?? null,
  };
}

/**
 * Pairs a number when none is linked.
 *
 * Answers 409 when one already is — the gateway refuses to guess whether the
 * admin meant to swap or to add, which is why `replace` exists as its own
 * call. The 409 travels up as an `ApiError` so the dialog can say so.
 */
export async function linkWhatsappOtp(
  auth: AdminAuth = {},
): Promise<WhatsappOtpPairing> {
  if (IS_MOCK) return mockDelay({ connected: false, qrDataUrl: null });
  return toPairing(
    await apiFetch<WhatsappOtpPairingResponse>("/whatsapp-otp/link", {
      method: "POST",
      headers: authHeaders(auth),
    }),
  );
}

/**
 * Swaps the linked number in one step: logs the current one out, drops the
 * saved session and starts a fresh pairing. Sending stops until the new code
 * is scanned, which is why the dialog asks before calling this.
 */
export async function replaceWhatsappOtp(
  auth: AdminAuth = {},
): Promise<WhatsappOtpPairing> {
  if (IS_MOCK) return mockDelay({ connected: false, qrDataUrl: null });
  return toPairing(
    await apiFetch<WhatsappOtpPairingResponse>("/whatsapp-otp/replace", {
      method: "POST",
      headers: authHeaders(auth),
    }),
  );
}

/**
 * Unlinks and does not reconnect. Verification codes stop going out until
 * someone pairs again, so this is the destructive entry in the menu.
 */
export async function unlinkWhatsappOtp(
  auth: AdminAuth = {},
): Promise<{ message?: string } | undefined> {
  if (IS_MOCK) return mockDelay(undefined);
  return apiFetch("/whatsapp-otp/unlink", {
    method: "POST",
    headers: authHeaders(auth),
  });
}
