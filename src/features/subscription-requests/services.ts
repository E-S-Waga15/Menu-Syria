import { apiFetch, IS_MOCK, mockDelay } from "@/lib/api/client";
import type {
  SubscriptionDurationInput,
  SubscriptionDurationType,
} from "@/features/admin/services";

/**
 * Subscription requests are how a plan change/upgrade happens now — never an
 * instant write. A business (or an agent on its behalf) asks for a plan;
 * nothing changes until an admin approves it with an exact duration, at
 * which point the subscription's dates and amount owed are computed
 * server-side, with no separate "confirm the cash arrived" step after that.
 */
export type { SubscriptionDurationInput, SubscriptionDurationType };

export interface SubscriptionRequest {
  id: string;
  businessId: string;
  planId: string;
  agentId: string | null;
  requestedByUserId: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  business?: { id: string; name: string; slug: string } | null;
  plan?: { id: string; name: string; price: string | number } | null;
  agent?: { id: string; name: string } | null;
}

export interface Plan {
  id: string;
  name: string | { ar: string; en: string };
  price: string | number;
  agentPrice: string | number;
  durationDays: number;
}

export async function getSubscriptionPlans(): Promise<Plan[]> {
  if (IS_MOCK) return mockDelay([]);
  try {
    return await apiFetch<Plan[]>("/subscription-plans");
  } catch {
    // Public endpoint may be unreachable in some environments — the plan
    // picker hides itself instead of breaking the whole screen.
    return [];
  }
}

/** Business asks for a plan (new or an upgrade) / agent asks on a referred
 * business's behalf. Only creates a pending request — nothing changes until
 * an admin approves it with a duration (see `updateSubscriptionRequestStatus`). */
export async function createSubscriptionRequest(
  input: {
    businessId?: string;
    planId: string;
    /** informational only — the admin's own duration choice at approval
     * time is what actually gets billed, not this */
    billingCycle?: "monthly" | "yearly";
    notes?: string;
  },
): Promise<SubscriptionRequest> {
  if (IS_MOCK) {
    return mockDelay({
      id: `sr-${Date.now()}`,
      businessId: input.businessId ?? "",
      planId: input.planId,
      agentId: null,
      requestedByUserId: null,
      notes: input.notes ?? null,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }
  return apiFetch<SubscriptionRequest>("/subscription-requests", {
    method: "POST",
    body: input,
  });
}

export async function getSubscriptionRequests(
  auth: { accessToken?: string | null } = {},
): Promise<SubscriptionRequest[]> {
  if (IS_MOCK) return mockDelay([]);
  return apiFetch<SubscriptionRequest[]>("/subscription-requests", {
    headers: auth.accessToken
      ? { Authorization: `Bearer ${auth.accessToken}` }
      : {},
  });
}

/**
 * Rejecting needs only the status. Approving needs an exact duration —
 * `startDate` is always the approval moment, never admin-specified, and the
 * amount owed (and any agent commission) is computed server-side from the
 * chosen plan/duration, exactly, with no rounding.
 */
export async function updateSubscriptionRequestStatus(
  id: string,
  status: "approved" | "rejected",
  approval?: { planId?: string } & SubscriptionDurationInput,
  auth: { accessToken?: string | null } = {},
): Promise<SubscriptionRequest> {
  return apiFetch<SubscriptionRequest>(`/subscription-requests/${id}/status`, {
    method: "PATCH",
    headers: auth.accessToken
      ? { Authorization: `Bearer ${auth.accessToken}` }
      : {},
    body: { status, ...(approval ?? {}) },
  });
}
