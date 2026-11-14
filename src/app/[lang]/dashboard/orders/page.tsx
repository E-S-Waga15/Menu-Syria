import { OrdersPage } from "@/features/restaurant-dashboard/components/orders-page";
import { PlanFeatureGate } from "@/features/restaurant-dashboard/components/plan-feature-gate";

export default async function DashboardOrdersPage({
  params,
}: PageProps<"/[lang]/dashboard/orders">) {
  const { lang } = await params;

  return (
    <PlanFeatureGate>
      <OrdersPage dashboardBase={`/${lang}/dashboard`} />
    </PlanFeatureGate>
  );
}
