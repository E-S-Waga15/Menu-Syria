"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { NotificationsList } from "@/features/notifications/components/notifications-list";
import { getNotifications } from "@/features/notifications/services";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";

/** An agent's own notices — referred signups, dues settled, anything the
 * backend routes to their account. */
export function AgentNotifications() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: notifications, isPending } = useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => getNotifications(),
  });

  if (isPending) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <h1 className="font-heading text-xl font-bold">
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
