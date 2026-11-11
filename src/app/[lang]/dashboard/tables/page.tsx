import { PlanFeatureGate } from "@/features/restaurant-dashboard/components/plan-feature-gate";
import { TablesBoard } from "@/features/restaurant-dashboard/components/tables-board";

export default function DashboardTablesPage() {
  return (
    <PlanFeatureGate>
      <TablesBoard />
    </PlanFeatureGate>
  );
}
