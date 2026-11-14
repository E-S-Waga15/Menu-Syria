import { OrderPrintView } from "@/features/restaurant-dashboard/components/order-print-view";

export default async function PrintOrderPage({
  params,
}: PageProps<"/[lang]/print/orders/[id]">) {
  const { id } = await params;
  return <OrderPrintView id={id} />;
}
