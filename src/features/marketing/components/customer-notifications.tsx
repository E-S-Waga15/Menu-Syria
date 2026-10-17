"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { getNotifications } from "@/features/notifications/services";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";

/** A customer's own notices — account status changes, anything the backend
 * routes to a plain user account. */
export function CustomerNotifications() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: notifications, isPending } = useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => getNotifications(),
  });

  if (isPending) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-display text-2xl md:text-3xl">
        {t.notifications.title}
      </h1>
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
