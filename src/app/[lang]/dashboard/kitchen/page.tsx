import { KitchenScreen } from "@/features/restaurant-dashboard/components/kitchen-screen";
import { PlanFeatureGate } from "@/features/restaurant-dashboard/components/plan-feature-gate";

export default async function DashboardKitchenPage({
  params,
}: PageProps<"/[lang]/dashboard/kitchen">) {
  const { lang } = await params;
  return (
    <PlanFeatureGate feature="cart">
      <KitchenScreen dashboardBase={`/${lang}/dashboard`} />
    </PlanFeatureGate>
  );
}
