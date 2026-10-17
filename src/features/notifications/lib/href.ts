import type { AppNotification } from "@/lib/types";

/**
 * Where tapping a notice should take you — purely a function of its `type`,
 * since each type only ever reaches one role (the backend already scopes
 * delivery that way), so there's no ambiguity about which dashboard's route
 * to build. Some types (e.g. `account_disabled`) have nowhere specific to
 * go — those return `undefined` and the notice just marks itself read.
 */
export function notificationHref(
  notification: AppNotification,
  lang: string,
): string | undefined {
  switch (notification.type) {
    case "new_user_registered":
      return `/${lang}/admin/users`;
    case "new_registration_request":
      return notification.referenceId
        ? `/${lang}/admin/registration-requests/${notification.referenceId}`
        : `/${lang}/admin/registration-requests`;
    case "new_subscription_request":
      return `/${lang}/admin/subscription-requests`;
    case "agent_referral_used":
    case "agent_dues_settled":
      return `/${lang}/agent`;
    case "subscription_activated":
    case "subscription_renewed":
    case "subscription_expiring":
    case "subscription_expired":
      return `/${lang}/dashboard/settings`;
    case "account_disabled":
      return undefined;
    default:
      return undefined;
  }
}
