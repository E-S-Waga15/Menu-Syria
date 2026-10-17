"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { CalendarClock, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/shared/pagination";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminSelect } from "@/features/admin/components/admin-select";
import {
  getAdminSubscriptionsList,
  markSubscriptionPaid,
  type AdminSubscriptionRow,
  type AdminSubscriptionStatus,
  type AdminSubscriptionsPage,
} from "@/features/admin/services";
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const ALL = "all";
const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Every real subscription record — not a business re-read — split into the
 * two halves the backend itself tracks separately: sold through an agent
 * (their own commission/payment status) versus platform-direct (our own
 * payment status). Each half is its own paginated, server-filtered query.
 */
export function AdminSubscriptionsList({
  initialAgent,
  initialPlatform,
}: {
  initialAgent: AdminSubscriptionsPage;
  initialPlatform: AdminSubscriptionsPage;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-10">
      <AdminPageHeader title={t.admin.subscriptions} />
      <SubscriptionSection
        kind="agent"
        title={t.admin.subscriptionsViaAgent}
        initialData={initialAgent}
      />
      <SubscriptionSection
        kind="platform"
        title={t.admin.subscriptionsGeneral}
        initialData={initialPlatform}
      />
    </div>
  );
}

function SubscriptionSection({
  kind,
  title,
  initialData,
}: {
  kind: "agent" | "platform";
  title: string;
  initialData: AdminSubscriptionsPage;
}) {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AdminSubscriptionStatus | typeof ALL>("active");
  const [page, setPage] = useState(1);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const queryKey = ["admin", "subscriptions", kind, status, page];
  const isInitial = status === "active" && page === 1;
  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      getAdminSubscriptionsList({
        kind,
        status: status === ALL ? undefined : status,
        page,
      }),
    initialData: isInitial ? initialData : undefined,
  });

  const rows = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  const dateFormat = new Intl.DateTimeFormat(
    lang === "ar" ? "ar-SY" : "en-GB",
    { day: "numeric", month: "short", year: "numeric" },
  );

  const markPaid = async (row: AdminSubscriptionRow) => {
    setMarkingPaidId(row.id);
    try {
      const result = await markSubscriptionPaid(row.id, todayIso());
      toast.success(result?.message ?? t.admin.subscriptionMarkedPaid);
      await queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions", kind] });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setMarkingPaidId(null);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-sm font-bold text-muted-foreground">
          {fmt(title, { count: data?.meta.total ?? 0 })}
        </h2>
        <AdminSelect
          value={status}
          onChange={(v) => {
            setStatus(v as AdminSubscriptionStatus | typeof ALL);
            setPage(1);
          }}
          label={t.admin.allStatuses}
          items={{
            [ALL]: t.admin.allStatuses,
            active: t.admin.statusActive,
            expired: t.admin.statusExpired,
            pending: t.admin.requestStatusPending,
            cancelled: t.admin.subscriptionCancelled,
          }}
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t.admin.noResults}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => {
            const expired = row.status === "expired";
            return (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {row.business.name}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {row.plan.name}
                    {row.plan.isFree && (
                      <Badge variant="secondary" className="text-[10px]">
                        {t.admin.freePlan}
                      </Badge>
                    )}
                    {" · "}
                    {row.billingCycle === "monthly"
                      ? t.admin.durationMonthly
                      : t.admin.durationYearly}
                    {kind === "agent" && row.agent && (
                      <>
                        {" · "}
                        {row.agent.name}
                      </>
                    )}
                  </p>
                </div>

                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  {dateFormat.format(new Date(row.startDate))}
                  {" – "}
                  {dateFormat.format(new Date(row.endDate))}
                </span>

                <span className="shrink-0 text-xs font-semibold" dir="ltr">
                  {formatPrice(row.amountPaid, row.currency, lang)}
                </span>

                <Badge
                  className={cn(
                    "shrink-0",
                    expired
                      ? "bg-destructive/10 text-destructive"
                      : row.status === "pending"
                        ? "bg-muted text-muted-foreground"
                        : "bg-success/10 text-success",
                  )}
                >
                  {expired
                    ? t.admin.statusExpired
                    : row.status === "pending"
                      ? t.admin.requestStatusPending
                      : row.status === "cancelled"
                        ? t.admin.subscriptionCancelled
                        : fmt(t.agent.daysLeft, { days: row.daysRemaining })}
                </Badge>

                {kind === "agent" ? (
                  row.agentPaymentStatus && (
                    <Badge
                      className={cn(
                        "shrink-0",
                        row.agentPaymentStatus === "paid"
                          ? "bg-success/10 text-success"
                          : row.agentPaymentStatus === "overdue"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-zest-soft/40 text-zest-soft-foreground",
                      )}
                    >
                      {row.agentPaymentStatus === "paid"
                        ? t.admin.paymentPaid
                        : row.agentPaymentStatus === "overdue"
                          ? t.admin.paymentOverdue
                          : t.admin.paymentPending}
                    </Badge>
                  )
                ) : row.paymentStatus === "paid" ? (
                  <Badge className="shrink-0 bg-success/10 text-success">
                    <CheckCircle2 className="me-1 size-3.5" />
                    {t.admin.paymentPaid}
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void markPaid(row)}
                    loading={markingPaidId === row.id}
                  >
                    <CalendarClock className="size-3.5" />
                    {t.admin.markAsPaid}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </section>
  );
}
