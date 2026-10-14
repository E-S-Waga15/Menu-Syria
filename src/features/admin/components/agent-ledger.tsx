"use client";

import { useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, Percent, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { SafeImage } from "@/components/shared/safe-image";
import {
  getAdminAgentById,
  getAdminAgentLedger,
  updateAdminAgent,
} from "@/features/admin/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { StatCard } from "@/features/restaurant-dashboard/components/stat-card";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

export function AdminAgentLedger({ agentId }: { agentId: string }) {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [commissionRate, setCommissionRate] = useState("");
  const [savingRate, setSavingRate] = useState(false);

  const { data: agent, isPending } = useQuery({
    queryKey: queryKeys.agents.detail(agentId),
    queryFn: () => getAdminAgentById(agentId),
  });
  const { data: ledger } = useQuery({
    queryKey: queryKeys.agents.transactions(agentId),
    queryFn: () => getAdminAgentLedger(agentId),
  });

  if (isPending || !ledger) {
    return <LoadingSpinner />;
  }

  if (!agent) {
    return (
      <p className="py-16 text-center text-muted-foreground">
        {t.common.notFoundTitle}
      </p>
    );
  }

  const saveCommissionRate = async () => {
    const percentage = Number(commissionRate);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      return;
    }
    setSavingRate(true);
    try {
      const result = await updateAdminAgent(agent.id, {
        commissionRate: percentage / 100,
      });
      setCommissionRate("");
      toast.success(result.message ?? t.dashboard.settingsSaved);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.agents.detail(agentId),
      });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setSavingRate(false);
    }
  };

  const credit = ledger
    .filter((tx) => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const debit = ledger
    .filter((tx) => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const balance = credit - debit;

  return (
    <div className="space-y-6">
      {/* profile strip */}
      <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card p-5">
        <SafeImage
          src={agent.photoUrl}
          alt=""
          width={64}
          height={64}
          className="size-16 rounded-full object-cover"
        />
        <div className="flex-1">
          <h1 className="font-heading text-xl font-bold">{agent.name[lang]}</h1>
          <p
            className="mt-1 text-sm font-semibold text-muted-foreground"
            dir="ltr"
          >
            {agent.phone} · {agent.referralCode}
          </p>
        </div>
        <Badge className="bg-berry-soft text-berry-soft-foreground">
          {agent.restaurantsCount} {t.home.agentRestaurantsCount}
        </Badge>
      </section>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.admin.credit}
          value={formatPrice(credit, t.common.currency)}
          icon={ArrowUpCircle}
        />
        <StatCard
          label={t.admin.debit}
          value={formatPrice(debit, t.common.currency)}
          icon={ArrowDownCircle}
          accent="zest"
        />
        <StatCard
          label={t.admin.balance}
          value={formatPrice(balance, t.common.currency)}
          icon={Wallet}
          highlight
        />
        <StatCard
          label={t.admin.commissionRate}
          value={`${agent.commissionRate * 100}%`}
          icon={Percent}
          accent="neutral"
        />
      </div>

      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card p-5">
        <div className="min-w-48">
          <label className="text-sm font-semibold" htmlFor="commission-rate">
            {t.admin.commissionRate}
          </label>
          <input
            id="commission-rate"
            className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3"
            inputMode="decimal"
            placeholder={`${agent.commissionRate * 100}`}
            value={commissionRate}
            onChange={(event) => setCommissionRate(event.target.value)}
          />
        </div>
        <Button onClick={() => void saveCommissionRate()} loading={savingRate}>
          {t.common.save}
        </Button>
      </section>

      {/* ledger */}
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">
          {t.admin.agentLedger}
        </h2>
        <div className="space-y-2.5">
          {ledger.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {tx.restaurantName[lang]}
                </p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {tx.date}
                </p>
              </div>
              <p
                className={cn(
                  "shrink-0 font-bold",
                  tx.amount >= 0 ? "text-success" : "text-destructive",
                )}
                dir="ltr"
              >
                {tx.amount >= 0 ? "+" : "−"}
                {formatPrice(Math.abs(tx.amount), t.common.currency)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* payment timeline */}
      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">
          {t.admin.paymentTimeline}
        </h2>
        <ol className="mt-5 space-y-0 border-s-2 border-border ps-5">
          {ledger.map((tx) => (
            <li key={tx.id} className="relative pb-6 last:pb-0">
              <span
                className={cn(
                  "absolute -start-[1.65rem] top-1 size-3.5 rounded-full border-2 border-card",
                  tx.amount >= 0 ? "bg-success" : "bg-zest",
                )}
              />
              <p className="text-sm font-bold" dir="ltr">
                {formatPrice(tx.amount, t.common.currency)}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                {tx.restaurantName[lang]} · <span dir="ltr">{tx.date}</span>
              </p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
