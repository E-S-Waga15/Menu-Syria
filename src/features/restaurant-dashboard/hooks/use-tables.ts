"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  updateTable,
  type TableWriteInput,
} from "@/features/restaurant-dashboard/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import type { DiningTable } from "@/lib/types";

/**
 * Whether a table's reservation is still in its window — read on every
 * render rather than waiting on a scheduled job to flip the table back,
 * per the report's own "or lazy check-on-read" option for auto-release.
 */
export function isReservationActive(table: DiningTable): boolean {
  if (!table.reservedUntil) return false;
  return new Date(table.reservedUntil).getTime() > Date.now();
}

/** Occupancy and waiter assignment on the hall board. */
export function useTableMutations() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const key = queryKeys.me.tables;

  const update = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & TableWriteInput) =>
      updateTable(id, input),
    onMutate: async ({ id, ...input }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DiningTable[]>(key);
      if (previous) {
        queryClient.setQueryData<DiningTable[]>(
          key,
          previous.map((table) =>
            table.id === id
              ? {
                  ...table,
                  isOccupied:
                    input.status !== undefined
                      ? input.status === "occupied"
                      : table.isOccupied,
                  waiterId:
                    input.waiterId !== undefined
                      ? (input.waiterId ?? undefined)
                      : table.waiterId,
                }
              : table,
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
    /**
     * `waiterId` is only sent when the caller passes it: `null` frees the
     * table's waiter, `undefined` leaves whoever is assigned alone — so
     * seating a table never quietly unassigns its waiter.
     */
    setOccupied: (id: string, isOccupied: boolean, waiterId?: string | null) =>
      update.mutate({
        id,
        status: isOccupied ? "occupied" : "available",
        ...(waiterId !== undefined ? { waiterId } : {}),
      }),
    assignWaiter: (id: string, waiterId?: string) =>
      update.mutate({ id, waiterId: waiterId ?? null }),
    reserve: (
      id: string,
      reservation: {
        reservedFrom: string;
        reservedUntil: string;
        reservedByName: string;
        reservedByPhone?: string;
      },
    ) => update.mutate({ id, status: "reserved", ...reservation }),
    cancelReservation: (id: string) =>
      update.mutate({
        id,
        reservedFrom: null,
        reservedUntil: null,
        reservedByName: null,
        reservedByPhone: null,
      }),
    isPending: update.isPending,
  };
}
