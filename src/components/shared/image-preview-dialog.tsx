"use client";

import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { useI18n } from "@/i18n/client";

/** Confirms an image before it's actually applied: pick a file → preview it
 * here → "تأكيد" commits, "إلغاء" discards and re-opens nothing. Shared
 * across every add-a-photo flow (business logo/gallery/QR, agent photo)
 * so they all stage a pick the same way. */
export function ImagePreviewDialog({
  src,
  onConfirm,
  onCancel,
  confirming = false,
  t,
}: {
  src: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  /** shows a spinner and blocks closing while a save this preview kicked
   * off is still in flight */
  confirming?: boolean;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <Dialog
      open={!!src}
      onOpenChange={(open) => !open && !confirming && onCancel()}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t.dashboard.previewPhotoTitle}</DialogTitle>
        </DialogHeader>
        {src && (
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/60">
            <SafeImage
              src={src}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={confirming}
            onClick={onCancel}
          >
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            className="flex-1"
            loading={confirming}
            onClick={onConfirm}
          >
            {t.common.confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
