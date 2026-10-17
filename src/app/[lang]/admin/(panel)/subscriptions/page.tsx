import { AdminSubscriptionsList } from "@/features/admin/components/subscriptions-list";
import { fetchAdminPage } from "@/features/admin/server";
import { getAdminSubscriptionsList } from "@/features/admin/services";

export default async function AdminSubscriptionsPage({
  params,
}: PageProps<"/[lang]/admin/subscriptions">) {
  const { lang } = await params;

  const [initialAgent, initialPlatform] = await Promise.all([
    fetchAdminPage(lang, (accessToken) =>
      getAdminSubscriptionsList({ kind: "agent", status: "active" }, { accessToken }),
    ),
    fetchAdminPage(lang, (accessToken) =>
      getAdminSubscriptionsList({ kind: "platform", status: "active" }, { accessToken }),
    ),
  ]);

  return (
    <AdminSubscriptionsList
      initialAgent={initialAgent}
      initialPlatform={initialPlatform}
    />
  );
}
