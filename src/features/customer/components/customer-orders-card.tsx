"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
import { useCartStore } from "@/stores/cart-store";
import { useOrderHistoryStore } from "@/stores/order-history-store";

/**
 * What this customer ordered.
 *
 * The history is the one the storefront writes as orders are placed (keyed by
 * the account's own identifier), so the list here needs no extra request —
 * and reordering refills the cart with the same lines.
 */
export function CustomerOrdersCard({ customerId }: { customerId: string }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const allOrders = useOrderHistoryStore((s) => s.entries);
  const addItem = useCartStore((s) => s.addItem);
  const clearCart = useCartStore((s) => s.clear);

  const myOrders = useMemo(
    () => allOrders.filter((order) => order.customerId === customerId),
    [allOrders, customerId],
  );

  const handleReorder = (order: (typeof myOrders)[number]) => {
    clearCart();
    for (const line of order.lines)
      addItem(order.businessId, line.item, line.options, line.quantity);
    // storefront slugs are locale-less on purpose — see proxy.ts
    router.push(`/${order.businessSlug}`);
  };

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-6">
      <h2 className="font-heading text-lg font-semibold">
        {t.account.ordersTitle}
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {t.account.ordersBody}
      </p>

      {myOrders.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t.orderHistory.empty}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {myOrders.map((order) => (
            <li key={order.id} className="rounded-2xl border border-border/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/${order.businessSlug}`}
                    className="truncate font-semibold hover:underline"
                  >
                    {order.businessName[lang]}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {fmt(t.orderHistory.placedOn, {
                      date: new Date(order.createdAt).toLocaleDateString(
                        lang === "ar" ? "ar-SY" : "en-US",
                      ),
                    })}
                    {" · "}
                    {fmt(t.orderHistory.itemsCount, {
                      count: order.lines.reduce(
                        (sum, line) => sum + line.quantity,
                        0,
                      ),
                    })}
                  </p>
                </div>
                <span
                  className="shrink-0 font-heading text-sm font-bold"
                  dir="ltr"
                >
                  {formatPrice(order.total, t.common.currency)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full gap-1.5"
                onClick={() => handleReorder(order)}
              >
                <RotateCcw className="size-3.5" />
                {t.orderHistory.reorder}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}