"use client";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Check, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { FetchError } from "@/components/shared/fetch-error";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { getAgentPlans } from "@/features/agent-dashboard/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";

/**
 * Every price here is the agent's own cost, not what the customer pays —
 * already computed server-side (see `Plan` in `src/lib/types.ts`), never
 * derived in this component.
 */
export function AgentPlansView() {
  const { t, lang } = useI18n();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");

  const { data: plans, isError, refetch } = useQuery({
    queryKey: queryKeys.agents.plans,
    queryFn: () => getAgentPlans(),
  });

  if (isError) return <FetchError onRetry={() => void refetch()} />;
  if (!plans) return <LoadingSpinner />;

  const discountPercent = plans[0]?.agentDiscountPercent ?? 30;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold">{t.agent.plansTitle}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {fmt(t.agent.plansHint, { percent: discountPercent })}
        </p>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex rounded-full bg-muted p-1">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
              cycle === "monthly"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {t.admin.billingMonthly}
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-colors",
              cycle === "yearly"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {t.admin.billingYearly}
          </button>
        </div>
      </div>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const price =
            (cycle === "monthly" ? plan.agentPriceMonthly : plan.agentPriceYearly) ??
            0;
          return (
            <li
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border bg-card p-5 md:p-6",
                plan.isPopular ? "border-primary" : "border-border/60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-heading text-lg font-bold">
                  {plan.name?.[lang] ?? ""}
                </h2>
                {plan.isPopular && (
                  <Badge className="bg-berry-soft text-berry-soft-foreground">
                    <Sparkles className="me-1 size-3" />
                    {t.admin.mostPopular}
                  </Badge>
                )}
              </div>

              <div className="mt-3">
                <p className="flex items-baseline gap-1.5">
                  <span className="font-heading text-2xl font-bold text-primary">
                    {formatPrice(price, t.common.currency)}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {cycle === "monthly" ? t.admin.pricePerMonth : t.admin.pricePerYear}
                  </span>
                </p>
                {cycle === "yearly" && plan.yearlySavingsMonths != null && (
                  <Badge className="mt-1.5 bg-success/10 text-success">
                    {fmt(t.admin.yearlySavingsBadge, {
                      months: plan.yearlySavingsMonths,
                    })}
                  </Badge>
                )}
              </div>

              <h3 className="label-eyebrow mt-5 text-muted-foreground">
                {t.admin.planFeatures}
              </h3>
              <ul className="mt-2.5 flex-1 space-y-2">
                {(plan.features ?? []).map((feature) => (
                  <li
                    key={feature.en}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {feature[lang]}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
