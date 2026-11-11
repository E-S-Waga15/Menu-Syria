import { AnalyticsViewLazy } from "@/features/restaurant-dashboard/components/analytics-view-lazy";

// Not gated: analytics stays available on every plan, unlike Orders/Kitchen/
// Tables below it in the sidebar — see PlanFeatureGate for those.
export default function DashboardAnalyticsPage() {
  return <AnalyticsViewLazy />;
}
