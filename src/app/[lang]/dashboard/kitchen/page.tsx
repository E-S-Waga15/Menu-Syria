import { KitchenScreen } from "@/features/restaurant-dashboard/components/kitchen-screen";

export default async function DashboardKitchenPage({
  params,
}: PageProps<"/[lang]/dashboard/kitchen">) {
  const { lang } = await params;
  return <KitchenScreen dashboardBase={`/${lang}/dashboard`} />;
}
