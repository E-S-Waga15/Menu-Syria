"use client";

import Image from "next/image";
import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Link2,
  Link2Off,
  Loader2,
  MessageCircle,
  QrCode,
  Repeat2,
  WifiOff,
} from "lucide-react";

import { RowActions, type RowAction } from "@/components/shared/row-actions";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getWhatsappOtpStatus,
  linkWhatsappOtp,
  replaceWhatsappOtp,
  unlinkWhatsappOtp,
  type WhatsappOtpPairing,
} from "@/features/admin/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { toast } from "@/lib/toast";

/**
 * How often the card re-checks in the background. Slow: this is a status
 * light on a settings page, not something anyone is watching.
 */
const CARD_POLL_MS = 30_000;

/**
 * How often the pairing dialog re-checks while it is open and still unpaired.
 *
 * Pairing has no "refresh" button of its own: the gateway rotates its QR on
 * its own schedule, so the only way to show the current code — and to notice
 * the moment the phone scans it — is to keep re-reading the status endpoint.
 */
const DIALOG_POLL_MS = 4000;

/** which pairing flow the dialog is running, or none */
type PairingMode = "status" | "link" | "replace";

/** which confirmation is up, or none */
type ConfirmMode = "replace" | "unlink";

/**
 * The WhatsApp gateway that carries verification codes: a status light in the
 * console's settings, the menu of things an admin can do to it, and the
 * dialogs behind each.
 *
 * The two actions that take a number away — replacing and unlinking — stop
 * codes reaching customers the moment they run, and neither can be undone by
 * clicking back. So each one asks first, in words that say what stops rather
 * than just "are you sure".
 */
