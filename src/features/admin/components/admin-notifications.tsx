"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { getNotifications } from "@/features/notifications/services";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";

/** Platform-wide notices — new signups, registration/subscription requests
 * waiting on review, anything else the backend routes to an admin account. */
export function AdminNotifications() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: notifications, isPending } = useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => getNotifications(),
  });

  if (isPending) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t.notifications.title}
        count={notifications?.length ?? 0}
      />
      <NotificationsList
        notifications={notifications ?? []}
        onChange={() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
          void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread });
        }}
      />
    </div>
  );
}
