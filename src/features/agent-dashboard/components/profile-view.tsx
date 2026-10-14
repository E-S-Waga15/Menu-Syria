"use client";

import { useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";

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
import { ImagePreviewDialog } from "@/components/shared/image-preview-dialog";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ProfilePhotoViewer } from "@/components/shared/profile-photo-viewer";
import { SafeImage } from "@/components/shared/safe-image";
import {
  getMyAgentProfile,
  updateMyAgentProfile,
  type AgentProfileInput,
} from "@/features/agent-dashboard/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { uploadImage } from "@/lib/api/upload";
import { qrFileName } from "@/lib/qr-filename";
import { toast } from "@/lib/toast";

/**
 * The agent's own profile photo — the only thing their dashboard can edit
 * about their profile right now (name/bio/commission stay admin-managed).
 * Mirrors the business logo's view/change/save/delete flow in
 * `business-profile.tsx` so both sides of the platform behave the same way.
 */
export function AgentProfileView() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();

  const { data: agent } = useQuery({
    queryKey: queryKeys.me.agentProfile,
    queryFn: () => getMyAgentProfile(),
  });

  const mutation = useMutation({
    mutationFn: (input: AgentProfileInput) => updateMyAgentProfile(input),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me.agentProfile, updated);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    },
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [confirmingDeletePhoto, setConfirmingDeletePhoto] = useState(false);

  if (!agent) return <LoadingSpinner />;

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const confirmPhoto = async () => {
    if (photoFile) {
      setIsSavingPhoto(true);
      let url: string;
      try {
        ({ url } = await uploadImage(photoFile, "agents"));
      } catch (error) {
        toast.error(
          error instanceof ApiError ? error.message : t.common.saveFailed,
        );
        setIsSavingPhoto(false);
        return;
      }
      try {
        await mutation.mutateAsync({ photoUrl: url });
      } catch {
        setIsSavingPhoto(false);
        return;
      }
      setIsSavingPhoto(false);
    }
    setPhotoPreview(null);
    setPhotoFile(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const cancelPhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const photoFileName = qrFileName([t.common.agentWord, agent.name[lang]]);

  const downloadPhoto = () => {
    if (!agent.photoUrl) return;
    const link = document.createElement("a");
    link.href = agent.photoUrl;
    link.download = photoFileName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  };

  const confirmDeletePhoto = async () => {
    try {
      await mutation.mutateAsync({ photoUrl: "" });
      setConfirmingDeletePhoto(false);
    } catch {
      // the mutation's own onError already toasted
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold">{t.agent.profileTitle}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t.agent.profileHint}
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5">
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={t.dashboard.viewPhoto}
            onClick={() => setPhotoViewerOpen(true)}
            className="block rounded-2xl"
          >
            <SafeImage
              src={agent.photoUrl}
              alt=""
              width={96}
              height={96}
              unoptimized={agent.photoUrl.startsWith("data:")}
              className="size-20 rounded-2xl border border-border object-cover sm:size-24"
            />
          </button>
          <button
            type="button"
            aria-label={t.dashboard.updatePhoto}
            onClick={() => photoInputRef.current?.click()}
            className="absolute bottom-0 end-0 flex size-6 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground sm:size-8"
          >
            <Camera className="size-3.5 sm:size-4" />
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
        </div>
        <div>
          <p className="font-heading font-bold">{agent.name[lang]}</p>
          <p className="text-sm text-muted-foreground">{agent.referralCode}</p>
        </div>
      </div>

      <ImagePreviewDialog
        src={photoPreview}
        onConfirm={() => void confirmPhoto()}
        onCancel={cancelPhoto}
        confirming={isSavingPhoto}
        t={t}
      />

      <ProfilePhotoViewer
        open={photoViewerOpen}
        onOpenChange={setPhotoViewerOpen}
        src={agent.photoUrl}
        onChangeClick={() => {
          setPhotoViewerOpen(false);
          photoInputRef.current?.click();
        }}
        onSaveClick={downloadPhoto}
        onDeleteClick={() => {
          setPhotoViewerOpen(false);
          setConfirmingDeletePhoto(true);
        }}
      />

      <AlertDialog
        open={confirmingDeletePhoto}
        onOpenChange={(open) =>
          !open && !mutation.isPending && setConfirmingDeletePhoto(false)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.dashboard.confirmDeletePhotoTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.dashboard.confirmDeletePhotoBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={mutation.isPending}
              onClick={() => setConfirmingDeletePhoto(false)}
            >
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={mutation.isPending}
              onClick={() => void confirmDeletePhoto()}
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
