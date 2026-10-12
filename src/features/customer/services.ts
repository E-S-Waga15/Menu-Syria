/**
 * Account services — the signed-in person's own profile, whatever their role.
 *
 * Every route here answers with the same whole-account payload, so a mutation
 * can drop its response straight into the cache the page reads instead of
 * fetching again to learn what changed.
 */

import { apiFetch, IS_MOCK, mockDelay } from "@/lib/api/client";
import type { UserRole } from "@/features/auth/store";

/** Mirrors the backend's `NumberType` enum. */
export type CustomerPhoneType = "mobile" | "whatsapp" | "landline";

export interface CustomerPhone {
  id: string;
  number: string;
  numberType: CustomerPhoneType;
}

export interface CustomerAccount {
  id: string;
  name: string;
  /** null until a real address is added — phone signups get a generated one
   * (`<digits>@phone.menusyria.internal`) that nobody can receive mail at */
  email: string | null;
  avatarUrl: string | null;
  /** backend role, e.g. `CUSTOMER` */
  role: string;
  frontendRole: UserRole;
  createdAt: string;
  phones: CustomerPhone[];
  stats: { orders: number };
}

export interface CustomerProfileInput {
  name?: string;
  /** omitted when the field was left blank: "no email" is not a value the
   * server accepts, and a blank field has to mean "leave it alone" */
  email?: string;
}

export interface CustomerPhoneInput {
  number: string;
  numberType: CustomerPhoneType;
}

const PHONE_TYPES: CustomerPhoneType[] = ["mobile", "whatsapp", "landline"];

/** Anything the API leaves out or invents is trimmed to the three kinds the
 * UI knows how to label, rather than leaking an unknown string into a badge. */
const toPhoneType = (value: unknown): CustomerPhoneType =>
  PHONE_TYPES.includes(value as CustomerPhoneType)
    ? (value as CustomerPhoneType)
    : "mobile";

function normalizeAccount(
  raw: Record<string, unknown>,
): CustomerAccount & { message?: string } {
  const phones = Array.isArray(raw.phones) ? raw.phones : [];
  const stats = (raw.stats ?? {}) as Record<string, unknown>;

  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    email: typeof raw.email === "string" && raw.email ? raw.email : null,
    avatarUrl:
      typeof raw.avatarUrl === "string" && raw.avatarUrl ? raw.avatarUrl : null,
    role: String(raw.role ?? "CUSTOMER"),
    frontendRole: (raw.frontendRole as UserRole) ?? "user",
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    phones: phones.map((phone) => {
      const row = phone as Record<string, unknown>;
      return {
        id: String(row.id),
        number: String(row.number ?? ""),
        numberType: toPhoneType(row.numberType),
      };
    }),
    stats: { orders: Number(stats.orders ?? 0) },
    message: typeof raw.message === "string" ? raw.message : undefined,
  };
}

/** A signed-in-looking account for the no-backend mode, built fresh on every
 * call so a mock mutation can never publish its edit back into the module. */
function mockAccount(): CustomerAccount {
  return {
    id: "mock-customer",
    name: "Customer User",
    email: "customer@example.com",
    avatarUrl: null,
    role: "CUSTOMER",
    frontendRole: "user",
    createdAt: new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    phones: [
      { id: "mock-phone-1", number: "+963912345678", numberType: "mobile" },
    ],
    stats: { orders: 0 },
  };
}

export async function getMyAccount(): Promise<CustomerAccount> {
  if (IS_MOCK) return mockDelay(mockAccount());
  return normalizeAccount(await apiFetch<Record<string, unknown>>("/me/account"));
}

export async function updateMyProfile(
  input: CustomerProfileInput,
): Promise<CustomerAccount & { message?: string }> {
  if (IS_MOCK) return mockDelay({ ...mockAccount(), ...input });
  return normalizeAccount(
    await apiFetch<Record<string, unknown>>("/me/profile", {
      method: "PATCH",
      body: input,
    }),
  );
}

/** Takes an already-uploaded URL (`uploadImage`) or a base64 Data URL — the
 * backend stores either and returns the hosted path in the account payload. */
export async function updateMyAvatar(
  avatarUrl: string,
): Promise<CustomerAccount & { message?: string }> {
  if (IS_MOCK) return mockDelay({ ...mockAccount(), avatarUrl });
  return normalizeAccount(
    await apiFetch<Record<string, unknown>>("/me/avatar", {
      method: "PATCH",
      body: { avatarUrl },
    }),
  );
}

export async function addMyPhone(
  input: CustomerPhoneInput,
): Promise<CustomerAccount & { message?: string }> {
  if (IS_MOCK) {
    const account = mockAccount();
    return mockDelay({
      ...account,
      phones: [
        ...account.phones,
        {
          id: `mock-phone-${account.phones.length + 1}`,
          number: input.number,
          numberType: input.numberType,
        },
      ],
    });
  }
  return normalizeAccount(
    await apiFetch<Record<string, unknown>>("/me/phones", {
      method: "POST",
      body: input,
    }),
  );
}

export async function removeMyPhone(
  phoneId: string,
): Promise<CustomerAccount & { message?: string }> {
  if (IS_MOCK) {
    const account = mockAccount();
    return mockDelay({
      ...account,
      phones: account.phones.filter((phone) => phone.id !== phoneId),
    });
  }
  return normalizeAccount(
    await apiFetch<Record<string, unknown>>(`/me/phones/${phoneId}`, {
      method: "DELETE",
    }),
  );
}
