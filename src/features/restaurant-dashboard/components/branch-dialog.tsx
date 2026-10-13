"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Check, MapPin } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import { FieldError } from "@/components/shared/field-error";
import { GoogleLocationPicker } from "@/components/shared/google-location-picker";
import { GovernorateRegionSelect } from "@/components/shared/governorate-region-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  branchFormSchema,
  type BranchFormValues,
} from "@/features/restaurant-dashboard/schemas";
import {
  getGovernorates,
  getRegions,
} from "@/features/marketing/services";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { Branch } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Create/edit panel for a single branch. Reuses the exact address step
 * built for business registration — same governorate→district select, same
 * map picker — so a branch's location is set the same way the business's
 * own address already is.
 */
export function BranchDialog({
  open,
  onOpenChange,
  editing,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Branch | null;
  onSave: (values: BranchFormValues) => Promise<void> | void;
  isSaving: boolean;
}) {
  const { t, lang } = useI18n();
  const [mapOpen, setMapOpen] = useState(false);

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
    reset,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema(t.validation)),
    defaultValues: {
      name: "",
      governorateId: "",
      districtId: "",
      address: "",
      phone: "",
      lat: null,
      lng: null,
    },
    mode: "onTouched",
  });

  const [governorateId, districtId, lat, lng] = useWatch({
    control,
    name: ["governorateId", "districtId", "lat", "lng"],
  });

  // re-seed whenever a different branch opens, or a blank form for "add"
  const [seededFor, setSeededFor] = useState<{
    editing: Branch | null;
    open: boolean;
  } | null>(null);
  if (seededFor?.editing !== editing || seededFor?.open !== open) {
    setSeededFor({ editing, open });
    const district = editing
      ? (regions ?? []).find((r) => r.id === editing.districtId)
      : undefined;
    reset({
      name: editing?.name ?? "",
      governorateId: district?.governorateId ?? "",
      districtId: editing?.districtId ?? "",
      address: editing?.address ?? "",
      phone: editing?.phone ?? "",
      lat: editing?.latitude ?? null,
      lng: editing?.longitude ?? null,
    });
  }

  const regionItems = Object.fromEntries(
    (regions ?? [])
      .filter((region) => region.governorateId === governorateId)
      .map((region) => [region.id, region.name[lang]]),
  );

  const submit = (values: BranchFormValues) => onSave(values);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto scrollbar-none">
        <DialogHeader>
          <DialogTitle>
            {editing ? t.dashboard.editBranch : t.dashboard.addBranch}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} noValidate>
          <div className="space-y-4 px-4 pb-2">
            <div className="space-y-1.5">
              <Label htmlFor="branch-name">{t.dashboard.branchName} *</Label>
              <Input
                id="branch-name"
                placeholder={t.dashboard.branchNamePlaceholder}
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              <FieldError message={errors.name?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-phone">{t.dashboard.branchPhone} *</Label>
              <Input
                id="branch-phone"
                dir="ltr"
                inputMode="tel"
                placeholder="+963 9XX XXX XXX"
                aria-invalid={!!errors.phone}
                {...register("phone")}
              />
              <FieldError message={errors.phone?.message} />
            </div>

            <div className="space-y-1.5">
              <Label>{t.auth.governorateLabel} *</Label>
              <GovernorateRegionSelect
                triggerClassName="h-10!"
                governorateValue={governorateId}
                onGovernorateChange={(v) => {
                  setValue("governorateId", v, { shouldValidate: true });
                  setValue("districtId", "", { shouldValidate: true });
                }}
                governorateItems={Object.fromEntries(
                  (governorates ?? []).map((g) => [g.id, g.name[lang]]),
                )}
                governorateAriaLabel={t.auth.governorateLabel}
                governorateInvalid={!!errors.governorateId}
                regionValue={districtId}
                onRegionChange={(v) =>
                  setValue("districtId", v, { shouldValidate: true })
                }
                regionItems={regionItems}
                regionAriaLabel={t.agentsPage.region}
                regionDisabled={!governorateId}
              />
              <div className="grid gap-1 sm:grid-cols-2 sm:gap-x-3">
                <FieldError message={errors.governorateId?.message} />
                <FieldError message={errors.districtId?.message} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-address">
                {t.auth.addressLabel}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t.common.optional})
                </span>
              </Label>
              <Input
                id="branch-address"
                placeholder={t.auth.addressPlaceholder}
                {...register("address")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                {t.auth.pickLocation}{" "}
                <span className="font-normal text-muted-foreground">
                  ({t.common.optional})
                </span>
              </Label>
              <Dialog open={mapOpen} onOpenChange={setMapOpen}>
                <DialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full justify-start gap-3 border-dashed"
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
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => setMapOpen(false)}
                  >
                    <Check className="size-4" />
                    <span className="font-semibold">OK</span>
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <DialogFooter className="px-4 pb-4">
            <Button type="submit" loading={isSaving} className="w-full shadow-glow">
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
