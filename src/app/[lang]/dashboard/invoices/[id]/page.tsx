import { InvoiceDetail } from "@/features/restaurant-dashboard/components/invoice-detail";

export default async function DashboardInvoiceDetailPage({
  params,
}: PageProps<"/[lang]/dashboard/invoices/[id]">) {
  const { id } = await params;
  return <InvoiceDetail id={id} />;
}
