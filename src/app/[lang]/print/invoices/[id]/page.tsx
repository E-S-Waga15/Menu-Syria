import { InvoicePrintView } from "@/features/restaurant-dashboard/components/invoice-print-view";

export default async function PrintInvoicePage({
  params,
}: PageProps<"/[lang]/print/invoices/[id]">) {
  const { id } = await params;
  return <InvoicePrintView id={id} />;
}
