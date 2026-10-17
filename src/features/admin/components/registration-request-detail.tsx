"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  Clock3,
  MapPin,
  Phone,
  Store,
  User,
  UserCheck,
  X,
} from "lucide-react";

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
  updateRegistrationRequestStatus,
  type RegistrationRequest,
} from "@/features/admin/services";
import { fmt, useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<RegistrationRequest["type"], typeof Store> = {
  restaurant: Store,
  store: Building2,
  agent: User,
};

/**
 * One registration request in full — everything the list's card only has
 * room to summarize, plus the same approve/reject actions, for the admin who
 * clicked through wanting the whole picture before deciding.
 */
export function RegistrationRequestDetail({
  initialRequest,
}: {
  initialRequest: RegistrationRequest;
}) {
  const { t, lang, dir } = useI18n();
  const router = useRouter();
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;
  const [request, setRequest] = useState(initialRequest);

  const [approving, setApproving] = useState(false);
  const [savingApprove, setSavingApprove] = useState(false);

  const [rejecting, setRejecting] = useState(false);
  const [savingReject, setSavingReject] = useState(false);

  const confirmApprove = async (input: {
    planId: string;
    durationType: "monthly" | "custom" | "yearly";
    durationMonths?: number;
    endDate?: string;
  }) => {
    setSavingApprove(true);
    try {
      const updated = await updateRegistrationRequestStatus(
        request.id,
        "approved",
        input.planId,
        input,
      );
      setRequest(updated);
      toast.success(
        (updated as { message?: string }).message ?? t.admin.requestApproved,
      );
      setApproving(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setSavingApprove(false);
    }
  };

  const confirmReject = async () => {
    setSavingReject(true);
    try {
      const updated = await updateRegistrationRequestStatus(
        request.id,
        "rejected",
      );
      setRequest(updated);
      toast.success(
        (updated as { message?: string }).message ?? t.admin.requestRejected,
      );
      setRejecting(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setSavingReject(false);
    }
  };

  const statusLabel =
    request.status === "approved"
      ? t.admin.requestStatusApproved
      : request.status === "rejected"
        ? t.admin.requestStatusRejected
        : t.admin.requestStatusPending;

  const typeWord =
    request.type === "restaurant"
      ? t.common.restaurantWord
      : request.type === "store"
        ? t.common.storeWord
        : t.common.agentWord;

  const canReview =
    request.status === "pending" ||
    (request.status === "approved" && !request.applicantUserId);

  const TypeIcon = TYPE_ICON[request.type] ?? User;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t.admin.requestDetails}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${lang}/admin/registration-requests`)}
          >
            <BackIcon className="size-4" />
            {t.common.back}
          </Button>
        }
      />

      <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <TypeIcon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-xl font-bold">
                {request.applicantName}
              </h2>
              <Badge variant="secondary">{typeWord}</Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="size-3.5" />
              {fmt(t.admin.submittedOn, {
                date: new Intl.DateTimeFormat(
                  lang === "ar" ? "ar-SY" : "en-GB",
                  { day: "numeric", month: "long", year: "numeric" },
                ).format(new Date(request.createdAt)),
              })}
            </p>
          </div>
          <Badge
            className={cn(
              request.status === "approved" && "bg-success/10 text-success",
              request.status === "rejected" &&
                "bg-destructive/10 text-destructive",
              request.status === "pending" && "bg-muted text-muted-foreground",
            )}
          >
            {request.status === "pending" && (
              <Clock3 className="me-1 size-3.5" />
            )}
            {statusLabel}
          </Badge>
        </div>

        {request.notes && (
          <p className="mt-4 border-t border-border/60 pt-4 text-sm leading-relaxed text-muted-foreground">
            {request.notes}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
        <h2 className="font-heading text-lg font-bold">
          {t.admin.contactInfo}
        </h2>
        <a
          href={`tel:${request.phone.replace(/\s/g, "")}`}
          className="mt-3 flex items-center gap-2.5 text-base font-semibold transition-colors hover:text-primary"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ffd9de] text-[#90003b]">
            <Phone className="size-4" />
          </span>
          <span dir="ltr">{request.phone}</span>
        </a>
        {request.district?.name && (
          <p className="mt-3 flex items-center gap-2.5 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            {request.district.name}
          </p>
        )}
        {request.agent?.name && (
          <p className="mt-3 flex items-center gap-2.5 text-sm text-success">
            <UserCheck className="size-4" />
            {t.admin.referredByAgent} {request.agent.name}
          </p>
        )}
      </section>

      {(request.plan || request.subscriptionStartDate) && (
        <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
          <h2 className="font-heading text-lg font-bold">
            {t.admin.subscriptionSection}
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            {request.plan && (
              <div>
                <dt className="label-eyebrow text-muted-foreground">
                  {t.agent.currentPlan}
                </dt>
                <dd className="mt-1.5 text-sm font-semibold">
                  {request.plan.name}
                </dd>
              </div>
            )}
            {request.subscriptionStartDate && (
              <div>
                <dt className="label-eyebrow text-muted-foreground">
                  {t.agent.subscriptionStart}
                </dt>
                <dd className="mt-1.5 text-sm font-semibold" dir="ltr">
                  {new Intl.DateTimeFormat(
                    lang === "ar" ? "ar-SY" : "en-GB",
                  ).format(new Date(request.subscriptionStartDate))}
                </dd>
              </div>
            )}
            {request.subscriptionEndDate && (
              <div>
                <dt className="label-eyebrow text-muted-foreground">
                  {t.agent.subscriptionEnd}
                </dt>
                <dd className="mt-1.5 text-sm font-semibold" dir="ltr">
                  {new Intl.DateTimeFormat(
                    lang === "ar" ? "ar-SY" : "en-GB",
                  ).format(new Date(request.subscriptionEndDate))}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {canReview && (
        <div className="flex gap-2">
          <Button onClick={() => setApproving(true)}>
            <Check className="size-4" /> {t.admin.approveRequest}
          </Button>
          <Button variant="outline" onClick={() => setRejecting(true)}>
            <X className="size-4" /> {t.admin.rejectRequest}
          </Button>
        </div>
      )}

      <SubscriptionApprovalDialog
        open={approving}
        onOpenChange={setApproving}
        subjectName={request.applicantName}
        dialogTitle={t.admin.approveRequest}
        confirmTitle={t.admin.confirmApproveRequestTitle}
        confirmBody={t.admin.confirmApproveRequestBody}
        initialPlanId={request.planId}
        loading={savingApprove}
        onConfirm={(input) => void confirmApprove(input)}
      />

      <AlertDialog
        open={rejecting}
        onOpenChange={(open) => !open && !savingReject && setRejecting(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.admin.confirmRejectRequestTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin.confirmRejectRequestBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={savingReject}
              onClick={() => setRejecting(false)}
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
