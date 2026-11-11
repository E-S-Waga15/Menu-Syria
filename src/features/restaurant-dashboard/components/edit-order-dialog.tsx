"use client";

import { useState } from "react";

import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Price } from "@/components/shared/price";
import { useOrderMutations } from "@/features/restaurant-dashboard/hooks/use-orders";
import { fmt, useI18n } from "@/i18n/client";
import { toast } from "@/lib/toast";
import type { Order } from "@/lib/types";

/**
 * Changing a still-`pending` order's lines — quantities or dropping a line
 * entirely — before the kitchen confirms it. Only ever opened on a `pending`
 * order (gated in `OrdersKanban`); the total is recomputed server-side the
 * same way initial placement already is, never summed here and trusted.
 */
export function EditOrderDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lang } = useI18n();
  const { editLines, isEditingLines } = useOrderMutations();

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [seededFor, setSeededFor] = useState<{ order: Order | null; open: boolean } | null>(
    null,
  );
  if (seededFor?.order !== order || seededFor?.open !== open) {
    setSeededFor({ order, open });
    setQuantities(
      Object.fromEntries((order?.lines ?? []).map((line) => [line.itemId, line.quantity])),
    );
  }

  if (!order) return null;

  const setQuantity = (itemId: string, next: number) => {
    setQuantities((prev) => ({ ...prev, [itemId]: Math.max(0, next) }));
  };

  const remainingLines = order.lines.filter((line) => (quantities[line.itemId] ?? 0) > 0);
  const total = remainingLines.reduce(
    (sum, line) => sum + line.price * (quantities[line.itemId] ?? 0),
    0,
  );

  const save = async () => {
    if (remainingLines.length === 0) {
      toast.error(t.dashboard.orderMustHaveOneItem);
      return;
    }
    await editLines(
      order.id,
      remainingLines.map((line) => ({
        itemId: line.itemId,
        quantity: quantities[line.itemId]!,
      })),
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {fmt(t.dashboard.editOrderTitle, { number: order.number })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 px-4 pb-2">
          {order.lines.map((line) => {
            const qty = quantities[line.itemId] ?? 0;
            return (
              <div
                key={line.itemId}
                className="flex items-center gap-3 rounded-xl border border-border/60 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{line.name[lang]}</p>
                  <Price
                    amount={line.price}
                    currency={t.common.currency}
                    lang={lang}
                    className="text-xs text-muted-foreground"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    onClick={() => setQuantity(line.itemId, qty - 1)}
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="w-6 text-center text-sm font-bold tabular-nums">
                    {qty}
                  </span>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    onClick={() => setQuantity(line.itemId, qty + 1)}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setQuantity(line.itemId, 0)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between border-t border-dashed border-border pt-3">
            <span className="font-bold">{t.dashboard.orderTotal}</span>
            <Price
              amount={total}
              currency={t.common.currency}
              lang={lang}
              className="font-bold text-primary"
            />
          </div>
        </div>
        <DialogFooter className="px-4 pb-4">
          <Button className="w-full" loading={isEditingLines} onClick={() => void save()}>
            {t.dashboard.saveOrderChanges}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
