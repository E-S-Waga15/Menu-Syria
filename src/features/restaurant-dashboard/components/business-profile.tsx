"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  Armchair,
  Bike,
  Camera,
  CalendarClock,
  Check,
  Crown,
  Globe,
  Image as ImageIcon,
  LifeBuoy,
  Link2,
  MapPin,
  MoreVertical,
  PackageOpen,
  Palette,
  Pencil,
  Phone,
  Plus,
  Printer,
  QrCode,
  Share2,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";

import {
  FacebookIcon,
  InstagramIcon,
  WhatsAppIcon,
} from "@/components/shared/brand-icons";
import { ColorField } from "@/components/shared/color-field";
import { FieldError } from "@/components/shared/field-error";
import { GoogleLocationPicker } from "@/components/shared/google-location-picker";
import { GovernorateRegionSelect } from "@/components/shared/governorate-region-select";
import { ImagePreviewDialog } from "@/components/shared/image-preview-dialog";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ProfilePhotoViewer } from "@/components/shared/profile-photo-viewer";
import { SectionErrorBoundary } from "@/components/shared/section-error-boundary";
import {
  EditingGuardContext,
  ProfileSection,
} from "@/components/shared/profile-section";
import { RowActions } from "@/components/shared/row-actions";
import { SafeImage } from "@/components/shared/safe-image";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/store";
import {
  getBusinessSubTypes,
  getGovernorates,
  getRegions,
  getSubscriptionPlans,
} from "@/features/marketing/services";
import { getSupportedFulfillment } from "@/features/public-menu/lib/fulfillment";
import { createSubscriptionRequest } from "@/features/subscription-requests/services";
import { useBusinessProfileMutations } from "@/features/restaurant-dashboard/hooks/use-business-profile";
import { getMyRestaurant } from "@/features/restaurant-dashboard/services";
import type { BusinessProfileInput } from "@/features/restaurant-dashboard/services";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import { uploadImage } from "@/lib/api/upload";
import { recoverBusinessFields } from "@/lib/business-text";
import { qrFileName } from "@/lib/qr-filename";
import type {
  BusinessAgent,
  FulfillmentMode,
  Governorate,
  Region,
  Restaurant,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type I18n = ReturnType<typeof useI18n>;

/** A handful of menu-friendly starting points — picking one is faster than
 * dialing in a hex value, and nothing stops typing a custom one instead. */
const PRIMARY_COLOR_PRESETS = [
  "#850036",
  "#b5121b",
  "#0f766e",
  "#1d4ed8",
  "#7c3aed",
  "#15803d",
];
const SECONDARY_COLOR_PRESETS = [
  "#f4c430",
  "#f59e0b",
  "#fb923c",
  "#facc15",
  "#eab308",
  "#fde68a",
];

/** What a section calls to write its own fields. */
type SaveProfile = (input: BusinessProfileInput) => Promise<unknown>;

/**
 * Account info + contact info, merged into one section/tab — an owner edits
 * who they are and where they are in the same place instead of hunting
 * across two near-identical cards for one one form.
 */
function AccountInfoSection({
  restaurant,
  isStore,
  t,
  lang,
  save,
}: {
  restaurant: Restaurant;
  isStore: boolean;
  t: I18n["t"];
  lang: I18n["lang"];
  save: SaveProfile;
}) {
  const { data: governorates } = useQuery({
    queryKey: queryKeys.governorates,
    queryFn: getGovernorates,
  });
  const { data: regions } = useQuery({
    queryKey: queryKeys.regions,
    queryFn: getRegions,
  });
  const { data: subTypes } = useQuery({
    queryKey: queryKeys.businessSubTypes(isStore ? "STORE" : "RESTAURANT"),
    queryFn: () => getBusinessSubTypes(isStore ? "STORE" : "RESTAURANT"),
  });

  // a request approved before the backend had dedicated columns for these
  // left its logo/colors/address/location dumped as text inside
  // `description` — recovered here so the owner sees (and can re-save) the
  // real values instead of that raw dump
  const recovered = recoverBusinessFields(restaurant.description[lang]);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(restaurant.name[lang]);
  const [slug, setSlug] = useState(restaurant.slug);
  const [slugError, setSlugError] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState(recovered.description);
  const [subTypeId, setSubTypeId] = useState(restaurant.subTypeId ?? "");
  const [phone, setPhone] = useState(restaurant.phone);
  const [address, setAddress] = useState(
    restaurant.address[lang] || recovered.address || "",
  );
  const [governorateId, setGovernorateId] = useState(restaurant.governorateId);
  const [regionId, setRegionId] = useState(restaurant.regionId);
  // coerced through Number(): a raw API response can hand back a decimal
  // column as a string ("33.5138"), which is truthy like a real
  // coordinate but has no .toFixed() — crashing the map-picker trigger the
  // moment editing turned it on
  const [lat, setLat] = useState(
    Number(recovered.location?.lat ?? restaurant.location.lat) || 0,
  );
  const [lng, setLng] = useState(
    Number(recovered.location?.lng ?? restaurant.location.lng) || 0,
  );
  const [mapOpen, setMapOpen] = useState(false);
  const snapshot = useRef({
    name,
    slug,
    description,
    subTypeId,
    phone,
    address,
    governorateId,
    regionId,
    lat,
    lng,
  });

  /** mirrors the backend's own rules so the field never even submits an
   * obviously-rejected value: spaces become "_" as you type, dots are
   * blocked outright (not silently stripped, so the rule stays visible) */
  const handleSlugChange = (value: string) => {
    if (value.includes(".")) {
      setSlugError(t.auth.slugInvalidDot);
      return;
    }
    setSlugError(undefined);
    setSlug(value.replace(/\s+/g, "_"));
  };

  const regionChoices = (regions ?? []).filter(
    (r) => r.governorateId === governorateId,
  );

  return (
    <ProfileSection
      title={t.dashboard.accountInfoTab}
      icon={User}
      editing={editing}
      t={t}
      onEdit={() => {
        snapshot.current = {
          name,
          slug,
          description,
          subTypeId,
          phone,
          address,
          governorateId,
          regionId,
          lat,
          lng,
        };
        setEditing(true);
      }}
      onSave={async () => {
        try {
          await save({
            name,
            slug,
            description,
            ...(subTypeId ? { subTypeId } : {}),
            address,
            districtId: regionId || undefined,
            phones: [
              { numberType: "mobile", number: phone },
              ...(restaurant.whatsapp
                ? [
                    {
                      numberType: "whatsapp" as const,
                      number: restaurant.whatsapp,
                    },
                  ]
                : []),
            ],
            latitude: lat,
            longitude: lng,
          });
        } catch (error) {
          // 400 (invalid slug) / 409 (already taken by another business) —
          // shown right under the field so it's clear what to fix, on top
          // of the generic save-failed toast the mutation itself fires
          if (
            error instanceof ApiError &&
            (error.status === 400 || error.status === 409)
          ) {
            setSlugError(error.message);
          }
          throw error;
        }
        setSlugError(undefined);
        setEditing(false);
      }}
      onCancel={() => {
        setName(snapshot.current.name);
        setSlug(snapshot.current.slug);
        setSlugError(undefined);
        setDescription(snapshot.current.description);
        setSubTypeId(snapshot.current.subTypeId);
        setPhone(snapshot.current.phone);
        setAddress(snapshot.current.address);
        setGovernorateId(snapshot.current.governorateId);
        setRegionId(snapshot.current.regionId);
        setLat(snapshot.current.lat);
        setLng(snapshot.current.lng);
        setEditing(false);
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="p-name">{t.auth.restaurantNameLabel}</Label>
          <Input
            id="p-name"
            className="h-11"
            disabled={!editing}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-subtype">{t.auth.restaurantTypeLabel}</Label>
          <Select
            value={subTypeId || null}
            onValueChange={(v) => v && setSubTypeId(v)}
            items={Object.fromEntries(
              (subTypes ?? []).map((st) => [st.id, st.name]),
            )}
            disabled={!editing}
          >
            <SelectTrigger id="p-subtype" className="h-11! w-full">
              <SelectValue placeholder={t.auth.businessTypePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {(subTypes ?? []).map((st) => (
                <SelectItem key={st.id} value={st.id}>
                  {st.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="p-slug">{t.auth.slugLabel}</Label>
        <Input
          id="p-slug"
          dir="ltr"
          className="h-11"
          disabled={!editing}
          value={slug}
          aria-invalid={!!slugError}
          onChange={(e) => handleSlugChange(e.target.value)}
        />
        <FieldError message={slugError} />
        {!slugError && (
          <p className="text-xs text-muted-foreground">{t.auth.slugHint}</p>
        )}
        {slug && (
          <p
            className="truncate text-xs font-semibold text-primary"
            dir="ltr"
          >
            /{lang}/{slug}
          </p>
        )}
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="p-desc">{t.auth.descriptionLabel}</Label>
        <Textarea
          id="p-desc"
          rows={3}
          disabled={!editing}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="p-phone">{t.auth.phoneLabel}</Label>
          <Input
            id="p-phone"
            dir="ltr"
            className="h-11"
            disabled={!editing}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>{t.auth.governorateLabel}</Label>
          <GovernorateRegionSelect
            triggerClassName="h-11"
            className="grid gap-2 sm:grid-cols-2"
            governorateValue={governorateId}
            onGovernorateChange={(v) => {
              setGovernorateId(v);
              setRegionId("");
            }}
            governorateItems={Object.fromEntries(
              (governorates ?? []).map((g) => [g.id, g.name[lang]]),
            )}
            governorateAriaLabel={t.auth.governorateLabel}
            regionValue={regionId}
            onRegionChange={setRegionId}
            regionItems={Object.fromEntries(
              regionChoices.map((r) => [r.id, r.name[lang]]),
            )}
            regionAriaLabel={t.restaurantsPage.regionLabel}
            regionDisabled={!editing || !governorateId}
            governorateDisabled={!editing}
          />
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="p-address">{t.auth.addressLabel}</Label>
        <Textarea
          id="p-address"
          rows={2}
          disabled={!editing}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      {editing && (
        <div className="mt-5 space-y-2">
          <Label>{t.auth.pickLocation}</Label>
          <Dialog open={mapOpen} onOpenChange={setMapOpen}>
            <DialogTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 w-full justify-start gap-3 border-dashed"
                />
              }
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full",
                  lat
                    ? "bg-success/10 text-success"
                    : "bg-berry-soft text-berry-soft-foreground",
                )}
              >
                {lat ? (
                  <Check className="size-4.5" />
                ) : (
                  <MapPin className="size-4.5" />
                )}
              </span>
              <span className="text-start">
                <span className="block text-sm font-semibold">
                  {lat ? t.auth.locationPicked : t.auth.openMapPicker}
                </span>
                {lat && (
                  <span
                    className="block text-xs text-muted-foreground"
                    dir="ltr"
                  >
                    {lat.toFixed(5)}, {lng.toFixed(5)}
                  </span>
                )}
              </span>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t.auth.pickLocation}</DialogTitle>
              </DialogHeader>
              <GoogleLocationPicker
                initialCoords={{ lat, lng }}
                selectedGovernorateId={governorateId}
                governorates={governorates}
                onLocationChange={({ lat: pickedLat, lng: pickedLng }) => {
                  setLat(pickedLat);
                  setLng(pickedLng);
                }}
              />
              <Button
                type="button"
                className="w-full"
                onClick={() => setMapOpen(false)}
              >
                {t.common.done}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </ProfileSection>
  );
}

function SocialMediaSection({
  restaurant,
  t,
  save,
}: {
  restaurant: Restaurant;
  t: I18n["t"];
  save: SaveProfile;
}) {
  const [editing, setEditing] = useState(false);
  const [whatsapp, setWhatsapp] = useState(restaurant.whatsapp);
  const [instagram, setInstagram] = useState(restaurant.instagram ?? "");
  const [facebook, setFacebook] = useState(restaurant.facebook ?? "");
  const snapshot = useRef({ whatsapp, instagram, facebook });

  return (
    <ProfileSection
      title={t.dashboard.socialMediaTab}
      icon={Globe}
      editing={editing}
      t={t}
      onEdit={() => {
        snapshot.current = { whatsapp, instagram, facebook };
        setEditing(true);
      }}
      onSave={async () => {
        await save({
          // the contact section owns the primary phone, so it rides along
          phones: [
            { numberType: "mobile", number: restaurant.phone },
            ...(whatsapp
              ? [{ numberType: "whatsapp" as const, number: whatsapp }]
              : []),
          ],
          // an emptied field removes the link rather than storing a blank one
          socialLinks: [
            instagram ? { socialPlatform: "instagram", url: instagram } : null,
            facebook ? { socialPlatform: "facebook", url: facebook } : null,
          ].filter(
            (link): link is { socialPlatform: string; url: string } =>
              link !== null,
          ),
        });
        setEditing(false);
      }}
      onCancel={() => {
        setWhatsapp(snapshot.current.whatsapp);
        setInstagram(snapshot.current.instagram);
        setFacebook(snapshot.current.facebook);
        setEditing(false);
      }}
    >
      <div className="space-y-3">
        <div className="relative">
          <WhatsAppIcon className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-[#128C4A] dark:text-[#4cd97f]" />
          <Label htmlFor="p-wa" className="sr-only">
            {t.auth.whatsappLabel}
          </Label>
          <Input
            id="p-wa"
            dir="ltr"
            placeholder={t.auth.whatsappLabel}
            className="h-10 ps-9"
            disabled={!editing}
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </div>
        <div className="relative">
          <InstagramIcon className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-[#c13584]" />
          <Label htmlFor="p-ig" className="sr-only">
            {t.auth.instagramLabel}
          </Label>
          <Input
            id="p-ig"
            dir="ltr"
            placeholder={t.auth.instagramLabel}
            className="h-10 ps-9"
            disabled={!editing}
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />
        </div>
        <div className="relative">
          <FacebookIcon className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-[#1462c4] dark:text-[#6ba8f5]" />
          <Label htmlFor="p-fb" className="sr-only">
            {t.auth.facebookLabel}
          </Label>
          <Input
            id="p-fb"
            dir="ltr"
            placeholder={t.auth.facebookLabel}
            className="h-10 ps-9"
            disabled={!editing}
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
          />
        </div>
      </div>
    </ProfileSection>
  );
}

/**
 * Add and delete each write straight through — no staged save/discard bar.
 * Unlike a form field, a photo add/delete is already its own deliberate,
 * single-purpose action (each one has its own confirm step — the preview
 * dialog for an add, an AlertDialog for a delete), so queuing it behind a
 * second "now save the section" step would just be a redundant extra click.
 */
function GallerySection({
  restaurant,
  t,
  save,
}: {
  restaurant: Restaurant;
  t: I18n["t"];
  save: SaveProfile;
}) {
  const [images, setImages] = useState(restaurant.coverImages);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickImage = (file: File | undefined) => {
    if (!file) return;
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const confirmImage = async () => {
    if (!pendingFile) {
      setPendingImage(null);
      return;
    }
    setAdding(true);
    try {
      const { url } = await uploadImage(pendingFile, "businesses");
      const next = [...images, url];
      await save({ images: next });
      setImages(next);
      setPendingImage(null);
      setPendingFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t.common.saveFailed,
      );
    } finally {
      setAdding(false);
    }
  };

  const cancelImage = () => {
    setPendingImage(null);
    setPendingFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const confirmDelete = async () => {
    if (deleteIndex === null) return;
    const next = images.filter((_, idx) => idx !== deleteIndex);
    setDeleting(true);
    try {
      await save({ images: next });
      setImages(next);
      setDeleteIndex(null);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t.common.saveFailed,
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6">
      <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
        <ImageIcon className="size-5 text-primary" />
        {t.restaurant.gallery}
      </h2>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border/60"
          >
            <SafeImage
              src={src}
              alt=""
              fill
              priority={i < 4}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
            <button
              type="button"
              aria-label={t.dashboard.removePhoto}
              onClick={() => setDeleteIndex(i)}
              className="absolute top-2 end-2 flex size-7 items-center justify-center rounded-full bg-destructive text-white transition-colors hover:bg-destructive/85"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Plus className="size-6" />
          <span className="text-xs font-semibold">{t.dashboard.addPhoto}</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => pickImage(e.target.files?.[0])}
          />
        </button>
      </div>

      <ImagePreviewDialog
        src={pendingImage}
        onConfirm={confirmImage}
        onCancel={cancelImage}
        confirming={adding}
        t={t}
      />

      <AlertDialog
        open={deleteIndex !== null}
        onOpenChange={(open) => !open && !deleting && setDeleteIndex(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.dashboard.confirmRemovePhotoTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.dashboard.confirmRemovePhotoBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              onClick={() => setDeleteIndex(null)}
            >
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={deleting}
              onClick={confirmDelete}
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/**
 * The Sham Cash transfer QR shown to customers at checkout. One image, not a
 * gallery — uploaded straight to `paymentQrCode`, which rides the business's
 * existing PATCH rather than a route of its own; an empty string clears it.
 */
/**
 * The QR image and the typed transfer code are one unit on the backend —
 * a write touching either one must send both, and neither can be cleared
 * while the other stays (see update.md §3). So instead of two independent
 * immediate-save controls, this is a single add/edit dialog: pick/replace
 * the image and type the code together, then one `save()` call carries
 * both. Removing clears both together too.
 */
function PaymentQrSection({
  restaurant,
  t,
  save,
}: {
  restaurant: Restaurant;
  t: I18n["t"];
  save: SaveProfile;
}) {
  const [qrUrl, setQrUrl] = useState(restaurant.paymentQrCode ?? "");
  const [code, setCode] = useState(restaurant.paymentCode ?? "");
  const hasPayment = !!qrUrl && !!code;

  const [dialogOpen, setDialogOpen] = useState(false);
  // the dialog's own draft state — seeded from the saved values on open,
  // discarded on cancel so a half-finished edit never leaks back out
  const [draftPreview, setDraftPreview] = useState<string | null>(null);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftCode, setDraftCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openDialog = () => {
    setDraftPreview(qrUrl || null);
    setDraftFile(null);
    setDraftCode(code);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    setDraftFile(file);
    const reader = new FileReader();
    reader.onload = () => setDraftPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const canSave = !!draftPreview && !!draftCode.trim();

  const confirmSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const url = draftFile
        ? (await uploadImage(draftFile, "businesses")).url
        : qrUrl;
      const trimmedCode = draftCode.trim();
      await save({ paymentQrCode: url, paymentCode: trimmedCode });
      setQrUrl(url);
      setCode(trimmedCode);
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    setRemoving(true);
    try {
      await save({ paymentQrCode: "", paymentCode: "" });
      setQrUrl("");
      setCode("");
      setConfirmingRemove(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
          <QrCode className="size-5 text-primary" />
          {t.dashboard.paymentQrTitle}
        </h2>
        {hasPayment && (
          <RowActions
            actions={[
              {
                label: t.dashboard.editPaymentInfo,
                icon: Pencil,
                onSelect: openDialog,
              },
              {
                label: t.dashboard.removePaymentInfo,
                icon: Trash2,
                danger: true,
                onSelect: () => setConfirmingRemove(true),
              },
            ]}
          />
        )}
      </div>

      <p className="mt-5 text-sm text-muted-foreground">
        {t.dashboard.paymentQrHint}
      </p>

      <div className="mt-4">
        {hasPayment ? (
          <div className="flex flex-wrap items-start gap-4">
            <div className="relative size-28 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-white p-2">
              <SafeImage
                src={qrUrl}
                alt=""
                fill
                sizes="112px"
                unoptimized={qrUrl.startsWith("data:")}
                className="object-contain"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">
                {t.dashboard.paymentCodeLabel}
              </p>
              <div
                dir="ltr"
                className="rounded-lg border border-border/60 bg-surface-container-low px-3 py-2 font-mono text-sm break-all"
              >
                {code}
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openDialog}
            className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border py-8 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Plus className="size-6" />
            <span className="text-xs font-semibold">
              {t.dashboard.addPaymentInfo}
            </span>
          </button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hasPayment
                ? t.dashboard.editPaymentInfo
                : t.dashboard.addPaymentInfo}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {t.dashboard.paymentInfoRequiredHint}
          </p>

          <div className="mt-2 flex justify-center">
            {draftPreview ? (
              <div className="relative size-32 overflow-hidden rounded-xl border border-border/60 bg-white p-2">
                <SafeImage
                  src={draftPreview}
                  alt=""
                  fill
                  unoptimized
                  sizes="128px"
                  className="object-contain"
                />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-[11px] font-semibold text-white"
                >
                  {t.dashboard.replaceQrCode}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex size-32 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <Plus className="size-6" />
                <span className="text-xs font-semibold">
                  {t.dashboard.addQrCode}
                </span>
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="payment-code">{t.dashboard.paymentCodeLabel}</Label>
            <Input
              id="payment-code"
              dir="ltr"
              placeholder={t.dashboard.paymentCodePlaceholder}
              className="h-10 font-mono"
              value={draftCode}
              onChange={(e) => setDraftCode(e.target.value)}
            />
          </div>

          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={saving}
              onClick={closeDialog}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!canSave}
              loading={saving}
              onClick={confirmSave}
            >
              {t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmingRemove}
        onOpenChange={(open) =>
          !open && !removing && setConfirmingRemove(false)
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.dashboard.confirmRemovePaymentTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.dashboard.confirmRemovePaymentBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={removing}
              onClick={() => setConfirmingRemove(false)}
            >
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={removing}
              onClick={confirmRemove}
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/** A flat delivery charge, added to the cart total for delivery orders only.
 * The free-delivery switch is just `fee === 0` — there is no separate flag
 * to keep in sync with the number. */
/**
 * One toggle card per fulfillment mode, styled like a status row rather
 * than a form — flipping a switch is the whole interaction, gated by its
 * own confirm dialog instead of the edit-pencil/floating-save-bar pattern
 * (per owner request: toggle directly, confirm per action). Delivery gets
 * a dedicated dialog instead of a plain yes/no confirm, because turning it
 * on always has to carry a fee (even "free") in the same request — see
 * update.md §2.
 */
function FulfillmentSection({
  restaurant,
  isStore,
  t,
  save,
}: {
  restaurant: Restaurant;
  isStore: boolean;
  t: I18n["t"];
  save: SaveProfile;
}) {
  const [modes, setModes] = useState<Set<FulfillmentMode>>(
    () => new Set(getSupportedFulfillment(restaurant)),
  );
  const [fee, setFee] = useState(restaurant.deliveryFee ?? 0);
  // the amount a free-delivery toggle restores when switched back off —
  // never 0, or it would just toggle itself straight back on
  const lastFee = useRef(restaurant.deliveryFee || 5000);

  const [pending, setPending] = useState<{
    mode: FulfillmentMode;
    next: boolean;
  } | null>(null);
  const [applying, setApplying] = useState(false);

  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [draftFee, setDraftFee] = useState(fee);
  const [savingDelivery, setSavingDelivery] = useState(false);

  const requestToggle = (mode: FulfillmentMode, next: boolean) => {
    // dine-in has no meaning for a store — the switch is already disabled,
    // this is just the belt-and-suspenders guard
    if (mode === "dineIn" && isStore) return;
    if (mode === "delivery" && next) {
      setDraftFee(fee || lastFee.current);
      setDeliveryDialogOpen(true);
      return;
    }
    setPending({ mode, next });
  };

  const applyToggle = async () => {
    if (!pending) return;
    setApplying(true);
    try {
      const next = new Set(modes);
      if (pending.next) next.add(pending.mode);
      else next.delete(pending.mode);
      await save({ fulfillmentModes: [...next] });
      setModes(next);
      setPending(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setApplying(false);
    }
  };

  const confirmDelivery = async () => {
    setSavingDelivery(true);
    try {
      const next = new Set(modes).add("delivery");
      await save({ fulfillmentModes: [...next], deliveryFee: draftFee });
      setModes(next);
      setFee(draftFee);
      if (draftFee !== 0) lastFee.current = draftFee;
      setDeliveryDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setSavingDelivery(false);
    }
  };

  const cards: {
    mode: FulfillmentMode;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    title: string;
    desc: string;
    /** dine-in makes no sense for a store — shown but locked off instead
     * of hidden, so it's clear this isn't a bug, it's never available */
    locked?: boolean;
  }[] = [
    {
      mode: "delivery",
      icon: Bike,
      color: "bg-[#fb7185]",
      title: t.dashboard.deliveryModeTitle,
      desc: t.dashboard.deliveryModeDesc,
    },
    {
      mode: "pickup",
      icon: PackageOpen,
      color: "bg-[#22c55e]",
      title: t.dashboard.pickupModeTitle,
      desc: t.dashboard.pickupModeDesc,
    },
    {
      mode: "dineIn",
      icon: Armchair,
      color: "bg-[#3b82f6]",
      title: t.dashboard.dineInModeTitle,
      desc: t.dashboard.dineInModeDesc,
      locked: isStore,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="size-5 text-primary" />
        <h2 className="font-heading text-lg font-semibold">
          {t.dashboard.deliveryFeeTitle}
        </h2>
      </div>

      {cards.map((card) => {
        const enabled = modes.has(card.mode);
        return (
          <div
            key={card.mode}
            className={cn(
              "rounded-2xl border border-border/60 bg-card p-5",
              card.locked && "opacity-60",
            )}
          >
            <div className="flex items-center justify-between gap-4">
              {/* name+icon lead (the row's start side, i.e. the right in
                  RTL), the switch+status trails at the end — matching the
                  reference layout instead of the two swapped */}
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-14 shrink-0 items-center justify-center rounded-2xl text-white",
                    card.color,
                  )}
                >
                  <card.icon className="size-6" />
                </span>
                <div>
                  <p className="font-heading text-base font-bold">
                    {card.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {card.locked ? t.dashboard.dineInRestaurantOnlyHint : card.desc}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Switch
                  checked={enabled}
                  disabled={card.locked}
                  onCheckedChange={(v) => requestToggle(card.mode, v)}
                />
                <span
                  className={cn(
                    "text-sm font-bold",
                    card.locked
                      ? "text-muted-foreground"
                      : enabled
                        ? "text-success"
                        : "text-destructive",
                  )}
                >
                  {enabled ? t.dashboard.modeEnabled : t.dashboard.modeDisabled}
                </span>
              </div>
            </div>

            {/* the fee itself is editable from right here, not only at the
                moment delivery gets switched on */}
            {card.mode === "delivery" && enabled && (
              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setDraftFee(fee || lastFee.current);
                    setDeliveryDialogOpen(true);
                  }}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {t.common.edit}
                </button>
                <span className="text-sm font-semibold text-muted-foreground">
                  {t.dashboard.deliveryFeeLabel}:{" "}
                  <span className="font-bold text-foreground">
                    {fee === 0
                      ? t.dashboard.freeDelivery
                      : `${fee} ${t.common.currency}`}
                  </span>
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* dine-in / pickup, and turning delivery off — a plain yes/no confirm */}
      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => !open && !applying && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.next
                ? t.dashboard.confirmEnableModeTitle
                : t.dashboard.confirmDisableModeTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.next
                ? t.dashboard.confirmEnableModeBody
                : t.dashboard.confirmDisableModeBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying} onClick={() => setPending(null)}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction loading={applying} onClick={applyToggle}>
              {t.common.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* turning delivery on always carries a fee — free or priced — in the
          same request, so this is its own dialog instead of a bare confirm */}
      <Dialog
        open={deliveryDialogOpen}
        onOpenChange={(open) => !open && !savingDelivery && setDeliveryDialogOpen(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modes.has("delivery")
                ? t.dashboard.editDeliveryFeeTitle
                : t.dashboard.confirmEnableDeliveryTitle}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t.dashboard.deliveryFeeHint}
          </p>
          <label className="mt-4 flex items-center gap-2.5 text-sm font-semibold">
            <Switch
              checked={draftFee === 0}
              onCheckedChange={(v) => {
                if (v) {
                  if (draftFee !== 0) lastFee.current = draftFee;
                  setDraftFee(0);
                } else {
                  setDraftFee(lastFee.current);
                }
              }}
            />
            {t.dashboard.freeDelivery}
          </label>
          {draftFee !== 0 && (
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                dir="ltr"
                value={draftFee}
                onChange={(e) => setDraftFee(Number(e.target.value) || 0)}
                className="h-10 w-32"
              />
              <span className="text-sm text-muted-foreground">
                {t.common.currency}
              </span>
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={savingDelivery}
              onClick={() => setDeliveryDialogOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              className="flex-1"
              loading={savingDelivery}
              onClick={confirmDelivery}
            >
              {t.common.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function AppearanceSection({
  restaurant,
  t,
  save,
}: {
  restaurant: Restaurant;
  t: I18n["t"];
  save: SaveProfile;
}) {
  const [editing, setEditing] = useState(false);
  const [primary, setPrimary] = useState(restaurant.theme.primaryColor);
  const [secondary, setSecondary] = useState(restaurant.theme.secondaryColor);
  const snapshot = useRef({ primary, secondary });

  return (
    <ProfileSection
      title={t.dashboard.appearanceTab}
      icon={Palette}
      editing={editing}
      t={t}
      onEdit={() => {
        snapshot.current = { primary, secondary };
        setEditing(true);
      }}
      onSave={async () => {
        await save({ primaryColor: primary, secondaryColor: secondary });
        setEditing(false);
      }}
      onCancel={() => {
        setPrimary(snapshot.current.primary);
        setSecondary(snapshot.current.secondary);
        setEditing(false);
      }}
    >
      {/* the preview always sits below the color fields, never beside them
          — a fixed-width third column only fit this section back when it
          had the whole tab to itself; now it shares a half-width column
          with the social media card and a side-by-side row no longer has
          the room */}
      <div className="grid gap-6 sm:grid-cols-2">
        <ColorField
          id="p-primary"
          label={t.auth.primaryColorLabel}
          value={primary}
          onChange={setPrimary}
          disabled={!editing}
          presets={PRIMARY_COLOR_PRESETS}
        />
        <ColorField
          id="p-secondary"
          label={t.auth.secondaryColorLabel}
          value={secondary}
          onChange={setSecondary}
          disabled={!editing}
          presets={SECONDARY_COLOR_PRESETS}
        />
      </div>

      <div className="mt-6 sm:w-56">
        <p className="text-xs font-semibold text-muted-foreground">
          {t.auth.previewDishName}
        </p>
        <div className="mt-2 overflow-hidden rounded-xl border border-border/60">
          <div
            className="flex items-center justify-between px-4 py-3.5 text-white"
            style={{ backgroundColor: primary }}
          >
            <span className="truncate font-heading text-sm font-bold">
              {restaurant.name.ar}
            </span>
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold"
              style={{ backgroundColor: secondary, color: "#2c1600" }}
            >
              {t.menu.popular}
            </span>
          </div>
          <div className="flex items-center justify-between bg-background px-4 py-3">
            <span className="text-xs font-semibold">
              {t.auth.previewDishName}
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: primary }}
              dir="ltr"
            >
              45,000 {t.common.currency}
            </span>
          </div>
        </div>
      </div>
    </ProfileSection>
  );
}

/**
 * The same "how to reach your agent" card shows on both the subscription
 * tab (where the activation came from) and the dedicated support page
 * (where it's the whole point) — one component so the two never drift.
 */
/** Renders a `{agentName}`-templated dictionary string with the agent's
 * name in bold — `fmt` alone only produces plain text, and this is the
 * one spot on the page that needs the name itself to stand out. */
function renderAgentNotice(
  template: string,
  agentName: string,
  region: string,
) {
  const [before, after] = template.split("{agentName}");
  return (
    <>
      {before && fmt(before, { region })}
      <strong className="font-extrabold">{agentName}</strong>
      {after && fmt(after, { region })}
    </>
  );
}

/** Joins an agent's one or two region names — falls back to "" so callers
 * can decide what to show (the governorate name, usually) when regions
 * haven't loaded yet or none resolve. */
function agentRegionNames(
  agent: BusinessAgent,
  regions: Region[] | undefined,
  lang: I18n["lang"],
): string {
  // defensive against the backend not having shipped the regionIds array
  // yet (still sending the old singular regionId, or nothing at all) —
  // see update.md
  const ids =
    agent.regionIds ??
    (typeof (agent as { regionId?: string }).regionId === "string"
      ? [(agent as { regionId?: string }).regionId as string]
      : []);
  return ids
    .map((id) => regions?.find((r) => r.id === id)?.name[lang])
    .filter((name): name is string => !!name)
    .join(lang === "ar" ? " و" : " & ");
}

function AgentContactCard({
  agent,
  governorates,
  regions,
  t,
  lang,
}: {
  agent: BusinessAgent;
  governorates?: Governorate[];
  regions?: Region[];
  t: I18n["t"];
  lang: I18n["lang"];
}) {
  const governorateName = governorates?.find((g) => g.id === agent.governorateId)
    ?.name[lang];
  const regionName = agentRegionNames(agent, regions, lang);
  const location = [governorateName, regionName].filter(Boolean).join(
    lang === "ar" ? "، " : ", ",
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
        <User className="size-5 text-primary" />
        {t.dashboard.yourAgentTitle}
      </h2>

      <div className="mt-4 flex items-center gap-3">
        {agent.photoUrl ? (
          <SafeImage
            src={agent.photoUrl}
            alt=""
            width={48}
            height={48}
            unoptimized={agent.photoUrl.startsWith("data:")}
            className="size-12 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <User className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{agent.name}</p>
          {location && (
            <p className="truncate text-sm text-muted-foreground">{location}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`tel:${agent.phone.replace(/\s/g, "")}`}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Phone className="size-4" />
          {t.restaurant.call}
        </a>
        <a
          href={`https://wa.me/${agent.whatsapp.replace(/[+\s]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#1fb855]"
        >
          <WhatsAppIcon className="size-4" />
          {t.restaurant.chat}
        </a>
        {agent.facebook && (
          <a
            href={`https://facebook.com/${agent.facebook}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-9 items-center justify-center rounded-full bg-[#1877F2]/10 text-[#1462c4] transition-colors hover:bg-[#1877F2]/20 dark:text-[#6ba8f5]"
            aria-label={t.restaurant.facebook}
          >
            <FacebookIcon className="size-4" />
          </a>
        )}
        {agent.instagram && (
          <a
            href={`https://instagram.com/${agent.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-9 items-center justify-center rounded-full bg-gradient-to-r from-[#f9ce34]/15 via-[#ee2a7b]/15 to-[#6228d7]/15 text-[#c13584] transition-colors hover:from-[#f9ce34]/25 hover:via-[#ee2a7b]/25 hover:to-[#6228d7]/25"
            aria-label={t.restaurant.instagram}
          >
            <InstagramIcon className="size-4" />
          </a>
        )}
      </div>
    </div>
  );
}

function SubscriptionSection({
  restaurant,
  governorates,
  regions,
  t,
  lang,
}: {
  restaurant: Restaurant;
  governorates?: Governorate[];
  regions?: Region[];
  t: I18n["t"];
  lang: I18n["lang"];
}) {
  const [renewing, setRenewing] = useState(false);
  const { data: plans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: getSubscriptionPlans,
  });

  const renew = async () => {
    const planId = plans[0]?.id;
    if (!planId) return;
    setRenewing(true);
    try {
      await createSubscriptionRequest({ planId });
      toast.success(t.admin.renewalRequested);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : t.common.saveFailed,
      );
    } finally {
      setRenewing(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SY" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(restaurant.planExpiresAt).getTime() - new Date().getTime()) /
        86_400_000,
    ),
  );
  const agent = restaurant.agent;

  return (
    <div className="space-y-5">
      {agent && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-sm font-semibold">
            {renderAgentNotice(
              t.dashboard.subscriptionByAgentNotice,
              agent.name,
              agentRegionNames(agent, regions, lang) ||
                governorates?.find((g) => g.id === agent.governorateId)
                  ?.name[lang] ||
                "",
            )}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t.dashboard.subscriptionAgentContactHint}
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
          <Crown className="size-5 text-primary" />
          {t.dashboard.planTab}
        </h2>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-zest-soft text-zest-soft-foreground">
              <Crown className="size-6" />
            </span>
            <p className="flex items-center gap-2 font-heading font-bold">
              {restaurant.planName || t.dashboard.defaultPlanName}
              <Badge
                className={cn(
                  restaurant.status === "active"
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {t.common[restaurant.status]}
              </Badge>
            </p>
          </div>
          {!agent && (
            <Button
              className="min-w-36"
              onClick={() => void renew()}
              disabled={renewing || plans.length === 0}
            >
              {t.dashboard.renewPlan}
            </Button>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {t.dashboard.daysRemaining}
            </p>
            <p className="mt-0.5 text-base font-bold" dir="ltr">
              {daysRemaining}
            </p>
          </div>
          <div className="rounded-xl bg-muted/40 px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {t.dashboard.planStarted}
            </p>
            <p className="mt-0.5 text-sm font-bold">
              {restaurant.planStartedAt
                ? formatDate(restaurant.planStartedAt)
                : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-muted/40 px-4 py-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {t.dashboard.planEnds}
            </p>
            <p className="mt-0.5 text-sm font-bold">
              {formatDate(restaurant.planExpiresAt)}
            </p>
          </div>
        </div>
      </div>

      {agent && (
        <AgentContactCard
          agent={agent}
          governorates={governorates}
          regions={regions}
          t={t}
          lang={lang}
        />
      )}
    </div>
  );
}

/**
 * The account's one line to Menu Syria support — but there is no Menu
 * Syria support contact here, deliberately: the agent who onboarded this
 * business owns that relationship, so this page points there instead of
 * duplicating (or competing with) the subscription tab's own agent card.
 * Exported: this is its own sidebar page now, not a settings tab, so a
 * standalone route renders it directly.
 */
export function SupportSection({
  restaurant,
  governorates,
  regions,
  t,
  lang,
}: {
  restaurant: Restaurant;
  governorates?: Governorate[];
  regions?: Region[];
  t: I18n["t"];
  lang: I18n["lang"];
}) {
  const agent = restaurant.agent;
  const region =
    (agent && agentRegionNames(agent, regions, lang)) ||
    governorates?.find((g) => g.id === agent?.governorateId)?.name[lang] ||
    "";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
          <LifeBuoy className="size-5 text-primary" />
          {t.dashboard.supportTab}
        </h2>
        {agent ? (
          <p className="mt-4 w-fit max-w-full rounded-2xl bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary">
            {renderAgentNotice(t.dashboard.supportActivatedByAgent, agent.name, region)}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {t.dashboard.supportNoAgentHint}
          </p>
        )}
      </div>

      {agent && (
        <AgentContactCard
          agent={agent}
          governorates={governorates}
          regions={regions}
          t={t}
          lang={lang}
        />
      )}
    </div>
  );
}

export function BusinessProfile() {
  const { t, lang } = useI18n();
  const businessType = useAuthStore(
    (s) => s.session?.businessType ?? "restaurant",
  );
  const isStore = businessType === "store";

  const { data: restaurant } = useQuery({
    queryKey: queryKeys.me.business,
    queryFn: getMyRestaurant,
  });
  const { data: governorates } = useQuery({
    queryKey: queryKeys.governorates,
    queryFn: getGovernorates,
  });
  const { data: regions } = useQuery({
    queryKey: queryKeys.regions,
    queryFn: getRegions,
  });

  // the id is only known once the business has loaded; the mutation is
  // created unconditionally so the hook order never depends on that
  const { save } = useBusinessProfileMutations(restaurant?.id ?? "");

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [confirmingDeleteLogo, setConfirmingDeleteLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);

  const [activeTab, setActiveTab] = useState("account");
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
  const hasUnsavedChanges = editingIds.size > 0;
  const registerEditing = useCallback((id: string, editing: boolean) => {
    setEditingIds((prev) => {
      if (prev.has(id) === editing) return prev;
      const next = new Set(prev);
      if (editing) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);
  // a fresh `{ registerEditing }` object on every render was changing
  // `ctx` by reference even when nothing meaningful did — every mounted
  // ProfileSection's effect depends on `ctx`, so each one re-ran, called
  // this again, which re-rendered this component, which made a new object
  // again: React error #185 (max update depth) the moment any section's
  // own `editing` state actually changed
  const editingGuardValue = useMemo(
    () => ({ registerEditing }),
    [registerEditing],
  );

  // closing the tab, refreshing, or typing a new URL — the browser's own
  // prompt is the only one that can actually block that, a custom toast
  // can't run once navigation has already started
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  if (!restaurant) return <LoadingSpinner />;

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${lang}/${restaurant.slug}/menu`
      : "";

  const locationLabel = [
    governorates?.find((g) => g.id === restaurant.governorateId)?.name[lang],
    regions?.find((r) => r.id === restaurant.regionId)?.name[lang],
  ]
    .filter(Boolean)
    .join(lang === "ar" ? "، " : ", ");

  const pickLogo = (file: File | undefined) => {
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const confirmLogo = async () => {
    if (logoFile) {
      setIsSavingLogo(true);
      let url: string;
      try {
        ({ url } = await uploadImage(logoFile, "businesses"));
      } catch (error) {
        // the upload itself has no mutation to toast for it
        toast.error(
          error instanceof ApiError ? error.message : t.common.saveFailed,
        );
        setIsSavingLogo(false);
        return;
      }
      try {
        await save({ logo: url });
      } catch {
        // the mutation's own onError already toasted — keep the preview
        // open so the owner can retry the save
        setIsSavingLogo(false);
        return;
      }
      setIsSavingLogo(false);
    }
    setLogoPreview(null);
    setLogoFile(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const cancelLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const logoFileName = qrFileName([
    isStore ? t.common.storeWord : t.common.restaurantWord,
    restaurant.name[lang],
  ]);

  // a plain `<a download>` only works same-origin — logos now live on
  // Cloudinary (cross-origin), so the browser ignores `download` there and
  // just opens the image in a new tab instead. Fetching it as a blob first
  // works regardless of origin.
  const downloadLogo = async () => {
    if (!restaurant.logoUrl) return;
    try {
      const response = await fetch(restaurant.logoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = logoFileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    }
  };

  const confirmDeleteLogo = async () => {
    setRemovingLogo(true);
    try {
      await save({ logo: "" });
      setConfirmingDeleteLogo(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setRemovingLogo(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success(t.common.copied);
  };

  const shareProfile = async () => {
    if (navigator.share) {
      await navigator
        .share({ title: restaurant.name[lang], url: publicUrl })
        .catch(() => {});
    } else {
      await copyLink();
    }
  };

  return (
    <EditingGuardContext.Provider value={editingGuardValue}>
      <div className="space-y-6">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label={t.dashboard.viewPhoto}
                onClick={() => setPhotoViewerOpen(true)}
                className="block rounded-2xl"
              >
                <SafeImage
                  src={restaurant.logoUrl}
                  alt=""
                  width={112}
                  height={112}
                  // a freshly picked logo is a data URL, which next/image cannot optimise
                  unoptimized={
                    typeof restaurant.logoUrl === "string" &&
                    restaurant.logoUrl.startsWith("data:")
                  }
                  className="size-16 rounded-2xl border border-border object-cover sm:size-24 md:size-28"
                />
              </button>
              <button
                type="button"
                aria-label={t.dashboard.updatePhoto}
                onClick={() => logoInputRef.current?.click()}
                className="absolute bottom-0 end-0 flex size-6 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground sm:size-8"
              >
                <Camera className="size-3.5 sm:size-4" />
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => pickLogo(e.target.files?.[0])}
              />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-lg font-bold sm:text-xl md:text-2xl">
                {restaurant.name[lang]}
              </h1>
              {locationLabel && (
                <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{locationLabel}</span>
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label="⋯"
                />
              }
            >
              <MoreVertical className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-64">
              <DropdownMenuItem
                render={
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <User className="size-4" />
                {t.dashboard.viewAsPublic}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => logoInputRef.current?.click()}>
                <Camera className="size-4" />
                {t.dashboard.updatePhoto}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={copyLink}>
                <Link2 className="size-4" />
                {t.dashboard.copyProfileLink}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={shareProfile}>
                <Share2 className="size-4" />
                {t.dashboard.shareProfile}
              </DropdownMenuItem>
              <DropdownMenuItem render={<a href={`/${lang}/dashboard/qr`} />}>
                <QrCode className="size-4" />
                {t.dashboard.showQrCode}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="size-4" />
                {t.dashboard.printProfile}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ImagePreviewDialog
          src={logoPreview}
          onConfirm={confirmLogo}
          onCancel={cancelLogo}
          confirming={isSavingLogo}
          t={t}
        />

        <ProfilePhotoViewer
          open={photoViewerOpen}
          onOpenChange={setPhotoViewerOpen}
          src={restaurant.logoUrl}
          onChangeClick={() => {
            setPhotoViewerOpen(false);
            logoInputRef.current?.click();
          }}
          onSaveClick={() => void downloadLogo()}
          onDeleteClick={() => {
            setPhotoViewerOpen(false);
            setConfirmingDeleteLogo(true);
          }}
        />

        <AlertDialog
          open={confirmingDeleteLogo}
          onOpenChange={(open) => !open && !removingLogo && setConfirmingDeleteLogo(false)}
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
                disabled={removingLogo}
                onClick={() => setConfirmingDeleteLogo(false)}
              >
                {t.common.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                loading={removingLogo}
                onClick={() => void confirmDeleteLogo()}
              >
                {t.common.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* sections */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (hasUnsavedChanges) {
              toast.warning(t.dashboard.unsavedChangesBlockSwitch);
              return;
            }
            setActiveTab(value);
          }}
          className="gap-6"
        >
          <div className="scrollbar-none overflow-x-auto">
            <TabsList className="w-max flex-nowrap rounded-xl p-2 group-data-horizontal/tabs:h-14">
              <TabsTrigger
                value="account"
                className="shrink-0 rounded-lg px-6 py-2.5 font-semibold"
              >
                {t.dashboard.accountInfoTab}
              </TabsTrigger>
              <TabsTrigger
                value="delivery"
                className="shrink-0 rounded-lg px-6 py-2.5 font-semibold"
              >
                {t.dashboard.deliveryPaymentTab}
              </TabsTrigger>
              <TabsTrigger
                value="gallery"
                className="shrink-0 rounded-lg px-6 py-2.5 font-semibold"
              >
                {t.restaurant.gallery}
              </TabsTrigger>
              <TabsTrigger
                value="appearance"
                className="shrink-0 rounded-lg px-6 py-2.5 font-semibold"
              >
                {t.dashboard.appearanceSocialTab}
              </TabsTrigger>
              <TabsTrigger
                value="plan"
                className="shrink-0 rounded-lg px-6 py-2.5 font-semibold"
              >
                {t.dashboard.planTab}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="account">
            <SectionErrorBoundary key={activeTab}>
              <AccountInfoSection
                restaurant={restaurant}
                isStore={isStore}
                t={t}
                lang={lang}
                save={save}
              />
            </SectionErrorBoundary>
          </TabsContent>
          <TabsContent value="delivery">
            {/* fulfillment cards lead (the start side), the payment card
                beside them — unchanged internally, just repositioned */}
            <SectionErrorBoundary key={activeTab}>
              <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0">
                <FulfillmentSection
                  restaurant={restaurant}
                  isStore={isStore}
                  t={t}
                  save={save}
                />
                <PaymentQrSection restaurant={restaurant} t={t} save={save} />
              </div>
            </SectionErrorBoundary>
          </TabsContent>
          <TabsContent value="gallery">
            <SectionErrorBoundary key={activeTab}>
              <GallerySection restaurant={restaurant} t={t} save={save} />
            </SectionErrorBoundary>
          </TabsContent>
          <TabsContent value="appearance">
            {/* social media first, appearance below it — side by side as two
              columns from the laptop breakpoint up, stacked with a small
              gap on narrower screens */}
            <SectionErrorBoundary key={activeTab}>
              <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5 lg:space-y-0">
                <SocialMediaSection restaurant={restaurant} t={t} save={save} />
                <AppearanceSection restaurant={restaurant} t={t} save={save} />
              </div>
            </SectionErrorBoundary>
          </TabsContent>
          <TabsContent value="plan">
            <SectionErrorBoundary key={activeTab}>
              <SubscriptionSection
                restaurant={restaurant}
                governorates={governorates}
                regions={regions}
                t={t}
                lang={lang}
              />
            </SectionErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </EditingGuardContext.Provider>
  );
}