export function WhatsappOtpCard() {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [pairing, setPairing] = useState<PairingMode | null>(null);
  const [confirm, setConfirm] = useState<ConfirmMode | null>(null);

  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.admin.whatsappOtp,
    queryFn: () => getWhatsappOtpStatus(),
    refetchInterval: CARD_POLL_MS,
  });

  const unlink = useMutation({
    mutationFn: () => unlinkWhatsappOtp(),
    onSuccess: (data) => {
      toast.success(data?.message ?? t.admin.whatsappUnlinked);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.whatsappOtp,
      });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.message : t.admin.whatsappActionFailed,
      ),
    onSettled: () => setConfirm(null),
  });

  const actions: RowAction[] = [
    {
      label: t.admin.whatsappLink,
      icon: Link2,
      onSelect: () => setPairing("link"),
    },
    {
      label: t.admin.whatsappReplace,
      icon: Repeat2,
      onSelect: () => setConfirm("replace"),
    },
    {
      label: t.admin.whatsappUnlink,
      icon: Link2Off,
      onSelect: () => setConfirm("unlink"),
      danger: true,
    },
  ];

  return (
    <section className="rounded-2xl border border-border/60 bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <h2 className="flex min-w-0 items-center gap-2.5 font-heading text-lg font-semibold">
          <MessageCircle className="size-5 shrink-0 text-primary" />
          <span className="truncate">{t.admin.whatsappOtp}</span>
        </h2>
        <RowActions actions={actions} />
      </div>

      <div className="p-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t.admin.whatsappOtpHint}
        </p>

        {/* who is linked on one side, whether it is working on the other —
            the pair reads as one line, and wraps rather than crushes */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm">
            {data?.connected && data.phone ? (
              <>
                {/* the number is Latin digits and a leading +, so it keeps
                    its own direction inside the Arabic line */}
                <span className="font-bold" dir="ltr">
                  {data.phone}
                </span>
                {data.profileName && (
                  <span className="text-muted-foreground">
                    {" · "}
                    {data.profileName}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">
                {t.admin.whatsappNoNumber}
              </span>
            )}
          </p>

          <div className="flex shrink-0 items-center gap-2.5">
            {isPending ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                {t.admin.whatsappChecking}
              </span>
            ) : data?.connected ? (
              <span className="flex items-center gap-1.5 rounded-full border border-success/25 bg-success/12 px-3 py-1.5 text-xs font-bold text-success">
                <span className="size-1.5 rounded-full bg-success" />
                {t.admin.whatsappConnected}
              </span>
            ) : (
              <>
                <span className="flex items-center gap-1.5 rounded-full border border-destructive/25 bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive">
                  <span className="size-1.5 rounded-full bg-destructive" />
                  {isError
                    ? t.admin.whatsappStatusFailed
                    : t.admin.whatsappDisconnected}
                </span>
                <Button size="sm" onClick={() => setPairing("status")}>
                  {t.admin.whatsappConnect}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <PairingDialog mode={pairing} onClose={() => setPairing(null)} />

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "unlink"
                ? t.admin.whatsappUnlinkConfirmTitle
                : t.admin.whatsappReplaceConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "unlink"
                ? t.admin.whatsappUnlinkConfirmBody
                : t.admin.whatsappReplaceConfirmBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirm(null)}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              loading={confirm === "unlink" && unlink.isPending}
              onClick={() => {
                if (confirm === "unlink") {
                  unlink.mutate();
                  return;
                }
                // the swap itself runs inside the dialog, which has to stay
                // open afterwards to show the code the call hands back
                setConfirm(null);
                setPairing("replace");
              }}
            >
              {confirm === "unlink"
                ? t.admin.whatsappUnlink
                : t.admin.whatsappReplace}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/**
 * One dialog for all three ways of arriving at a QR code.
 *
 * `status` just reads what the gateway is already doing; `link` and `replace`
 * each fire their own call first and show the code it returns. After that the
 * three behave identically — poll until the phone scans — so they share this
 * body rather than existing as three near-copies.
 */
function PairingDialog({
  mode,
  onClose,
}: {
  mode: PairingMode | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const open = mode !== null;

  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.admin.whatsappOtp,
    queryFn: () => getWhatsappOtpStatus(),
    enabled: open,
    // the callback form reads the latest result, so the poll stops itself the
    // moment the phone pairs rather than running on behind a success screen
    refetchInterval: (query) =>
      query.state.data?.connected ? false : DIALOG_POLL_MS,
  });

  const start = useMutation<WhatsappOtpPairing, unknown, PairingMode>({
    mutationFn: (m) =>
      m === "replace" ? replaceWhatsappOtp() : linkWhatsappOtp(),
    onSettled: () =>
      void queryClient.invalidateQueries({
        queryKey: queryKeys.admin.whatsappOtp,
      }),
  });

  // `status` has nothing to kick off; the other two run once per opening
  const [startedFor, setStartedFor] = useState<PairingMode | null>(null);
  if (open && mode !== "status" && startedFor !== mode) {
    setStartedFor(mode);
    start.mutate(mode);
  }
  if (!open && startedFor !== null) {
    setStartedFor(null);
    start.reset();
  }

  const title =
    mode === "replace"
      ? t.admin.whatsappReplacingTitle
      : mode === "link"
        ? t.admin.whatsappPairingTitle
        : t.admin.whatsappModalTitle;

  // a code from the call that just ran outranks the polled one: it is the
  // newer of the two, and after a replace the polled value is still the old
  const qr = start.data?.qrDataUrl ?? data?.qrBase64 ?? null;
  const connected = start.data?.connected || data?.connected;
  const alreadyLinked =
    start.error instanceof ApiError && start.error.status === 409;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="scrollbar-none max-h-[88dvh] gap-0 overflow-y-auto p-0 sm:max-w-sm">
        <DialogHeader flush>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center px-5 py-6 text-center">
          {start.isPending ? (
            <>
              <Loader2 className="size-8 animate-spin text-primary/60" />
              <p className="mt-3 text-sm text-muted-foreground">
                {t.admin.whatsappStarting}
              </p>
            </>
          ) : alreadyLinked ? (
            <Notice
              icon={<Link2 className="size-6" />}
              title={t.admin.whatsappAlreadyLinked}
              body={t.admin.whatsappAlreadyLinkedBody}
            />
          ) : start.isError ? (
            <Notice
              tone="danger"
              icon={<WifiOff className="size-6" />}
              title={t.admin.whatsappActionFailed}
              body={
                start.error instanceof ApiError
                  ? start.error.message
                  : t.admin.whatsappStatusFailedBody
              }
            />
          ) : isPending ? (
            <>
              <Loader2 className="size-8 animate-spin text-primary/60" />
              <p className="mt-3 text-sm text-muted-foreground">
                {t.admin.whatsappChecking}
              </p>
            </>
          ) : connected ? (
            <>
              <span className="flex size-14 items-center justify-center rounded-full border border-success/25 bg-success/12 text-success">
                <CheckCircle2 className="size-7" />
              </span>
              <p className="mt-3 text-sm font-semibold">
                {t.admin.whatsappConnectedBody}
              </p>
              <Button className="mt-5 w-full" onClick={onClose}>
                {t.common.close}
              </Button>
            </>
          ) : isError || !data ? (
            /* a failed request says nothing about the gateway — reporting it
               as "not configured" would send the reader after the wrong fault */
            <Notice
              tone="danger"
              icon={<WifiOff className="size-6" />}
              title={t.admin.whatsappStatusFailed}
              body={t.admin.whatsappStatusFailedBody}
            />
          ) : !data.configured ? (
            <Notice
              icon={<WifiOff className="size-6" />}
              title={t.admin.whatsappNotConfigured}
              body={t.admin.whatsappNotConfiguredBody}
            />
          ) : !data.reachable ? (
            <Notice
              tone="danger"
              icon={<WifiOff className="size-6" />}
              title={t.admin.whatsappUnreachable}
              body={t.admin.whatsappUnreachableBody}
            />
          ) : qr ? (
            <>
              {/* the code is a data: URL already — `unoptimized` because there
                  is nothing for the image optimiser to fetch or resize, and a
                  white ground because QR readers need the quiet zone light */}
              <span className="relative block size-56 overflow-hidden rounded-xl border border-border/60 bg-white">
                <Image
                  src={qr}
                  alt=""
                  fill
                  unoptimized
                  className="object-contain p-2"
                />
              </span>
              <p className="mt-4 text-sm font-semibold">
                {t.admin.whatsappScanTitle}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t.admin.whatsappScanBody}
              </p>
            </>
          ) : (
            <>
              <span className="flex size-14 items-center justify-center rounded-full bg-surface-container text-muted-foreground">
                <QrCode className="size-6" />
              </span>
              <Loader2 className="mt-3 size-4 animate-spin text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t.admin.whatsappGeneratingQr}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** the dead ends: nothing to scan, nothing to do from this screen */
function Notice({
  icon,
  title,
  body,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <>
      <span
        className={
          tone === "danger"
            ? "flex size-14 items-center justify-center rounded-full border border-destructive/25 bg-destructive/10 text-destructive"
            : "flex size-14 items-center justify-center rounded-full bg-surface-container text-muted-foreground"
        }
      >
        {icon}
      </span>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
    </>
  );
}
