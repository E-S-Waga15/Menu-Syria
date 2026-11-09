import { CustomerDetail } from "@/features/restaurant-dashboard/components/customer-detail";

export default async function DashboardCustomerDetailPage({
  params,
}: PageProps<"/[lang]/dashboard/customers/[id]">) {
  const { id } = await params;
  return <CustomerDetail id={id} />;
}
