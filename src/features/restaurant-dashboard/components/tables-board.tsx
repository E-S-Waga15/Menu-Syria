"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Armchair, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { Switch } from "@/components/ui/switch";
import { useTableMutations } from "@/features/restaurant-dashboard/hooks/use-tables";
import {
  getMyTables,
  getMyWaiters,
} from "@/features/restaurant-dashboard/services";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";

export function TablesBoard() {
  const { t } = useI18n();

  const { data: tablesData } = useQuery({
    queryKey: queryKeys.me.tables,
    queryFn: getMyTables,
  });
  const { data: waiters } = useQuery({
    queryKey: queryKeys.me.waiters,
    queryFn: getMyWaiters,
  });

  const { setOccupied, assignWaiter } = useTableMutations();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // the cache is the source of truth; occupancy and waiter changes patch it
  // optimistically and then reconcile with the server
  const tables = tablesData ?? [];

  if (!tablesData) return <LoadingSpinner />;

  const selected = tables.find((table) => table.id === selectedId) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-5 text-sm font-semibold">
        <span className="flex items-center gap-2">
          <span className="size-3.5 rounded-md border border-border bg-card" />
          {t.dashboard.tableFree}
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3.5 rounded-md bg-primary" />
          {t.dashboard.tableOccupied}
        </span>
      </div>

      {/* interactive hall canvas */}
      <div
        className="relative h-[30rem] overflow-hidden rounded-2xl border border-border/60 bg-surface-container-low"
        style={{
          backgroundImage:
            "linear-gradient(var(--surface-container) 1px, transparent 1px), linear-gradient(90deg, var(--surface-container) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      >
        {tables.map((table) => (
          <button
            key={table.id}
            type="button"
            onClick={() => setSelectedId(table.id)}
            style={{ left: `${table.x}%`, top: `${table.y}%` }}
            className={cn(
              "absolute flex size-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center transform-gpu border-2 transition-[translate,scale,background-color,border-color] duration-200 ease-smooth hover:scale-110 md:size-20",
              table.shape === "round" ? "rounded-full" : "rounded-xl",
              table.isOccupied
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/50",
            )}
          >
            <span className="font-heading text-lg font-bold">
              {table.number}
            </span>
            <span
              className={cn(
                "flex items-center gap-0.5 text-[0.6rem] font-bold",
                table.isOccupied
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground",
              )}
            >
              <Armchair className="size-3" />
              {table.seats}
            </span>
          </button>
        ))}
      </div>

      {/* table dialog */}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <DialogContent className="max-w-sm">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {fmt(t.dashboard.table, { number: selected.number })}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 px-4 pb-5">
                <label className="flex items-center justify-between rounded-xl border border-border/60 p-3.5">
                  <span className="text-sm font-semibold">
                    {selected.isOccupied
                      ? t.dashboard.tableOccupied
                      : t.dashboard.tableFree}
                  </span>
                  <Switch
                    checked={selected.isOccupied}
                    onCheckedChange={(v) => {
                      // freeing a table releases its waiter in the same write,
                      // so a table can never sit empty with someone assigned
                      setOccupied(selected.id, v, v ? undefined : null);
                    }}
                  />
                </label>

                <div className="space-y-2">
                  <Label>{t.dashboard.assignWaiter}</Label>
                  <Select
                    value={selected.waiterId ?? null}
                    onValueChange={(v) =>
                      assignWaiter(selected.id, v ?? undefined)
                    }
                    items={Object.fromEntries(
                      (waiters ?? []).map((w) => [w.id, w.name]),
                    )}
                  >
                    <SelectTrigger className="h-11 w-full">
                      <UserRound className="size-4 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(waiters ?? []).map((waiter) => (
                        <SelectItem key={waiter.id} value={waiter.id}>
                          {waiter.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" onClick={() => setSelectedId(null)}>
                  {t.common.done}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
