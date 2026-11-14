import { resolveOrderInvoiceId } from "@/features/restaurant-dashboard/services";
import type { Order, Restaurant } from "@/lib/types";

/**
 * Opens the right print view for one order in a new tab: a real invoice if
 * the business has `invoicingEnabled` (resolving `order.invoiceId` first if
 * the order itself doesn't already carry it — see `resolveOrderInvoiceId`),
 * or the plain order receipt otherwise. Async because that resolution may
 * need a network round trip, so this is an onClick handler rather than a
 * plain `<a href>` — the one case a toast fires is an invoicing-enabled
 * business whose order somehow never got an invoice (predates the setting).
 */
export async function openOrderPrint(
  order: Order,
  business: Restaurant | undefined,
  lang: string,
  onMissingInvoice: () => void,
): Promise<void> {
  if (!business?.invoicingEnabled) {
    window.open(`/${lang}/print/orders/${order.id}`, "_blank", "noopener,noreferrer");
    return;
  }
  const invoiceId = order.invoiceId ?? (await resolveOrderInvoiceId(order.id));
  if (!invoiceId) {
    onMissingInvoice();
    return;
  }
  window.open(`/${lang}/print/invoices/${invoiceId}`, "_blank", "noopener,noreferrer");
}
