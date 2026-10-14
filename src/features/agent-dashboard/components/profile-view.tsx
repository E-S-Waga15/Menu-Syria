"use client";

import { useRef, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, User } from "lucide-react";

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
import { FacebookIcon, InstagramIcon } from "@/components/shared/brand-icons";
import { ImagePreviewDialog } from "@/components/shared/image-preview-dialog";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ProfilePhotoViewer } from "@/components/shared/profile-photo-viewer";
import { MultiRegionPicker } from "@/components/shared/multi-region-picker";
import { ProfileSection } from "@/components/shared/profile-section";
import { SafeImage } from "@/components/shared/safe-image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getMyAgentProfile,
  updateMyAgentProfile,
  type AgentProfileInput,
} from "@/features/agent-dashboard/services";
import { getGovernorates, getRegions } from "@/features/marketing/services";
import { useI18n } from "@/i18n/client";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { uploadImage } from "@/lib/api/upload";
import { qrFileName } from "@/lib/qr-filename";
import { toast } from "@/lib/toast";
import type { Agent } from "@/lib/types";

/**
 * Name, bio, contact info and coverage area, editable the same way the
 * business settings page edits its own account info: one card, an edit
 * toggle, a floating save/discard bar. Referral code and commission rate
 * stay admin-managed — not shown here as editable.
 */
function AgentAccountInfoSection({
  agent,
  t,
  lang,
  mutation,
}: {
  agent: Agent;
  t: ReturnType<typeof useI18n>["t"];
  lang: ReturnType<typeof useI18n>["lang"];
  mutation: ReturnType<
    typeof useMutation<Agent, Error, AgentProfileInput>
  >;
}) {
  const { data: governorates } = useQuery({
    queryKey: queryKeys.governorates,
    queryFn: getGovernorates,
  });
  const { data: regions } = useQuery({
    queryKey: queryKeys.regions,
    queryFn: getRegions,
  });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(agent.name[lang]);
  const [bio, setBio] = useState(agent.bio[lang]);
  const [phone, setPhone] = useState(agent.phone);
  const [whatsapp, setWhatsapp] = useState(agent.whatsapp);
  const [instagram, setInstagram] = useState(agent.instagram ?? "");
  const [facebook, setFacebook] = useState(agent.facebook ?? "");
  const [governorateId, setGovernorateId] = useState(agent.governorateId);
  const [regionIds, setRegionIds] = useState(agent.regionIds);
  const snapshot = useRef({
    name,
    bio,
    phone,
    whatsapp,
    instagram,
    facebook,
    governorateId,
    regionIds,
  });

  const regionChoices = (regions ?? []).filter(
    (r) => r.governorateId === governorateId,
  );

  return (
    <ProfileSection
      title={t.agent.accountInfoTitle}
      icon={User}
      editing={editing}
      t={t}
      onEdit={() => {
        snapshot.current = {
          name,
          bio,
          phone,
          whatsapp,
          instagram,
          facebook,
          governorateId,
          regionIds,
        };
        setEditing(true);
      }}
      onSave={async () => {
        await mutation.mutateAsync({
          name,
          bio,
          phone,
          whatsapp,
          instagram,
          facebook,
          governorateId,
          regionIds,
        });
        setEditing(false);
      }}
      onCancel={() => {
        setName(snapshot.current.name);
        setBio(snapshot.current.bio);
        setPhone(snapshot.current.phone);
        setWhatsapp(snapshot.current.whatsapp);
        setInstagram(snapshot.current.instagram);
        setFacebook(snapshot.current.facebook);
        setGovernorateId(snapshot.current.governorateId);
        setRegionIds(snapshot.current.regionIds);
        setEditing(false);
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ap-name">{t.auth.fullNameLabel}</Label>
          <Input
            id="ap-name"
            className="h-11"
            disabled={!editing}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ap-phone">{t.auth.phoneLabel}</Label>
          <Input
            id="ap-phone"
            dir="ltr"
            className="h-11"
            disabled={!editing}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="ap-bio">{t.auth.bioLabel}</Label>
        <Textarea
          id="ap-bio"
          rows={3}
          disabled={!editing}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ap-whatsapp">{t.agent.whatsappLabel}</Label>
          <Input
            id="ap-whatsapp"
            dir="ltr"
            className="h-11"
            disabled={!editing}
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ap-ig" className="gap-1.5">
            <InstagramIcon className="size-4" /> {t.auth.instagramLabel}
          </Label>
          <Input
            id="ap-ig"
            dir="ltr"
            className="h-11"
            disabled={!editing}
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="ap-fb" className="gap-1.5">
          <FacebookIcon className="size-4" /> {t.auth.facebookLabel}
        </Label>
        <Input
          id="ap-fb"
          dir="ltr"
          className="h-11"
          disabled={!editing}
          value={facebook}
          onChange={(e) => setFacebook(e.target.value)}
        />
      </div>

      <div className="mt-5 space-y-2">
        <Label>{t.agent.coverageLabel}</Label>
        <p className="text-xs text-muted-foreground">{t.agent.coverageHint}</p>
        <Select
          value={governorateId || null}
          onValueChange={(v) => {
            if (!v) return;
            setGovernorateId(v);
            setRegionIds([]);
          }}
          items={Object.fromEntries(
            (governorates ?? []).map((g) => [g.id, g.name[lang]]),
          )}
          disabled={!editing}
        >
          <SelectTrigger id="ap-governorate" className="h-11! w-full">
            <SelectValue placeholder={t.auth.governorateLabel} />
          </SelectTrigger>
          <SelectContent>
            {(governorates ?? []).map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name[lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {governorateId && regionChoices.length > 0 && (
          <div className="pt-1">
            <MultiRegionPicker
              regionChoices={regionChoices.map((r) => ({
                id: r.id,
                name: r.name[lang],
              }))}
              selectedIds={regionIds}
              onChange={(ids) => setRegionIds(ids)}
              placeholder={t.restaurantsPage.regionLabel}
              disabled={!editing}
            />
          </div>
        )}
      </div>
    </ProfileSection>
  );
}

/**
 * The agent's own profile: photo (view/change/save/delete, same fullscreen
 * flow as the business logo) plus account info (name, bio, contact,
 * coverage area). Referral code and commission rate stay admin-managed.
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

  // a plain `<a download>` only works same-origin — photos now live on
  // Cloudinary (cross-origin), so the browser ignores `download` there and
  // just opens the image in a new tab instead. Fetching it as a blob first
  // works regardless of origin.
  const downloadPhoto = async () => {
    if (!agent.photoUrl) return;
    try {
      const response = await fetch(agent.photoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = photoFileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    }
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

      <AgentAccountInfoSection
        agent={agent}
        t={t}
        lang={lang}
        mutation={mutation}
      />

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
        onSaveClick={() => void downloadPhoto()}
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
