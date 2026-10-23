"use client";

import { Camera, Download, Trash2, X } from "lucide-react";

import { RowActions } from "@/components/shared/row-actions";
import { SafeImage } from "@/components/shared/safe-image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/client";

/**
 * A fullscreen black viewer for a profile photo (business logo or agent
 * photo) — tap the avatar anywhere it's used to open this, with a white
 * three-dot menu in the corner for change/save/delete. The viewer itself
 * holds no upload/delete logic; it only triggers the three callbacks and
 * lets the caller own its own picker, preview-confirm dialog, and delete
 * confirm, since those already differ between a business and an agent.
 */
export function ProfilePhotoViewer({
  open,
  onOpenChange,
  src,
  alt = "",
  onChangeClick,
  onSaveClick,
  onDeleteClick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt?: string;
  onChangeClick: () => void;
  onSaveClick: () => void;
  onDeleteClick: () => void;
}) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-dvh max-h-none w-screen max-w-none items-center justify-center rounded-none border-none bg-black p-0"
      >
        <button
          type="button"
          aria-label={t.common.close}
          onClick={() => onOpenChange(false)}
          className="absolute top-4 start-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X className="size-5" />
        </button>

        <div className="absolute top-4 end-4 z-10">
          <RowActions
            triggerClassName="size-10 bg-white/10 text-white hover:bg-white/20"
            actions={[
              {
                label: t.dashboard.updatePhoto,
                icon: Camera,
                onSelect: onChangeClick,
              },
              {
                label: t.dashboard.savePhoto,
                icon: Download,
                onSelect: onSaveClick,
              },
              {
                label: t.dashboard.deletePhoto,
                icon: Trash2,
                danger: true,
                onSelect: onDeleteClick,
              },
            ]}
          />
        </div>

        {src && (
          <div className="relative h-[75vh] w-[88vw] max-w-2xl">
            <SafeImage
              src={src}
              alt={alt}
              fill
              // a business logo or an agent photo — never recompressed, so
              // what opens full-screen is exactly what was uploaded
              unoptimized
              className="object-contain"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
