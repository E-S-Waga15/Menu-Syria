"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  Lock,
  MapPin,
  Plus,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "@/lib/toast";

import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
} from "@/components/shared/brand-icons";
import { ColorField } from "@/components/shared/color-field";
import { FieldError } from "@/components/shared/field-error";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { GoogleLocationPicker } from "@/components/shared/google-location-picker";
import { GovernorateRegionSelect } from "@/components/shared/governorate-region-select";
import { PasswordInput } from "@/components/shared/password-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  registerStepFields,
  registerWizardSchema,
  type RegisterWizardValues,
} from "@/features/auth/schemas";
import {
  getBusinessSubTypes,
  getGovernorates,
  getRegions,
} from "@/features/marketing/services";
import { submitRegistrationRequest } from "@/features/auth/api";
import { ApiError } from "@/lib/api/client";
import { uploadImage } from "@/lib/api/upload";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import { useNavigationLoading } from "@/providers/navigation-loading";
import { cn } from "@/lib/utils";

/** paired primary/secondary palettes seen often on restaurant menus */
const colorPresets: { primary: string; secondary: string }[] = [
  { primary: "#850036", secondary: "#fe9800" },
  { primary: "#0c4a6e", secondary: "#f59e0b" },
  { primary: "#14532d", secondary: "#eab308" },
  { primary: "#3f2212", secondary: "#c98747" },
  { primary: "#581c87", secondary: "#f472b6" },
  { primary: "#7a2810", secondary: "#e8a13c" },
];

/** matches the 44px fields next to it (GovernorateRegionSelect's FIELD) */
const SELECT_FIELD = "h-11! w-full gap-2 pe-3.5 ps-4 text-sm";
/** caps the open list so 24+ business types scroll instead of pushing the
 * page down; overrides the default available-height-based max-height */
const SELECT_CONTENT = "max-h-72";

/** the backend only returns an Arabic `name` — this translates the stable
 * `slug` for English, falling back to that name for anything unmapped */
const SUB_TYPE_EN_LABELS: Record<string, string> = {
  "general-restaurant": "General restaurant",
  "fast-food": "Fast food",
  "eastern-cuisine": "Eastern cuisine",
  "western-cuisine": "Western cuisine",
  seafood: "Seafood",
  desserts: "Desserts",
  "juices-beverages": "Juices & beverages",
  cafe: "Cafe",
  grills: "Grill house",
  "pizza-italian": "Pizza & Italian",
  breakfast: "Breakfast",
  bakery: "Bakery",
  clothing: "Clothing",
  electronics: "Electronics",
  "telecom-phones": "Telecom & phones",
  appliances: "Home appliances",
  cosmetics: "Cosmetics & care",
  pharmacy: "Pharmacy & medical supplies",
  "bookstore-stationery": "Bookstore & stationery",
  gifts: "Gifts & antiques",
  "household-goods": "Household goods",
  supermarket: "Supermarket",
  furniture: "Furniture",
  toys: "Kids' toys",
};

export interface RegisterCopy {
  title: string;
  body: string;
  nameLabel: string;
  namePlaceholder: string;
  typeLabel: string;
  step1?: string;
  descriptionPlaceholder?: string;
  logoLabel?: string;
  previewItemName?: string;
  previewItemDesc?: string;
  instagramPlaceholder?: string;
}

