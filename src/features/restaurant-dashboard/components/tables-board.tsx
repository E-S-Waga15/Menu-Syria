"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Armchair, CalendarClock, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import {
  isReservationActive,
  useTableMutations,
} from "@/features/restaurant-dashboard/hooks/use-tables";
import {
  getMyTables,
  getMyWaiters,
} from "@/features/restaurant-dashboard/services";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

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

  const { setOccupied, assignWaiter, reserve, cancelReservation, isPending } =
    useTableMutations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reservedByName, setReservedByName] = useState("");
  const [reservedByPhone, setReservedByPhone] = useState("");
  const [reservedFrom, setReservedFrom] = useState("");
  const [reservedUntil, setReservedUntil] = useState("");
  const [seededFor, setSeededFor] = useState<string | null>(null);

  // the cache is the source of truth; occupancy and waiter changes patch it
  // optimistically and then reconcile with the server
  const tables = tablesData ?? [];

  if (!tablesData) return <LoadingSpinner />;

  const selected = tables.find((table) => table.id === selectedId) ?? null;
  const selectedIsReserved = !!selected && isReservationActive(selected);

  if (selected && seededFor !== selected.id) {
    setSeededFor(selected.id);
    setReservedByName(selected.reservedByName ?? "");
    setReservedByPhone(selected.reservedByPhone ?? "");
    setReservedFrom(selected.reservedFrom?.slice(0, 16) ?? "");
    setReservedUntil(selected.reservedUntil?.slice(0, 16) ?? "");
  }

  const submitReservation = () => {
    if (!selected || !reservedByName.trim() || !reservedFrom || !reservedUntil) return;
    if (new Date(reservedUntil).getTime() <= new Date(reservedFrom).getTime()) {
      toast.error(t.dashboard.reservationUntil);
      return;
    }
    reserve(selected.id, {
      reservedFrom: new Date(reservedFrom).toISOString(),
      reservedUntil: new Date(reservedUntil).toISOString(),
      reservedByName: reservedByName.trim(),
      reservedByPhone: reservedByPhone.trim() || undefined,
    });
    toast.success(t.dashboard.reservationSaved);
    setSelectedId(null);
  };

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
        <span className="flex items-center gap-2">
          <span className="size-3.5 rounded-md bg-zest" />
          {t.dashboard.tableReserved}
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
        {tables.map((table) => {
          const reserved = !table.isOccupied && isReservationActive(table);
          return (
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
                : reserved
                  ? "border-zest bg-zest-soft text-zest-soft-foreground"
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
                  : reserved
                    ? "text-zest-soft-foreground/80"
                    : "text-muted-foreground",
              )}
            >
              <Armchair className="size-3" />
              {table.seats}
            </span>
          </button>
          );
        })}
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

                <div className="space-y-3 border-t border-dashed border-border pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      <CalendarClock className="size-4 text-muted-foreground" />
                      {t.dashboard.reservationTitle}
                    </Label>
                    {selectedIsReserved && (
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
                        onClick={() => {
                          cancelReservation(selected.id);
                          setSelectedId(null);
                        }}
                      >
                        <X className="size-3.5" />
                        {t.dashboard.cancelReservation}
                      </button>
                    )}
                  </div>

                  <Input
                    value={reservedByName}
                    onChange={(e) => setReservedByName(e.target.value)}
                    placeholder={t.dashboard.reservedByName}
                  />
                  <Input
                    value={reservedByPhone}
                    onChange={(e) => setReservedByPhone(e.target.value)}
                    dir="ltr"
                    inputMode="tel"
                    placeholder={`${t.dashboard.reservedByPhone} (${t.common.optional})`}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {t.dashboard.reservationFrom}
                      </Label>
                      <Input
                        type="datetime-local"
                        value={reservedFrom}
                        onChange={(e) => setReservedFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {t.dashboard.reservationUntil}
                      </Label>
                      <Input
                        type="datetime-local"
                        value={reservedUntil}
                        onChange={(e) => setReservedUntil(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.dashboard.reservationHint}
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    loading={isPending}
                    disabled={!reservedByName.trim() || !reservedFrom || !reservedUntil}
                    onClick={submitReservation}
                  >
                    {t.dashboard.reserveTable}
                  </Button>
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
