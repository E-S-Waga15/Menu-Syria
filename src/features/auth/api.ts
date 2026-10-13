/**
 * Auth API — typed wrappers around all auth endpoints.
 *
 * When IS_MOCK is true (NEXT_PUBLIC_API_URL is empty) every call resolves
 * from mock data so development still works without a running backend.
 */

import { apiFetch, IS_MOCK, mockDelay } from "@/lib/api/client";
import { lookupRolesByPhone } from "@/features/auth/mock-directory";
import type { UserRole, BusinessType } from "@/features/auth/store";

export type RegistrationRequestType = "RESTAURANT" | "STORE";

// ---------------------------------------------------------------------------
// Response shapes (mirror the backend DTOs)
// ---------------------------------------------------------------------------

export interface AuthUserSummary {
  id: string;
  email: string | null;
  name: string;
  frontendRole: UserRole;
  businessName: string | null;
  businessType: BusinessType | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUserSummary;
}

export interface NewUserOtpResponse {
  isNewUser: true;
  signupToken: string;
  message: string;
}

export interface ExistingUserOtpResponse {
  isNewUser: false;
  accessToken: string;
  refreshToken: string;
  user: AuthUserSummary;
}

export type VerifyOtpResponse = NewUserOtpResponse | ExistingUserOtpResponse;

const normalizePhoneNumber = (phoneNumber: string) =>
  phoneNumber.replace(/[\s+()-]/g, "");

export async function submitRegistrationRequest(input: {
  districtId: string;
  applicantName: string;
  phone: string;
  username: string;
  password: string;
  confirmPassword: string;
  subTypeId: string;
  email?: string;
  notes?: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  type: RegistrationRequestType;
  referralCode?: string;
  planId?: string;
}): Promise<{ id: string }> {
  return apiFetch("/registration-requests/public", {
    method: "POST",
    body: {
      ...input,
      phone: normalizePhoneNumber(input.phone),
    },
  });
}

/**
 * Agent self-registration. `/registration-requests/public` is documented
 * for RESTAURANT/STORE applications only — agents are otherwise created by
 * a SUPER_ADMIN via `POST /agents`. This submits to the same public endpoint
 * with an AGENT-shaped body as a first pass; confirming (or replacing) the
 * real intake route is tracked as follow-up work.
 */
export async function submitAgentApplication(input: {
  name: string;
  username: string;
  phone: string;
  email?: string;
  password: string;
  confirmPassword: string;
  governorateId: string;
  districtIds: string[];
  photoUrl?: string;
  notes?: string;
}): Promise<{ id: string }> {
  return apiFetch("/registration-requests/public", {
    method: "POST",
    body: {
      applicantName: input.name,
      username: input.username,
      phone: normalizePhoneNumber(input.phone),
      email: input.email,
      password: input.password,
      confirmPassword: input.confirmPassword,
      governorateId: input.governorateId,
      districtIds: input.districtIds,
      photoUrl: input.photoUrl,
      notes: input.notes,
      type: "AGENT",
    },
  });
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/** Request an OTP be sent to the given phone number. */
export async function requestOtp(
  phoneNumber: string,
): Promise<{ message: string }> {
  if (IS_MOCK) {
    return mockDelay({ message: "OTP sent (mock)" });
  }
  return apiFetch("/auth/otp/request", {
    method: "POST",
    body: { phoneNumber: normalizePhoneNumber(phoneNumber) },
  });
}

/** Verify the OTP. Returns either a signup token (new user) or full session (existing user). */
export async function verifyOtp(
  phoneNumber: string,
  code: string,
): Promise<VerifyOtpResponse> {
  if (IS_MOCK) {
    // Reuse the mock directory: any known phone → existing user, unknown → new user
    const roles = lookupRolesByPhone(phoneNumber);
    if (roles.length > 0) {
      const r = roles[0];
      return mockDelay<ExistingUserOtpResponse>({
        isNewUser: false,
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: {
          id: "mock-user-id",
          email: null,
          name: r.label,
          frontendRole: r.role,
          businessName: null,
          businessType: r.businessType ?? null,
        },
      });
    }
    return mockDelay<NewUserOtpResponse>({
      isNewUser: true,
      signupToken: "mock-signup-token",
      message: "New user — please complete your profile (mock)",
    });
  }
  return apiFetch("/auth/otp/verify", {
    method: "POST",
    body: { phoneNumber: normalizePhoneNumber(phoneNumber), code },
  });
}

/**
 * Sets a new password for the account at this phone number, proving
 * identity with the same OTP code sent by `requestOtp` — one call verifies
 * the code and sets the password together, so there is no separate "verify"
 * step for a reset the way there is for login.
 */
export async function resetPassword(
  phoneNumber: string,
  code: string,
  newPassword: string,
  confirmNewPassword: string,
): Promise<{ message: string }> {
  if (IS_MOCK) {
    return mockDelay({ message: "Password updated (mock)" });
  }
  return apiFetch("/auth/password/reset", {
    method: "POST",
    body: {
      phoneNumber: normalizePhoneNumber(phoneNumber),
      code,
      newPassword,
      confirmNewPassword,
    },
  });
}

/** Complete registration for a new user (phone-based). */
export async function registerWithOtp(
  signupToken: string,
  name: string,
  email?: string,
): Promise<AuthResponse> {
  if (IS_MOCK) {
    return mockDelay<AuthResponse>({
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      user: {
        id: "mock-user-id",
        email: email ?? null,
        name,
        frontendRole: "user",
        businessName: null,
        businessType: null,
      },
    });
  }
  return apiFetch("/auth/otp/register", {
    method: "POST",
    body: { signupToken, name, email },
  });
}

/** Login with username + password. The backend resolves the role from the
 * user record — the client never picks one. */
export async function loginWithCredentials(
  username: string,
  password: string,
): Promise<AuthResponse> {
  if (IS_MOCK) {
    return mockDelay<AuthResponse>({
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      user: {
        id: "mock-user-id",
        email: null,
        name: username,
        frontendRole: "owner",
        businessName: null,
        businessType: "restaurant",
      },
    });
  }
  return apiFetch("/auth/login", {
    method: "POST",
    body: { username, password },
  });
}

/** Admin console login — the one caller still on email + password. */
export async function loginAdminWithCredentials(
  email: string,
  password: string,
): Promise<AuthResponse> {
  if (IS_MOCK) {
    return mockDelay<AuthResponse>({
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
      user: {
        id: "mock-user-id",
        email,
        name: email,
        frontendRole: "admin",
        businessName: null,
        businessType: null,
      },
    });
  }
  return apiFetch("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}
