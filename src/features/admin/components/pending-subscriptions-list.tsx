"use client";

import { useEffect, useState } from "react";

import { BadgeCheck, HandCoins } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import {
    activateSubscription,
    getPendingSubscriptions,
    type PendingSubscription,
} from "@/features/subscription-requests/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";

/**
 * Subscriptions approved but not yet paid. The subscription only turns active
 * once the admin here confirms the cash was collected — the "activate" button
 * is exactly that confirmation.
 */
export function PendingSubscriptionsList() {
    const { t } = useI18n();
    const [items, setItems] = useState<PendingSubscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => {
        void getPendingSubscriptions()
            .then(setItems)
            .catch((error: unknown) =>
                toast.error(error instanceof ApiError ? error.message : t.common.saveFailed),
            )
            .finally(() => setLoading(false));
    }, [t.common.saveFailed]);

    const activate = async (item: PendingSubscription) => {
        setSavingId(item.id);
        try {
            const updated = await activateSubscription(item.id);
            setItems((current) =>
                current.filter((row) => row.id !== updated.id),
            );
            toast.success(
                (updated as { message?: string }).message ??
                    t.admin.subscriptionActivated,
            );
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="space-y-5">
            <AdminPageHeader
                title={t.admin.pendingPayments}
                count={items.length}
            />
            {loading ? (
                <p className="rounded-2xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
                    …
                </p>
            ) : items.length === 0 ? (
                <p className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
                    <BadgeCheck className="size-4" /> {t.admin.noPendingPayments}
                </p>
            ) : (
                <ul className="space-y-3">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card p-4"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold">
                                    {item.business?.name ?? item.businessId}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {item.plan?.name ?? item.planId}
                                    {item.plan?.price
                                        ? ` · ${item.plan.price}`
                                        : null}
                                </p>
                            </div>
                            <Badge>{t.admin.statusPendingPayment}</Badge>
                            <Button
                                size="sm"
                                onClick={() => void activate(item)}
                                disabled={savingId === item.id}
                            >
                                <HandCoins className="size-4" />{" "}
                                {t.admin.confirmPayment}
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
