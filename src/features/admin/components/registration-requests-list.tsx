"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Building2,
  Calendar,
  Check,
  Clock3,
  Eye,
  MapPin,
  Phone,
  Store,
  User,
  UserCheck,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ADMIN_PAGE_SIZE, Pagination } from "@/components/shared/pagination";
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
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { SubscriptionApprovalDialog } from "@/features/admin/components/subscription-approval-dialog";
import {
  updateRegistrationRequestStatus,
  type RegistrationRequest,
} from "@/features/admin/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<RegistrationRequest["type"], typeof Store> = {
  restaurant: Store,
  store: Building2,
  agent: User,
};

export function RegistrationRequestsList({
  initialRequests,
}: {
  initialRequests: RegistrationRequest[];
}) {
  const { t, lang } = useI18n();
  const [requests, setRequests] = useState(initialRequests);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(requests.length / ADMIN_PAGE_SIZE));
  const pageRequests = requests.slice(
    (page - 1) * ADMIN_PAGE_SIZE,
    page * ADMIN_PAGE_SIZE,
  );

  const [approving, setApproving] = useState<RegistrationRequest | null>(null);
  const [savingApprove, setSavingApprove] = useState(false);

  const [rejecting, setRejecting] = useState<RegistrationRequest | null>(null);
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
      const updated = await updateRegistrationRequestStatus(
        approving.id,
        "approved",
        input.planId,
        input,
      );
      setRequests((current) =>
        current.map((item) => (item.id === approving.id ? updated : item)),
      );
      toast.success(
        (updated as { message?: string }).message ?? t.admin.requestApproved,
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
      const updated = await updateRegistrationRequestStatus(
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

  const statusLabel = (status: RegistrationRequest["status"]) =>
    status === "approved"
      ? t.admin.requestStatusApproved
      : status === "rejected"
        ? t.admin.requestStatusRejected
        : t.admin.requestStatusPending;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t.admin.registrationRequests}
        count={requests.length}
      />
      {requests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-14 text-center text-sm text-muted-foreground">
          {t.admin.noRegistrationRequests}
        </p>
      ) : (
        <ul className="space-y-3">
          {pageRequests.map((request) => {
            const TypeIcon = TYPE_ICON[request.type] ?? User;
            const typeWord =
              request.type === "restaurant"
                ? t.common.restaurantWord
                : request.type === "store"
                  ? t.common.storeWord
                  : t.common.agentWord;
            const canReview =
              request.status === "pending" ||
              (request.status === "approved" && !request.applicantUserId);
            return (
              <li
                key={request.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 transition-colors duration-200 hover:border-primary/35"
              >
                <Link
                  href={`/${lang}/admin/registration-requests/${request.id}`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                >
                  <TypeIcon className="size-5" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/${lang}/admin/registration-requests/${request.id}`}
                      className="font-semibold hover:text-primary"
                    >
                      {request.applicantName}
                    </Link>
                    <Badge variant="secondary" className="text-[11px]">
                      {typeWord}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1" dir="ltr">
                      <Phone className="size-3.5" />
                      {request.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      {new Intl.DateTimeFormat(
                        lang === "ar" ? "ar-SY" : "en-GB",
                      ).format(new Date(request.createdAt))}
                    </span>
                    {request.district?.name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {request.district.name}
                      </span>
                    )}
                  </div>
                  {request.agent?.name && (
                    <p className="mt-1.5 flex items-center gap-1 text-sm text-success">
                      <UserCheck className="size-3.5" />
                      {t.admin.referredByAgent} {request.agent.name}
                    </p>
                  )}
                  {request.plan && (
                    <p className="mt-1.5 text-sm font-semibold text-primary">
                      {request.plan.name}
                    </p>
                  )}
                  {request.notes && (
                    <p className="mt-1.5 text-sm">{request.notes}</p>
                  )}
                </div>
                <Badge
                  className={cn(
                    request.status === "approved" && "bg-success/10 text-success",
                    request.status === "rejected" &&
                      "bg-destructive/10 text-destructive",
                    request.status === "pending" && "bg-muted text-muted-foreground",
                  )}
                >
                  {statusLabel(request.status)}
                </Badge>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    render={
                      <Link
                        href={`/${lang}/admin/registration-requests/${request.id}`}
                      />
                    }
                  >
                    <Eye className="size-4" /> {t.admin.viewDetails}
                  </Button>
                  {canReview && (
                    <>
                      <Button size="sm" onClick={() => setApproving(request)}>
                        <Check className="size-4" /> {t.admin.approveRequest}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejecting(request)}
                      >
                        <X className="size-4" /> {t.admin.rejectRequest}
                      </Button>
                    </>
                  )}
                </div>
                {request.status === "pending" && (
                  <Clock3 className="size-4 shrink-0 text-muted-foreground" />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <SubscriptionApprovalDialog
        open={approving !== null}
        onOpenChange={(open) => !open && setApproving(null)}
        subjectName={approving?.applicantName ?? ""}
        dialogTitle={t.admin.approveRequest}
        confirmTitle={t.admin.confirmApproveRequestTitle}
        confirmBody={t.admin.confirmApproveRequestBody}
        initialPlanId={approving?.planId}
        loading={savingApprove}
        onConfirm={(input) => void confirmApprove(input)}
      />

      <AlertDialog
        open={!!rejecting}
        onOpenChange={(open) => !open && !savingReject && setRejecting(null)}
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
