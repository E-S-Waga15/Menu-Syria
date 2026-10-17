"use client";

import { useState } from "react";

import { BadgeCheck, Check, X } from "lucide-react";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { SubscriptionApprovalDialog } from "@/features/admin/components/subscription-approval-dialog";
import {
    updateSubscriptionRequestStatus,
    type SubscriptionRequest,
} from "@/features/subscription-requests/services";
import { fmt, useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";

/**
 * Plan requests waiting on an admin's review — approving picks the exact
 * duration and activates the subscription immediately (amount owed, and any
 * agent commission, computed server-side); rejecting leaves the business on
 * its current plan. Both go through an explicit confirm step first, the same
 * two-step pattern used everywhere else a subscription actually changes.
 */
export function SubscriptionRequestsList({
    initialRequests,
}: {
    initialRequests: SubscriptionRequest[];
}) {
    const { t, lang } = useI18n();
    const [requests, setRequests] = useState(initialRequests);
    const [approving, setApproving] = useState<SubscriptionRequest | null>(null);
    const [savingApprove, setSavingApprove] = useState(false);
    const [rejecting, setRejecting] = useState<SubscriptionRequest | null>(null);
    const [savingReject, setSavingReject] = useState(false);

    const confirmApprove = async (input: {
        planId: string;
        durationType: "monthly" | "custom" | "yearly";
        durationMonths?: number;
        endDate?: string;
    }) => {
        if (!approving) return;
        setSavingApprove(true);
        try {
            const updated = await updateSubscriptionRequestStatus(
                approving.id,
                "approved",
                input,
            );
            setRequests((current) =>
                current.map((item) => (item.id === approving.id ? updated : item)),
            );
            toast.success(
                (updated as { message?: string }).message ??
                    t.admin.subscriptionRequestApproved,
            );
            setApproving(null);
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
        } finally {
            setSavingApprove(false);
        }
    };

    const confirmReject = async () => {
        if (!rejecting) return;
        setSavingReject(true);
        try {
            const updated = await updateSubscriptionRequestStatus(
                rejecting.id,
                "rejected",
            );
            setRequests((current) =>
                current.map((item) => (item.id === rejecting.id ? updated : item)),
            );
            toast.success(
                (updated as { message?: string }).message ?? t.admin.requestRejected,
            );
            setRejecting(null);
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
        } finally {
            setSavingReject(false);
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
                                        onClick={() => setApproving(request)}
                                    >
                                        <Check className="size-4" />{" "}
                                        {t.admin.approveRequest}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setRejecting(request)}
                                    >
                                        <X className="size-4" />{" "}
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

            <SubscriptionApprovalDialog
                open={approving !== null}
                onOpenChange={(open) => !open && setApproving(null)}
                subjectName={approving?.business?.name ?? ""}
                dialogTitle={t.admin.approveRequest}
                confirmTitle={t.admin.confirmApproveRequestTitle}
                confirmBody={t.admin.confirmApproveRequestBody}
                initialPlanId={approving?.planId}
                loading={savingApprove}
                onConfirm={(input) => void confirmApprove(input)}
            />

            <AlertDialog
                open={rejecting !== null}
                onOpenChange={(open) => !open && !savingReject && setRejecting(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {fmt(t.admin.confirmRejectSubscriptionRequestTitle, {
                                name: rejecting?.business?.name ?? "",
                            })}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {fmt(t.admin.confirmRejectSubscriptionRequestBody, {
                                name: rejecting?.business?.name ?? "",
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            disabled={savingReject}
                            onClick={() => setRejecting(null)}
                        >
                            {t.common.cancel}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            loading={savingReject}
                            onClick={() => void confirmReject()}
                        >
                            {t.admin.rejectRequest}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
