import { AnalyticsViewLazy } from "@/features/restaurant-dashboard/components/analytics-view-lazy";
import { PlanFeatureGate } from "@/features/restaurant-dashboard/components/plan-feature-gate";

export default function DashboardAnalyticsPage() {
  return (
    <PlanFeatureGate feature="statistics">
      <AnalyticsViewLazy />
    </PlanFeatureGate>
  );
}
