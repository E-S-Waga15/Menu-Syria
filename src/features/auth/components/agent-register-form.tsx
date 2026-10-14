"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Check, Handshake } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "@/lib/toast";

import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
} from "@/components/shared/brand-icons";
import { FieldError } from "@/components/shared/field-error";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { PasswordInput } from "@/components/shared/password-input";
import { Button } from "@/components/ui/button";
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
  agentRegisterSchema,
  agentStepFields,
  type AgentRegisterValues,
} from "@/features/auth/schemas";
import { getGovernorates, getRegions } from "@/features/marketing/services";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import { submitAgentApplication } from "@/features/auth/api";
import { uploadImage } from "@/lib/api/upload";
import { ApiError } from "@/lib/api/client";
import { useNavigationLoading } from "@/providers/navigation-loading";
import { cn } from "@/lib/utils";

const SELECT_FIELD = "h-12! w-full gap-2 pe-3.5 ps-4 text-sm";

export function AgentRegisterForm() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { start: startNavigating } = useNavigationLoading();
  const [step, setStep] = useState(0);
  const [photoUploading, setPhotoUploading] = useState(false);

  const { data: governorates } = useQuery({
    queryKey: queryKeys.governorates,
    queryFn: getGovernorates,
  });
  const { data: regions } = useQuery({
    queryKey: queryKeys.regions,
    queryFn: getRegions,
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<AgentRegisterValues>({
    resolver: zodResolver(agentRegisterSchema(t.validation)),
    defaultValues: {
      name: "",
      username: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
      photoUrl: "",
      governorateId: "",
      regionIds: [],
      bio: "",
      instagram: "",
      facebook: "",
      tiktok: "",
    },
    mode: "onTouched",
  });

  const [governorateId, regionIds] = useWatch({
    control,
    name: ["governorateId", "regionIds"],
  });

  const regionChoices = (regions ?? []).filter(
    (r) => r.governorateId === governorateId,
  );
  const governorateItems = Object.fromEntries(
    (governorates ?? []).map((g) => [g.id, g.name[lang]]),
  );

  const steps = [t.auth.agentStep1, t.auth.agentStep2, t.auth.agentStep3];

  const nextStep = async () => {
    const valid = await trigger(agentStepFields[step]);
    if (valid) setStep((s) => s + 1);
  };

  const toggleRegion = (id: string) => {
    if (!regionIds.includes(id) && regionIds.length >= 2) return;
    const next = regionIds.includes(id)
      ? regionIds.filter((r) => r !== id)
      : [...regionIds, id];
    setValue("regionIds", next, { shouldValidate: true });
  };

  const handlePhotoFile = async (file: File | null) => {
    if (!file) {
      setValue("photoUrl", "");
      return;
    }
    setPhotoUploading(true);
    try {
      const { url } = await uploadImage(file, "agents");
      setValue("photoUrl", url);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t.auth.genericError);
    } finally {
      setPhotoUploading(false);
    }
  };

  const submit = async (values: AgentRegisterValues) => {
    // the form submits natively on Enter from any step — only the button on
    // the last step may actually send the request
    if (step !== steps.length - 1) return;
    try {
      const result = await submitAgentApplication({
        name: values.name.trim(),
        username: values.username.trim(),
        phone: values.phone,
        email: values.email.trim() || undefined,
        password: values.password,
        confirmPassword: values.confirmPassword,
        governorateId: values.governorateId,
        districtIds: values.regionIds,
        photoUrl: values.photoUrl || undefined,
        notes: [
          values.bio && `Bio: ${values.bio}`,
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
    <div className="w-full max-w-2xl">
      <div className="space-y-3 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-berry-soft text-berry-soft-foreground">
          <Handshake className="size-8" />
        </span>
        <h1 className="font-heading text-2xl font-bold md:text-3xl">
          {t.auth.agentRegTitle}
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground md:text-base">
          {t.auth.agentRegBody}
        </p>
      </div>

      <ol className="mx-auto mt-8 flex max-w-md items-center pb-6">
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
        className="mt-8 rounded-3xl border border-border/60 bg-card p-6 md:p-10"
      >
        {step === 0 && (
          <div className="grid gap-6">
            <FileDropzone
              variant="avatar"
              label={t.auth.personalPhotoLabel}
              hint={photoUploading ? t.common.loading : t.auth.dropzoneHint}
              onFile={handlePhotoFile}
            />

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="a-name">{t.auth.fullNameLabel} *</Label>
                <Input
                  id="a-name"
                  autoComplete="name"
                  aria-invalid={!!errors.name}
                  className="h-12"
                  {...register("name")}
                />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="a-username">{t.auth.usernameLabel} *</Label>
                <Input
                  id="a-username"
                  dir="ltr"
                  autoComplete="username"
                  placeholder={t.auth.usernamePlaceholder}
                  aria-invalid={!!errors.username}
                  className="h-12"
                  {...register("username")}
                />
                <FieldError message={errors.username?.message} />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="a-phone">{t.auth.phoneLabel} *</Label>
                <Input
                  id="a-phone"
                  dir="ltr"
                  inputMode="tel"
                  placeholder="+963 9XX XXX XXX"
                  aria-invalid={!!errors.phone}
                  className="h-12"
                  {...register("phone")}
                />
                <FieldError message={errors.phone?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="a-email">
                  {t.auth.emailLabel}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({t.common.optional})
                  </span>
                </Label>
                <Input
                  id="a-email"
                  dir="ltr"
                  type="email"
                  autoComplete="email"
                  placeholder={t.auth.emailPlaceholder}
                  aria-invalid={!!errors.email}
                  className="h-12"
                  {...register("email")}
                />
                <FieldError message={errors.email?.message} />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="a-password">{t.auth.passwordLabel} *</Label>
                <PasswordInput
                  id="a-password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  className="h-12"
                  {...register("password")}
                />
                <FieldError message={errors.password?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="a-confirm-password">
                  {t.auth.confirmPasswordLabel} *
                </Label>
                <PasswordInput
                  id="a-confirm-password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  className="h-12"
                  {...register("confirmPassword")}
                />
                <FieldError message={errors.confirmPassword?.message} />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-6">
            <div className="space-y-2">
              <Label>{t.auth.governorateLabel} *</Label>
              <Select
                value={governorateId || null}
                onValueChange={(v) => {
                  if (!v) return;
                  setValue("governorateId", v, { shouldValidate: true });
                  setValue("regionIds", []);
                }}
                items={governorateItems}
              >
                <SelectTrigger
                  className={SELECT_FIELD}
                  aria-label={t.auth.governorateLabel}
                  aria-invalid={!!errors.governorateId}
                >
                  <SelectValue placeholder={t.auth.governorateLabel} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(governorateItems).map(([id, label]) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.governorateId?.message} />
            </div>

            <div className="space-y-2">
              <Label>{t.auth.regionsLabel} *</Label>
              <p className="text-xs text-muted-foreground">{t.auth.regionsHint}</p>
              {governorateId ? (
                regionChoices.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {regionChoices.map((region) => {
                      const selected = regionIds.includes(region.id);
                      const disabled = !selected && regionIds.length >= 2;
                      return (
                        <button
                          key={region.id}
                          type="button"
                          onClick={() => toggleRegion(region.id)}
                          aria-pressed={selected}
                          disabled={disabled}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-[background-color,border-color,translate] duration-200 ease-smooth",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : disabled
                                ? "cursor-not-allowed border-border/50 text-muted-foreground/60"
                                : "border-border hover:border-primary/50 hover:bg-surface-container-low",
                          )}
                        >
                          {selected && <Check className="size-3.5" />}
                          {region.name[lang]}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t.agentsPage.noResults}</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">{t.auth.governorateLabel}</p>
              )}
              <FieldError message={errors.regionIds?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="a-bio">{t.auth.bioLabel}</Label>
              <Textarea
                id="a-bio"
                rows={3}
                placeholder={t.auth.bioPlaceholder}
                {...register("bio")}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="a-ig" className="gap-1.5">
                <InstagramIcon className="size-4" /> {t.auth.instagramLabel}
              </Label>
              <Input
                id="a-ig"
                dir="ltr"
                placeholder="@yourname"
                className="h-12"
                {...register("instagram")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-fb" className="gap-1.5">
                <FacebookIcon className="size-4" /> {t.auth.facebookLabel}
              </Label>
              <Input id="a-fb" dir="ltr" className="h-12" {...register("facebook")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-tiktok" className="gap-1.5">
                <TikTokIcon className="size-4" /> {t.auth.tiktokLabel}
              </Label>
              <Input id="a-tiktok" dir="ltr" className="h-12" {...register("tiktok")} />
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
            <Button type="button" className="h-12 min-w-32 shadow-glow" onClick={nextStep}>
              {t.common.next}
            </Button>
          ) : (
            <Button
              type="submit"
              loading={isSubmitting}
              className="h-12 min-w-40 shadow-glow"
            >
              {t.auth.submitApplication}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
