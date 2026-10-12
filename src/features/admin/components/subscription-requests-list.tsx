"use client";

import { useState } from "react";

import { BadgeCheck, Check, HandCoins, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
    updateSubscriptionRequestStatus,
    type SubscriptionRequest,
} from "@/features/subscription-requests/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";

/**
 * Renewal / activation requests waiting on hand-to-hand payment. Approving
 * tells the platform the money was actually collected — that is what activates
 * or renews the subscription, so the button says so explicitly.
 */
export function SubscriptionRequestsList({
    initialRequests,
}: {
    initialRequests: SubscriptionRequest[];
}) {
    const { t, lang } = useI18n();
    const [requests, setRequests] = useState(initialRequests);
    const [savingId, setSavingId] = useState<string | null>(null);

    const review = async (
        request: SubscriptionRequest,
        status: "approved" | "rejected",
    ) => {
        setSavingId(request.id);
        try {
            const updated = await updateSubscriptionRequestStatus(
                request.id,
                status,
            );
            setRequests((current) =>
                current.map((item) => (item.id === request.id ? updated : item)),
            );
            toast.success(
                (updated as { message?: string }).message ??
                    (status === "approved"
                        ? t.admin.subscriptionRequestApproved
                        : t.admin.requestRejected),
            );
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
        } finally {
            setSavingId(null);
        }
    };

    const dateFormat = new Intl.DateTimeFormat(
        lang === "ar" ? "ar-SY" : "en-GB",
        { day: "numeric", month: "short", year: "numeric" },
    );

    return (
        <div className="space-y-5">
            <AdminPageHeader
                title={t.admin.subscriptionRequests}
                count={requests.length}
            />
            {requests.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
                    {t.admin.noSubscriptionRequests}
                </p>
            ) : (
                <ul className="space-y-3">
                    {requests.map((request) => (
                        <li
                            key={request.id}
                            className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card p-4"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold">
                                    {request.business?.name ??
                                        request.businessId}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {request.plan?.name ?? request.planId}
                                    {request.agent?.name
                                        ? ` · ${request.agent.name}`
                                        : null}
                                    {" · "}
                                    {dateFormat.format(
                                        new Date(request.createdAt),
                                    )}
                                </p>
                                {request.notes && (
                                    <p className="mt-1 text-sm">{request.notes}</p>
                                )}
                            </div>
                            <Badge>{request.status}</Badge>
                            {request.status === "pending" && (
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            void review(request, "approved")
                                        }
                                        disabled={savingId === request.id}
                                    >
                                        {savingId === request.id ? (
                                            <Spinner size="xs" tone="current" />
                                        ) : (
                                            <HandCoins className="size-4" />
                                        )}{" "}
                                        {t.admin.confirmPayment}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            void review(request, "rejected")
                                        }
                                        disabled={savingId === request.id}
                                    >
                                        {savingId === request.id ? (
                                            <Spinner size="xs" tone="current" />
                                        ) : (
                                            <X className="size-4" />
                                        )}{" "}
                                        {t.admin.rejectRequest}
                                    </Button>
                                </div>
                            )}
                            {request.status === "approved" && (
                                <BadgeCheck className="size-5 text-success" />
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <p className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                <Check className="size-4 shrink-0" />
                {t.admin.subscriptionRequestsHint}
            </p>
        </div>
    );
}
