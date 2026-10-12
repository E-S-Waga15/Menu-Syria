"use client";

import { useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  CalendarClock,
  Check,
  Crown,
  Globe,
  Image as ImageIcon,
  Link2,
  MapPin,
  MoreVertical,
  Palette,
  Pencil,
  Plus,
  Printer,
  QrCode,
  Share2,
  Truck,
  User,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";

import { ColorField } from "@/components/shared/color-field";
import { GoogleLocationPicker } from "@/components/shared/google-location-picker";
import { GovernorateRegionSelect } from "@/components/shared/governorate-region-select";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { PendingChangesBar } from "@/components/shared/pending-changes-bar";
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/features/auth/store";
import { getGovernorates, getRegions, getSubscriptionPlans } from "@/features/marketing/services";
import { createSubscriptionRequest } from "@/features/subscription-requests/services";
import { useBusinessProfileMutations } from "@/features/restaurant-dashboard/hooks/use-business-profile";
import { getMyRestaurant } from "@/features/restaurant-dashboard/services";
import type { BusinessProfileInput } from "@/features/restaurant-dashboard/services";
import { fmt, useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import { uploadImage } from "@/lib/api/upload";
import { recoverBusinessFields } from "@/lib/business-text";
import type { Restaurant } from "@/lib/types";
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
type SaveProfile = (input: BusinessProfileInput) => void;

/**
 * The contact and the social section both own phone numbers, and the API
 * replaces the whole list on write — so the list is built from the business's
 * current values in one place. Without this, saving one section would silently
 * drop the number the other section looks after.
 */
function phoneRows(phone: string, whatsapp: string) {
  return [
    phone ? { type: "mobile", number: phone } : null,
    whatsapp ? { type: "whatsapp", number: whatsapp } : null,
  ].filter((row): row is { type: string; number: string } => row !== null);
}

/**
 * Card wrapper every section shares: a title, an "Edit" trigger while at
 * rest, and — once the section is being edited — a floating save/discard bar
 * (the same fixed pill the storefront cart uses) instead of a quiet dropdown
 * item, because an edit here changes what customers see the moment it's
 * saved. Both Save and Discard go through their own confirm dialog first.
 */
function ProfileSection({
  title,
  icon: Icon,
  editing,
  onEdit,
  onSave,
  onCancel,
  editable = true,
  children,
  t,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  editable?: boolean;
  children: React.ReactNode;
  t: I18n["t"];
}) {
  const [confirmAction, setConfirmAction] = useState<"save" | "discard" | null>(
    null,
  );

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
          <Icon className="size-5 text-primary" />
          {title}
        </h2>
        {editable && !editing && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.common.edit}
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
        )}
      </div>
      <div className="mt-5">{children}</div>

      {editable && editing && (
        <PendingChangesBar
          message={t.dashboard.unsavedChanges}
          saveLabel={t.dashboard.saveChanges}
          discardLabel={t.dashboard.discardChanges}
          onSave={() => setConfirmAction("save")}
          onDiscard={() => setConfirmAction("discard")}
        />
      )}

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "save"
                ? t.dashboard.confirmSaveChangesTitle
                : t.dashboard.confirmDiscardChangesTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "save"
                ? t.dashboard.confirmSaveChangesBody
                : t.dashboard.confirmDiscardChangesBody}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmAction(null)}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={confirmAction === "discard" ? "destructive" : "default"}
              onClick={() => {
                if (confirmAction === "save") onSave();
                else onCancel();
                setConfirmAction(null);
              }}
            >
              {confirmAction === "save" ? t.common.save : t.dashboard.discardChanges}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/** Confirms an image before it's actually applied: pick a file → preview it
 * here → "تأكيد" commits, "إلغاء" discards and re-opens nothing. */
