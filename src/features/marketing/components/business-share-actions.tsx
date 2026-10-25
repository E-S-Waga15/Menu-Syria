"use client";

import { useRef, useState } from "react";

import { Check, Copy, Download, QrCode, Share2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import logoMark from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n/client";
import { qrFileName } from "@/lib/qr-filename";
import { toast } from "@/lib/toast";

/**
 * Export geometry, in device pixels. The code is rendered at this size and
 * merely displayed smaller, so the PNG stays crisp when printed.
 */
const QR_PX = 440;
const PAD = 48;
const CAPTION_H = 56;
const URL_H = 40;
const CARD = { w: QR_PX + PAD * 2, h: PAD * 2 + QR_PX + CAPTION_H + URL_H };

/**
 * The two round actions on a business details page: share the page, or open
 * its QR. A near-exact sibling of `AgentShareActions` — same QR-composition/
 * export/share-sheet logic — with the business's own name and photo in
 * place of an agent's.
 *
 * The QR carries the logo in its centre at error-correction level H, which
 * reserves enough redundancy that the excavated middle still scans.
 *
 * Export composes a fresh canvas rather than screenshotting the DOM: the
 * on-screen card and the exported PNG are laid out from the same constants,
 * so there is no third-party rasteriser to disagree with, and no dependency
 * beyond the QR generator already in the project.
 *
 * The URL is whatever page the visitor is actually on. It is captured in the
 * click handler rather than an effect: reading `window` during render would
 * break SSR, and the lint rules (rightly) reject setState inside an effect.
 * The dialog only mounts once open, so the value is always there in time.
 */
const sizeClasses = { sm: "size-8", md: "size-10" };
const iconSizes = { sm: "size-4", md: "size-4.5" };

export function BusinessShareActions({
  businessName,
  businessLocation,
  businessPhotoUrl,
  businessKind,
  size = "md",
}: {
  businessName: string;
  /** e.g. "Damascus, Bab Touma" — rides along in the share text */
  businessLocation?: string;
  /** centred in the code; falls back to the platform mark when the
   * business has none */
  businessPhotoUrl?: string;
  /** "restaurant"/"store" prefix on the downloaded file name, so an owner
   * with both kinds in their downloads folder can tell them apart */
  businessKind?: "restaurant" | "store";
  size?: "sm" | "md";
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const qrWrapRef = useRef<HTMLDivElement>(null);

  const openQr = () => {
    setUrl(window.location.href);
    setOpen(true);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t.restaurant.linkCopied);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t.restaurant.shareFailed);
    }
  };

  /** platform first, then the business — one line under the code */
  const caption = `${t.common.brand} | ${businessName}`;

  /** name and location, e.g. "Al Sham Restaurant — Damascus, Bab Touma" */
  const headline = businessLocation
    ? `${businessName} — ${businessLocation}`
    : businessName;

  const sharePage = async () => {
    const pageUrl = window.location.href;
    // joined into one `text` field (with the break built in) rather than
    // split across `text`/`url` — most share targets (WhatsApp included)
    // just concatenate those two on the same line if left separate
    const data = { title: caption, text: `${headline}\n${pageUrl}` };

    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        // dismissing the share sheet is not a failure worth reporting
        if (error instanceof DOMException && error.name === "AbortError")
          return;
      }
    }

    try {
      await navigator.clipboard.writeText(pageUrl);
      toast.success(t.restaurant.linkCopied);
    } catch {
      toast.error(t.restaurant.shareFailed);
    }
  };

  /** draws the card: the code, then the caption, then the link */
  const composeCard = async (): Promise<HTMLCanvasElement | null> => {
    const qr = qrWrapRef.current?.querySelector("canvas");
    if (!qr) return null;

    // without this the first export can land before Cairo/Epilogue are ready
    // and fall back to a system face
    try {
      await document.fonts.ready;
    } catch {
      /* font loading API unavailable — the fallback stack still renders */
    }

    const canvas = document.createElement("canvas");
    canvas.width = CARD.w;
    canvas.height = CARD.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const family = getComputedStyle(document.body).fontFamily;
    const centre = CARD.w / 2;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CARD.w, CARD.h);

    ctx.drawImage(qr, PAD, PAD, QR_PX, QR_PX);

    ctx.textAlign = "center";
    ctx.direction = lang === "ar" ? "rtl" : "ltr";
    ctx.fillStyle = "#191c1d";
    ctx.font = `700 28px ${family}`;
    ctx.fillText(caption, centre, PAD + QR_PX + 44, CARD.w - PAD);

    ctx.direction = "ltr";
    ctx.fillStyle = "#6b7280";
    ctx.font = `500 18px ${family}`;
    ctx.fillText(url, centre, PAD + QR_PX + CAPTION_H + 30, CARD.w - PAD);

    return canvas;
  };

  const kindWord =
    businessKind === "store"
      ? t.common.storeWord
      : businessKind === "restaurant"
        ? t.common.restaurantWord
        : undefined;
  const fileName = qrFileName([kindWord, businessName, "qr"]);

  // a remote photo without CORS headers taints the canvas: it still draws
  // and displays fine, it just can't be read back for export — so the
  // download/share actions fail closed with a toast instead of throwing
  const downloadCard = async () => {
    const canvas = await composeCard();
    if (!canvas) return;
    try {
      const link = document.createElement("a");
      link.download = fileName;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      toast.error(t.restaurant.shareFailed);
    }
  };

  const shareCard = async () => {
    const canvas = await composeCard();
    if (!canvas) return;

    const blob = await new Promise<Blob | null>((resolve) => {
      try {
        canvas.toBlob(resolve, "image/png");
      } catch {
        resolve(null);
      }
    });
    if (!blob) {
      toast.error(t.restaurant.shareFailed);
      return;
    }

    const file = new File([blob], fileName, { type: "image/png" });

    // sharing files is the newest of these APIs — fall back to a download,
    // which every browser can do
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: caption,
          // a PNG carries no link and no context of its own, so the name,
          // the location, and the URL ride along in the share text — on
          // WhatsApp that becomes the caption under the photo
          text: `${headline}\n${url}`,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
      }
    }

    await downloadCard();
  };

  const roundButton = `flex ${sizeClasses[size]} shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:bg-berry-soft/30 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`;

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={sharePage}
          aria-label={t.restaurant.shareLabel}
          title={t.restaurant.shareLabel}
          className={roundButton}
        >
          <Share2 className={iconSizes[size]} />
        </button>
        <button
          type="button"
          onClick={openQr}
          aria-label={t.restaurant.qrLabel}
          title={t.restaurant.qrLabel}
          className={roundButton}
        >
          <QrCode className={iconSizes[size]} />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {t.restaurant.qrTitle}
            </DialogTitle>
          </DialogHeader>

          {/* mirrors the exported card: code, caption, link. min-w-0 keeps
              every child free to shrink below its own content width — without
              it, the unbreakable URL below forces this column wider than the
              dialog and spills past its edges instead of wrapping */}
          <div className="mt-1 flex w-full min-w-0 flex-col items-center">
            <div
              ref={qrWrapRef}
              className="w-full max-w-[200px] rounded-2xl border border-border/60 bg-white p-3"
            >
              <QRCodeCanvas
                value={url}
                size={QR_PX}
                level="H"
                fgColor="#191c1d"
                bgColor="#ffffff"
                // QRCodeCanvas sets an inline style of `size` px, which beats
                // any class; it spreads a passed style last, so this overrides
                // it with a responsive size instead of a fixed pixel value —
                // the 440px canvas stays crisp while scaling to fit any
                // dialog width down to the smallest phone
                style={{ width: "100%", height: "100%", aspectRatio: "1 / 1" }}
                imageSettings={{
                  src: businessPhotoUrl || logoMark.src,
                  width: businessPhotoUrl ? 90 : 80,
                  height: businessPhotoUrl ? 90 : 100,
                  excavate: true,
                  ...(businessPhotoUrl ? { crossOrigin: "anonymous" } : {}),
                }}
              />
            </div>

            <p className="mt-4 text-center text-sm font-bold">{caption}</p>

            <div className="mt-4 w-full rounded-xl bg-surface-container-low p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t.restaurant.qrLinkLabel}
                </p>
                <button
                  type="button"
                  aria-label={t.common.copy}
                  onClick={() => void copyUrl()}
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-surface-container-high"
                >
                  {copied ? (
                    <Check className="size-3.5 text-success" />
                  ) : (
                    <Copy className="size-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
              {/* break-all over truncate: a menusyria.app/slug link is one
                  unbroken token with nowhere to wrap, so it either breaks
                  mid-word or it overflows — wrapping onto a second line beats
                  both an ellipsis that hides the link and a line that spills
                  outside the card */}
              <p
                className="mt-3 w-full max-w-full rounded-lg border border-border/60 bg-card px-3.5 py-2 text-center text-xs break-all text-muted-foreground"
                dir="ltr"
              >
                {url}
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <Button className="h-10 flex-1" onClick={shareCard}>
              <Share2 className="size-4" />
              {t.restaurant.qrShare}
            </Button>
            <Button
              variant="outline"
              className="h-10 flex-1 border-[1.5px]"
              onClick={downloadCard}
            >
              <Download className="size-4" />
              {t.restaurant.qrDownload}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
