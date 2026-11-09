"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateOrderStatus } from "@/features/restaurant-dashboard/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import type { Order, OrderStatus } from "@/lib/types";

/**
 * The one-step-right order of the live board's columns — mirrors the
 * backend's own state machine (update-backend-orders.md §2). `delivered` can
 * still move to `refunded`, but that's a separate, explicit action
 * (`refund`), not part of this "advance" sequence.
 */
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "delivered",
};

/** `true` once an order can no longer move forward on the live board. */
export function isOrderTerminal(status: OrderStatus): boolean {
  return NEXT_STATUS[status] === undefined;
}

/**
 * Moving an order along the kanban.
 *
 * The board only ever moves an order one step to the right — the caller
 * passes the order and this decides the destination via `NEXT_STATUS`,
 * rather than every button knowing the sequence.
 */
export function useOrderMutations() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const key = queryKeys.me.orders;

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Order[]>(key);
      if (previous) {
        queryClient.setQueryData<Order[]>(
          key,
          previous.map((order) =>
            order.id === id ? { ...order, status } : order,
          ),
        );
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    advance: (order: Order) => {
      const next = NEXT_STATUS[order.status];
      if (next) advance.mutate({ id: order.id, status: next });
    },
    cancel: (order: Order) =>
      advance.mutate({ id: order.id, status: "cancelled" }),
    isPending: advance.isPending,
  };
}