export function RestaurantRegisterForm({
  copy,
  /** set when an agent/agent-manager creates this account on a business's
   * behalf — the referral field locks to the agent's own code */
  lockedReferralCode,
}: {
  /** overrides for the store variant; defaults to restaurant wording */
  copy?: RegisterCopy;
  lockedReferralCode?: string;
}) {
  const referralFromLink = useSearchParams().get("ref")?.trim() ?? "";
  // an agent page passes their code directly; a ?ref= link is the other way
  // a referral arrives with an agent already attached — either way the
  // field is no longer the owner's to edit
  const referralLocked = lockedReferralCode || referralFromLink || "";

  const { t, lang } = useI18n();
  const router = useRouter();
  const { start: startNavigating } = useNavigationLoading();
  const businessType = copy ? "STORE" : "RESTAURANT";
  const [step, setStep] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterWizardValues>({
    resolver: zodResolver(registerWizardSchema(t.validation)),
    defaultValues: {
      name: "",
      subTypeId: "",
      username: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      referral: referralLocked,
      logoUrl: "",
      description: "",
      primaryColor: "#850036",
      secondaryColor: "#fe9800",
      governorateId: "",
      regionId: "",
      address: "",
      lat: null,
      lng: null,
      instagram: "",
      facebook: "",
      tiktok: "",
    },
    mode: "onTouched",
  });

  const [
    subTypeId,
    primaryColor,
    secondaryColor,
    lat,
    lng,
    governorateId,
    regionId,
  ] = useWatch({
    control,
    name: [
      "subTypeId",
      "primaryColor",
      "secondaryColor",
      "lat",
      "lng",
      "governorateId",
      "regionId",
    ],
  });

  const { data: subTypes } = useQuery({
    queryKey: queryKeys.businessSubTypes(businessType),
    queryFn: () => getBusinessSubTypes(businessType),
  });
  const { data: governorates } = useQuery({
    queryKey: queryKeys.governorates,
    queryFn: getGovernorates,
  });
  const { data: regions } = useQuery({
    queryKey: queryKeys.regions,
    queryFn: getRegions,
  });

  const regionItems = Object.fromEntries(
    (regions ?? [])
      .filter((region) => region.governorateId === governorateId)
      .map((region) => [region.id, region.name[lang]]),
  );
  const subTypeItems = Object.fromEntries(
    (subTypes ?? []).map((st) => [
      st.id,
      lang === "ar" ? st.name : SUB_TYPE_EN_LABELS[st.slug] ?? st.name,
    ]),
  );

  const Icon = copy ? ShoppingBag : UtensilsCrossed;
  const steps = [copy?.step1 ?? t.auth.step1, t.auth.step2, t.auth.step3, t.auth.step4];

  const nextStep = async () => {
    const valid = await trigger(registerStepFields[step]);
    if (valid) setStep((s) => s + 1);
  };

  const handleLogoFile = async (file: File | null) => {
    if (!file) {
      setValue("logoUrl", "");
      return;
    }
    setLogoUploading(true);
    try {
      const { url } = await uploadImage(file, "businesses");
      setValue("logoUrl", url);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.auth.genericError);
    } finally {
      setLogoUploading(false);
    }
  };

  const submit = async (values: RegisterWizardValues) => {
    // the form submits natively on Enter from any step (a single text field
    // is enough to trigger the browser's implicit submission) — only the
    // button on the last step may actually send the request
    if (step !== steps.length - 1) return;
    try {
      const result = await submitRegistrationRequest({
        districtId: values.regionId,
        applicantName: values.name.trim(),
        phone: values.phone,
        username: values.username.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
        subTypeId: values.subTypeId,
        email: values.email.trim() || undefined,
        type: businessType,
        referralCode: values.referral.trim() || undefined,
        notes: [
          values.logoUrl && `Logo: ${values.logoUrl}`,
          values.description && `Description: ${values.description}`,
          `Colors: ${values.primaryColor}, ${values.secondaryColor}`,
          values.address && `Address: ${values.address}`,
          values.lat !== null && values.lng !== null
            ? `Location: ${values.lat}, ${values.lng}`
            : "",
          values.instagram && `Instagram: ${values.instagram}`,
          values.facebook && `Facebook: ${values.facebook}`,
          values.tiktok && `TikTok: ${values.tiktok}`,
        ]
          .filter(Boolean)
          .join("\n"),
      });
      toast.success(
        (result as { message?: string }).message ?? t.auth.applicationSent,
      );
      startNavigating();
      router.push(`/${lang}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.auth.genericError);
    }
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="space-y-3 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-berry-soft text-berry-soft-foreground">
          <Icon className="size-8" />
        </span>
        <h1 className="font-heading text-2xl font-bold md:text-3xl">
          {copy?.title ?? t.auth.restaurantRegTitle}
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground md:text-base">
          {copy?.body ?? t.auth.restaurantRegBody}
        </p>
      </div>

      {/* step indicator — the label sits absolutely below the circle so it
          never affects the row's height, keeping the connector line
          centered on the circles instead of on the circle+label stack */}
      <ol className="mx-auto mt-8 flex max-w-xl items-center pb-6">
        {steps.map((label, i) => (
          <li key={label} className={cn("flex items-center", i > 0 && "flex-1")}>
            {i > 0 && (
              <span
                className={cn(
                  "mx-2 h-0.5 flex-1 rounded-full transition-colors duration-500",
                  i <= step ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-300",
                i < step
                  ? "bg-primary text-primary-foreground"
                  : i === step
                    ? "bg-primary text-primary-foreground shadow-glow scale-110"
                    : "bg-surface-container text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
              <span
                className={cn(
                  "absolute top-full start-1/2 mt-1.5 hidden -translate-x-1/2 rtl:translate-x-1/2 whitespace-nowrap text-xs font-semibold sm:block",
                  i === step ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-lifted md:p-10"
      >
        {step === 0 && (
          <div className="grid gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="r-name">
                  {copy?.nameLabel ?? t.auth.restaurantNameLabel} *
                </Label>
                <Input
                  id="r-name"
                  className="h-11"
                  placeholder={copy?.namePlaceholder ?? t.auth.restaurantNamePlaceholder}
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="space-y-2">
                <Label>{copy?.typeLabel ?? t.auth.restaurantTypeLabel} *</Label>
                <Select
                  value={subTypeId || null}
                  onValueChange={(v) =>
                    v && setValue("subTypeId", v, { shouldValidate: true })
                  }
                  items={subTypeItems}
                >
                  <SelectTrigger
                    className={SELECT_FIELD}
                    aria-label={copy?.typeLabel ?? t.auth.restaurantTypeLabel}
                    aria-invalid={!!errors.subTypeId}
                  >
                    <SelectValue placeholder={t.auth.businessTypePlaceholder} />
                  </SelectTrigger>
                  <SelectContent className={SELECT_CONTENT}>
                    {Object.entries(subTypeItems).map(([id, label]) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError message={errors.subTypeId?.message} />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="r-username">{t.auth.usernameLabel} *</Label>
                <Input
                  id="r-username"
                  dir="ltr"
                  autoComplete="username"
                  placeholder={t.auth.usernamePlaceholder}
                  aria-invalid={!!errors.username}
                  className="h-11"
                  {...register("username")}
                />
                <FieldError message={errors.username?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-phone">{t.auth.phoneLabel} *</Label>
                <Input
                  id="r-phone"
                  dir="ltr"
                  inputMode="tel"
                  placeholder="+963 9XX XXX XXX"
                  aria-invalid={!!errors.phone}
                  className="h-11"
                  {...register("phone")}
                />
                <FieldError message={errors.phone?.message} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="r-email">
                {t.auth.emailLabel}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t.common.optional})
                </span>
              </Label>
              <Input
                id="r-email"
                dir="ltr"
                type="email"
                autoComplete="email"
                placeholder={t.auth.emailPlaceholder}
                aria-invalid={!!errors.email}
                className="h-11"
                {...register("email")}
              />
              <FieldError message={errors.email?.message} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="r-password">{t.auth.passwordLabel} *</Label>
                <PasswordInput
                  id="r-password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  className="h-11"
                  {...register("password")}
                />
                <FieldError message={errors.password?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-confirm-password">
                  {t.auth.confirmPasswordLabel} *
                </Label>
                <PasswordInput
                  id="r-confirm-password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  className="h-11"
                  {...register("confirmPassword")}
                />
                <FieldError message={errors.confirmPassword?.message} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="r-referral">
                {t.auth.referralLabel}{" "}
                {!referralLocked && (
                  <span className="font-normal text-muted-foreground">
                    ({t.common.optional})
                  </span>
                )}
              </Label>
              <div className="relative">
                {referralLocked && (
                  <Lock className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  id="r-referral"
                  dir="ltr"
                  readOnly={!!referralLocked}
                  disabled={!!referralLocked}
                  placeholder={t.auth.referralPlaceholder}
                  className={cn("h-11", referralLocked && "ps-10")}
                  {...register("referral")}
                />
              </div>
              {referralLocked && (
                <p className="text-xs text-muted-foreground">
                  {t.auth.referralLockedHint}
                </p>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-8 md:grid-cols-[1fr_minmax(0,17rem)]">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>{copy?.logoLabel ?? t.auth.logoLabel}</Label>
                <FileDropzone
                  label={copy?.logoLabel ?? t.auth.logoLabel}
                  hint={logoUploading ? t.common.loading : t.auth.logoHint}
                  onFile={handleLogoFile}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-desc">{t.auth.descriptionLabel}</Label>
                <Textarea
                  id="r-desc"
                  rows={3}
                  placeholder={copy?.descriptionPlaceholder ?? t.auth.descriptionPlaceholder}
                  {...register("description")}
                />
              </div>

              <div className="space-y-3">
                <Label>{t.auth.colorPresets}</Label>
                <div className="flex flex-wrap gap-3">
                  {colorPresets.map((preset) => {
                    const isActive =
                      preset.primary === primaryColor &&
                      preset.secondary === secondaryColor;
                    return (
                      <button
                        key={preset.primary}
                        type="button"
                        onClick={() => {
                          setValue("primaryColor", preset.primary, { shouldValidate: true });
                          setValue("secondaryColor", preset.secondary, { shouldValidate: true });
                        }}
                        aria-pressed={isActive}
                        className={cn(
                          "relative size-12 transform-gpu overflow-hidden rounded-xl transition-transform duration-200 ease-smooth",
                          isActive
                            ? "ring-2 ring-offset-2 ring-primary scale-110"
                            : "hover:scale-105",
                        )}
                        style={{
                          background: `linear-gradient(135deg, ${preset.primary} 55%, ${preset.secondary} 55%)`,
                        }}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{t.auth.customColorHint}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ColorField
                  id="r-primary"
                  label={t.auth.primaryColorLabel}
                  value={primaryColor}
                  onChange={(v) => setValue("primaryColor", v, { shouldValidate: true })}
                />
                <ColorField
                  id="r-secondary"
                  label={t.auth.secondaryColorLabel}
                  value={secondaryColor}
                  onChange={(v) => setValue("secondaryColor", v, { shouldValidate: true })}
                />
              </div>
            </div>

            {/* live preview dish card */}
            <div>
              <Label>{t.auth.livePreview}</Label>
              <div className="mt-3 overflow-hidden rounded-2xl border border-border/60 bg-background shadow-lifted">
                <div
                  className="relative h-28"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}, color-mix(in oklch, ${primaryColor}, black 20%))`,
                  }}
                >
                  <span
                    className="absolute start-3 top-3 rounded-full px-2.5 py-1 text-[0.65rem] font-bold"
                    style={{ backgroundColor: secondaryColor, color: "#2c1600" }}
                  >
                    {t.menu.popular}
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-heading font-semibold">
                    {copy?.previewItemName ?? t.auth.previewDishName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {copy?.previewItemDesc ?? t.auth.previewDishDesc}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-bold" style={{ color: primaryColor }} dir="ltr">
                      45,000 {t.common.currency}
                    </span>
                    <span
                      className="flex size-8 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Plus className="size-4" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t.auth.governorateLabel} *</Label>
                <GovernorateRegionSelect
                  triggerClassName="h-11"
                  governorateValue={governorateId}
                  onGovernorateChange={(v) => {
                    setValue("governorateId", v, { shouldValidate: true });
                    setValue("regionId", "", { shouldValidate: true });
                  }}
                  governorateItems={Object.fromEntries(
                    (governorates ?? []).map((g) => [g.id, g.name[lang]]),
                  )}
                  governorateAriaLabel={t.auth.governorateLabel}
                  governorateInvalid={!!errors.governorateId}
                  regionValue={regionId}
                  onRegionChange={(v) => setValue("regionId", v, { shouldValidate: true })}
                  regionItems={regionItems}
                  regionAriaLabel={t.agentsPage.region}
                  regionDisabled={!governorateId}
                />
                <FieldError message={errors.governorateId?.message} />
                <FieldError message={errors.regionId?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-address">
                  {t.auth.addressLabel}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({t.common.optional})
                  </span>
                </Label>
                <Input
                  id="r-address"
                  className="h-11"
                  placeholder={t.auth.addressPlaceholder}
                  {...register("address")}
                />
              </div>
            </div>

            <div className="space-y-2">
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
                    {lat ? <Check className="size-4.5" /> : <MapPin className="size-4.5" />}
                  </span>
                  <span className="text-start">
                    <span className="block text-sm font-semibold">
                      {lat ? t.auth.locationPicked : t.auth.openMapPicker}
                    </span>
                    {lat && (
                      <span className="block text-xs text-muted-foreground" dir="ltr">
                        {lat.toFixed(5)}, {lng?.toFixed(5)}
                      </span>
                    )}
                  </span>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{t.auth.pickLocation}</DialogTitle>
                  </DialogHeader>
                  <GoogleLocationPicker
                    initialCoords={lat && lng ? { lat, lng } : undefined}
                    selectedGovernorateId={governorateId}
                    governorates={governorates}
                    onLocationChange={({ lat: pickedLat, lng: pickedLng }) => {
                      setValue("lat", pickedLat);
                      setValue("lng", pickedLng);
                    }}
                  />
                  <Button type="button" className="w-full" onClick={() => setMapOpen(false)}>
                    <Check className="size-4" />
                    <span className="font-semibold">OK</span>
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="r-ig" className="flex items-center gap-1.5">
                <InstagramIcon className="size-4" /> {t.auth.instagramLabel}
              </Label>
              <Input
                id="r-ig"
                dir="ltr"
                placeholder={copy?.instagramPlaceholder ?? "@yourrestaurant"}
                className="h-11"
                {...register("instagram")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-fb" className="flex items-center gap-1.5">
                <FacebookIcon className="size-4" /> {t.auth.facebookLabel}
              </Label>
              <Input id="r-fb" dir="ltr" className="h-11" {...register("facebook")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-tiktok" className="flex items-center gap-1.5">
                <TikTokIcon className="size-4" /> {t.auth.tiktokLabel}
              </Label>
              <Input id="r-tiktok" dir="ltr" className="h-11" {...register("tiktok")} />
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            className="font-semibold"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            {t.common.back}
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" className="h-11 min-w-32 shadow-glow" onClick={nextStep}>
              {t.common.next}
            </Button>
          ) : (
            <Button type="submit" loading={isSubmitting} className="h-11 min-w-40 shadow-glow">
              {t.auth.createAccount}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
