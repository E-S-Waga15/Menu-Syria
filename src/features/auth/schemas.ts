import { z } from "zod";

import { optionalEmail, syrianPhone, type ValidationMessages } from "@/lib/validation";

/**
 * Schema factories take the localized message pack so errors speak the
 * visitor's language. Types are inferred once and shared with the forms.
 */

export const phoneFormSchema = (v: ValidationMessages) =>
  z.object({ phone: syrianPhone(v.phoneInvalid) });
export type PhoneFormValues = z.infer<ReturnType<typeof phoneFormSchema>>;

export const otpFormSchema = (v: ValidationMessages) =>
  z.object({ otp: z.string().length(6, v.otpIncomplete) });
export type OtpFormValues = z.infer<ReturnType<typeof otpFormSchema>>;

/** Forgot-password: the OTP sent to the phone plus the new password, set
 * together in one call — there is no separate "verify" step for a reset. */
export const resetPasswordSchema = (v: ValidationMessages) =>
  z
    .object({
      otp: z.string().length(6, v.otpIncomplete),
      newPassword: z.string().min(8, v.passwordMin),
      confirmNewPassword: z.string().min(1, v.required),
    })
    .superRefine((values, ctx) => {
      if (values.newPassword !== values.confirmNewPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmNewPassword"],
          message: v.passwordsMismatch,
        });
      }
    });
export type ResetPasswordValues = z.infer<
  ReturnType<typeof resetPasswordSchema>
>;

/** Business sign-in's second method: username + password (phone+OTP is the first). */
export const credentialsSchema = (v: ValidationMessages) =>
  z.object({
    username: z.string().trim().min(1, v.required),
    password: z.string().min(1, v.required),
  });
export type CredentialsValues = z.infer<ReturnType<typeof credentialsSchema>>;

export const adminLoginSchema = (v: ValidationMessages) =>
  z.object({
    email: z.string().trim().min(1, v.required).email(v.emailInvalid),
    password: z.string().min(1, v.required),
  });
export type AdminLoginValues = z.infer<ReturnType<typeof adminLoginSchema>>;

export const userProfileSchema = (v: ValidationMessages) =>
  z.object({
    name: z.string().trim().min(2, v.nameMin),
    birthDate: z.string().min(1, v.birthDateRequired),
    gender: z.enum(["male", "female"]),
  });
export type UserProfileValues = z.infer<ReturnType<typeof userProfileSchema>>;

/**
 * The shared restaurant/store registration wizard — four steps:
 * info, brand & colors, address & location, social media.
 */
export const registerWizardSchema = (v: ValidationMessages) =>
  z
    .object({
      // step 1 — information
      name: z.string().trim().min(1, v.required),
      subTypeId: z.string().min(1, v.businessTypeRequired),
      username: z.string().trim().min(3, v.usernameMin),
      phone: syrianPhone(v.phoneInvalid),
      email: optionalEmail(v.emailInvalid),
      password: z.string().min(8, v.passwordMin),
      confirmPassword: z.string().min(1, v.required),
      // locked & auto-filled when an agent (or a link carrying ?ref=) brings
      // the owner here; free text otherwise
      referral: z.string(),
      // optional — left blank, the backend assigns one; dots are blocked
      // and spaces turned into "_" as the owner types, same rule as the
      // dashboard's own slug editor
      slug: z.string(),

      // step 2 — visual identity & colors
      logoUrl: z.string(),
      description: z.string(),
      primaryColor: z.string().min(1, v.required),
      secondaryColor: z.string().min(1, v.required),

      // step 3 — address & location
      governorateId: z.string().min(1, v.governorateRequired),
      regionId: z.string().min(1, v.regionRequired),
      address: z.string(),
      lat: z.number().nullable(),
      lng: z.number().nullable(),

      // step 4 — social media
      instagram: z.string(),
      facebook: z.string(),
      tiktok: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.password !== values.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: v.passwordsMismatch,
        });
      }
    });
export type RegisterWizardValues = z.infer<
  ReturnType<typeof registerWizardSchema>
>;

/** Which wizard fields each step must pass before advancing. */
export const registerStepFields: (keyof RegisterWizardValues)[][] = [
  ["name", "subTypeId", "username", "phone", "email", "password", "confirmPassword"],
  ["primaryColor", "secondaryColor"],
  ["governorateId", "regionId"],
  [],
];

/**
 * Agent self-registration — three steps: info, governorate & regions
 * (multi-select within the governorate), social media.
 */
export const agentRegisterSchema = (v: ValidationMessages) =>
  z
    .object({
      name: z.string().trim().min(2, v.nameMin),
      username: z.string().trim().min(3, v.usernameMin),
      phone: syrianPhone(v.phoneInvalid),
      email: optionalEmail(v.emailInvalid),
      password: z.string().min(8, v.passwordMin),
      confirmPassword: z.string().min(1, v.required),
      photoUrl: z.string(),
      governorateId: z.string().min(1, v.governorateRequired),
      regionIds: z
        .array(z.string())
        .min(1, v.regionsRequired)
        .max(2, v.regionsMax),
      bio: z.string(),
      instagram: z.string(),
      facebook: z.string(),
      tiktok: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.password !== values.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: v.passwordsMismatch,
        });
      }
    });
export type AgentRegisterValues = z.infer<
  ReturnType<typeof agentRegisterSchema>
>;

export const agentStepFields: (keyof AgentRegisterValues)[][] = [
  ["name", "username", "phone", "email", "password", "confirmPassword"],
  ["governorateId", "regionIds"],
  [],
];