function ImagePreviewDialog({
  src,
  onConfirm,
  onCancel,
  t,
}: {
  src: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  t: I18n["t"];
}) {
  return (
    <Dialog open={!!src} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t.dashboard.previewPhotoTitle}</DialogTitle>
        </DialogHeader>
        {src && (
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/60">
            <SafeImage src={src} alt="" fill unoptimized className="object-cover" />
          </div>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            {t.common.cancel}
          </Button>
          <Button type="button" className="flex-1" onClick={onConfirm}>
            {t.common.confirm}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

  // a request approved before the backend had dedicated columns for these
  // left its logo/colors/address/location dumped as text inside
  // `description` — recovered here so the owner sees (and can re-save) the
  // real values instead of that raw dump
  const recovered = recoverBusinessFields(restaurant.description[lang]);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(restaurant.name[lang]);
  const [description, setDescription] = useState(recovered.description);
  const [specialty, setSpecialty] = useState(restaurant.cuisine[lang]);
  const [phone, setPhone] = useState(restaurant.phone);
  const [address, setAddress] = useState(
    restaurant.address[lang] || recovered.address || "",
  );
  const [governorateId, setGovernorateId] = useState(restaurant.governorateId);
  const [regionId, setRegionId] = useState(restaurant.regionId);
  const [lat, setLat] = useState(
    recovered.location?.lat ?? restaurant.location.lat,
  );
  const [lng, setLng] = useState(
    recovered.location?.lng ?? restaurant.location.lng,
  );
  const [mapOpen, setMapOpen] = useState(false);
  const snapshot = useRef({
    name,
    description,
    specialty,
    phone,
    address,
    governorateId,
    regionId,
    lat,
    lng,
  });

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
          description,
          specialty,
          phone,
          address,
          governorateId,
          regionId,
          lat,
          lng,
        };
        setEditing(true);
      }}
      onSave={() => {
        save({
          name,
          description,
          // a store's "specialty" is its business type, which the platform
          // assigns — only a food business has an editable cuisine
          ...(isStore ? {} : { cuisineType: specialty }),
          address,
          // the region is the district row the API stores; the governorate is
          // derived from it, so it is not sent separately
          districtId: regionId || undefined,
          latitude: lat,
          longitude: lng,
          // the social section owns the WhatsApp number, so it is carried
          // across rather than cleared by writing this section alone
          phones: phoneRows(phone, restaurant.whatsapp),
        });
        setEditing(false);
      }}
      onCancel={() => {
        setName(snapshot.current.name);
        setDescription(snapshot.current.description);
        setSpecialty(snapshot.current.specialty);
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
          <Label htmlFor="p-specialty">
            {isStore
              ? t.dashboard.categorySpecialtyLabel
              : t.dashboard.cuisineLabel}
          </Label>
          <Input
            id="p-specialty"
            className="h-11"
            disabled={!editing}
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
        </div>
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
      onSave={() => {
        save({
          // the contact section owns the primary phone, so it rides along
          phones: phoneRows(restaurant.phone, whatsapp),
          // an emptied field removes the link rather than storing a blank one
          socialLinks: [
            instagram ? { platform: "instagram", url: instagram } : null,
            facebook ? { platform: "facebook", url: facebook } : null,
          ].filter((link): link is { platform: string; url: string } =>
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
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="p-wa">{t.auth.whatsappLabel}</Label>
          <Input
            id="p-wa"
            dir="ltr"
            className="h-11"
            disabled={!editing}
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-ig">{t.auth.instagramLabel}</Label>
          <Input
            id="p-ig"
            dir="ltr"
            className="h-11"
            disabled={!editing}
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <Label htmlFor="p-fb">{t.auth.facebookLabel}</Label>
        <Input
          id="p-fb"
          dir="ltr"
          className="h-11"
          disabled={!editing}
          value={facebook}
          onChange={(e) => setFacebook(e.target.value)}
        />
      </div>
    </ProfileSection>
  );
}

function GallerySection({
  restaurant,
  t,
  save,
}: {
  restaurant: Restaurant;
  t: I18n["t"];
  save: SaveProfile;
}) {
  const [editing, setEditing] = useState(false);
  const [images, setImages] = useState(restaurant.coverImages);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const snapshot = useRef(images);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickImage = (file: File | undefined) => {
    if (!file) return;
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const confirmImage = async () => {
    if (pendingFile) {
      try {
        const { url } = await uploadImage(pendingFile, "businesses");
        setImages((prev) => [...prev, url]);
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
      }
    }
    setPendingImage(null);
    setPendingFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const cancelImage = () => {
    setPendingImage(null);
    setPendingFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <ProfileSection
      title={t.restaurant.gallery}
      icon={ImageIcon}
      editing={editing}
      t={t}
      onEdit={() => {
        snapshot.current = images;
        setEditing(true);
      }}
      onSave={() => {
        save({ images });
        setEditing(false);
      }}
      onCancel={() => {
        setImages(snapshot.current);
        setEditing(false);
      }}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
            {editing && (
              <button
                type="button"
                aria-label={t.dashboard.removePhoto}
                onClick={() =>
                  setImages((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="absolute top-2 end-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        ))}
        {editing && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Plus className="size-6" />
            <span className="text-xs font-semibold">
              {t.dashboard.addPhoto}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => pickImage(e.target.files?.[0])}
            />
          </button>
        )}
      </div>

      <ImagePreviewDialog
        src={pendingImage}
        onConfirm={confirmImage}
        onCancel={cancelImage}
        t={t}
      />
    </ProfileSection>
  );
}

/**
 * The Sham Cash transfer QR shown to customers at checkout. One image, not a
 * gallery — uploaded straight to `paymentQrCode`, which rides the business's
 * existing PATCH rather than a route of its own; an empty string clears it.
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
  const [editing, setEditing] = useState(false);
  const [qrUrl, setQrUrl] = useState(restaurant.paymentQrCode ?? "");
  const [uploading, setUploading] = useState(false);
  const snapshot = useRef(qrUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickQr = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file, "businesses");
      setQrUrl(url);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <ProfileSection
      title={t.dashboard.paymentQrTitle}
      icon={QrCode}
      editing={editing}
      t={t}
      onEdit={() => {
        snapshot.current = qrUrl;
        setEditing(true);
      }}
      onSave={() => {
        save({ paymentQrCode: qrUrl });
        setEditing(false);
      }}
      onCancel={() => {
        setQrUrl(snapshot.current);
        setEditing(false);
      }}
    >
      <p className="text-sm text-muted-foreground">{t.dashboard.paymentQrHint}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {qrUrl ? (
          <div className="relative size-32 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-white p-2">
            <SafeImage
              src={qrUrl}
              alt=""
              fill
              sizes="128px"
              unoptimized={qrUrl.startsWith("data:")}
              className="object-contain"
            />
            {editing && (
              <button
                type="button"
                aria-label={t.dashboard.removeQrCode}
                onClick={() => setQrUrl("")}
                className="absolute top-1 end-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex size-32 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground">
            <QrCode className="size-8" />
          </div>
        )}

        {editing ? (
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {qrUrl ? t.dashboard.replaceQrCode : t.dashboard.addQrCode}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => void pickQr(e.target.files?.[0])}
            />
          </div>
        ) : (
          !qrUrl && (
            <p className="text-sm text-muted-foreground">
              {t.dashboard.noQrCode}
            </p>
          )
        )}
      </div>
    </ProfileSection>
  );
}

/** A flat delivery charge, added to the cart total for delivery orders only.
 * The free-delivery switch is just `fee === 0` — there is no separate flag
 * to keep in sync with the number. */
function DeliveryFeeSection({
  restaurant,
  t,
  save,
}: {
  restaurant: Restaurant;
  t: I18n["t"];
  save: SaveProfile;
}) {
  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState(restaurant.deliveryFee ?? 0);
  // the amount the switch restores when turned back off — never 0, or
  // toggling free delivery off would just toggle it straight back on
  const lastFee = useRef(restaurant.deliveryFee || 5000);
  const snapshot = useRef(fee);

  return (
    <ProfileSection
      title={t.dashboard.deliveryFeeTitle}
      icon={Truck}
      editing={editing}
      t={t}
      onEdit={() => {
        snapshot.current = fee;
        setEditing(true);
      }}
      onSave={() => {
        save({ deliveryFee: fee });
        setEditing(false);
      }}
      onCancel={() => {
        setFee(snapshot.current);
        setEditing(false);
      }}
    >
      <p className="text-sm text-muted-foreground">
        {t.dashboard.deliveryFeeHint}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2.5 text-sm font-semibold">
          <Switch
            checked={fee === 0}
            disabled={!editing}
            onCheckedChange={(v) => {
              if (v) {
                if (fee !== 0) lastFee.current = fee;
                setFee(0);
              } else {
                setFee(lastFee.current);
              }
            }}
          />
          {t.dashboard.freeDelivery}
        </label>
        {fee !== 0 && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              dir="ltr"
              disabled={!editing}
              value={fee}
              onChange={(e) => setFee(Number(e.target.value) || 0)}
              className="h-10 w-32"
            />
            <span className="text-sm text-muted-foreground">
              {t.common.currency}
            </span>
          </div>
        )}
      </div>
    </ProfileSection>
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
      onSave={() => {
        save({ primaryColor: primary, secondaryColor: secondary });
        setEditing(false);
      }}
      onCancel={() => {
        setPrimary(snapshot.current.primary);
        setSecondary(snapshot.current.secondary);
        setEditing(false);
      }}
    >
      <div className="grid gap-6 md:grid-cols-[1fr_1fr_auto] md:items-start">
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

        <div className="md:row-span-2 md:w-56">
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
      </div>
    </ProfileSection>
  );
}

function SubscriptionSection({
  restaurant,
  t,
  lang,
}: {
  restaurant: Restaurant;
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
      toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
    } finally {
      setRenewing(false);
    }
  };

  return (
    <ProfileSection
      title={t.dashboard.planTab}
      icon={Crown}
      editing={false}
      editable={false}
      t={t}
      onEdit={() => { }}
      onSave={() => { }}
      onCancel={() => { }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-xl bg-zest-soft text-zest-soft-foreground">
            <Crown className="size-6" />
          </span>
          <div>
            <p className="flex items-center gap-2 font-heading font-bold">
              Premium
              <Badge className="bg-success/10 text-success">
                {t.common.active}
              </Badge>
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="size-4" />
              {fmt(t.dashboard.planExpires, {
                date: new Date(restaurant.planExpiresAt).toLocaleDateString(
                  lang === "ar" ? "ar-SY" : "en-US",
                  { year: "numeric", month: "long", day: "numeric" },
                ),
              })}
            </p>
          </div>
        </div>
        <Button
          className="min-w-36"
          onClick={() => void renew()}
          disabled={renewing || plans.length === 0}
        >
          {t.dashboard.renewPlan}
        </Button>
      </div>
    </ProfileSection>
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
  const logoInputRef = useRef<HTMLInputElement>(null);

  if (!restaurant) return <LoadingSpinner />;

  const basePath = isStore ? "store" : "menu";
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${lang}/${basePath}/${restaurant.slug}`
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
      try {
        const { url } = await uploadImage(logoFile, "businesses");
        save({ logo: url });
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : t.common.saveFailed);
      }
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

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success(t.common.copied);
  };

  const shareProfile = async () => {
    if (navigator.share) {
      await navigator
        .share({ title: restaurant.name[lang], url: publicUrl })
        .catch(() => { });
    } else {
      await copyLink();
    }
  };

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
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
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" />
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
        t={t}
      />

      {/* sections */}
      <Tabs defaultValue="account" className="gap-6">
        <div className="scrollbar-none overflow-x-auto">
          <TabsList className="w-max flex-nowrap rounded-xl p-2 group-data-horizontal/tabs:h-14">
            <TabsTrigger
              value="account"
              className="shrink-0 rounded-lg px-6 py-2.5 font-semibold"
            >
              {t.dashboard.accountInfoTab}
            </TabsTrigger>
            <TabsTrigger
              value="paymentQr"
              className="shrink-0 rounded-lg px-6 py-2.5 font-semibold"
            >
              {t.dashboard.paymentQrTab}
            </TabsTrigger>
            <TabsTrigger
              value="delivery"
              className="shrink-0 rounded-lg px-6 py-2.5 font-semibold"
            >
              {t.dashboard.deliveryTab}
            </TabsTrigger>
            <TabsTrigger
              value="social"
              className="shrink-0 rounded-lg px-6 py-2.5 font-semibold"
            >
              {t.dashboard.socialMediaTab}
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
              {t.dashboard.appearanceTab}
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
          <AccountInfoSection
            restaurant={restaurant}
            isStore={isStore}
            t={t}
            lang={lang}
            save={save}
          />
        </TabsContent>
        <TabsContent value="paymentQr">
          <PaymentQrSection restaurant={restaurant} t={t} save={save} />
        </TabsContent>
        <TabsContent value="delivery">
          <DeliveryFeeSection restaurant={restaurant} t={t} save={save} />
        </TabsContent>
        <TabsContent value="social">
          <SocialMediaSection restaurant={restaurant} t={t} save={save} />
        </TabsContent>
        <TabsContent value="gallery">
          <GallerySection restaurant={restaurant} t={t} save={save} />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceSection restaurant={restaurant} t={t} save={save} />
        </TabsContent>
        <TabsContent value="plan">
          <SubscriptionSection restaurant={restaurant} t={t} lang={lang} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
