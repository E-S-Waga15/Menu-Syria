"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";

import { FieldError } from "@/components/shared/field-error";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { offerSchema, type OfferValues } from "@/features/offers/schemas";
import { formatPrice } from "@/features/public-menu/lib/format";
import { fmt, useI18n } from "@/i18n/client";
import { uploadImage } from "@/lib/api/upload";
import type { Offer, OfferBadge } from "@/lib/types";

/** today, as the `<input type="date">` value format */
const today = () => new Date().toISOString().slice(0, 10);

const emptyValues = (): OfferValues => ({
  name: "",
  description: "",
  originalPrice: "",
  price: "",
  startsAt: today(),
  endsAt: "",
  isActive: true,
  badge: "none",
  includes: [""],
  images: [],
});

/**
 * Create and edit an offer.
 *
 * One form for both, because an offer is the same object either way — the only
 * difference is whether the fields start empty. The live saving figure under
 * the two price fields is the point of the whole screen, so it is computed as
 * the owner types rather than waiting for a save.
 */
export function OfferDialog({
  open,
  editing,
  onClose,
  onSave,
}: {
  open: boolean;
  /** the offer being edited, or `null` when creating a new one */
  editing: Offer | null;
  onClose: () => void;
  onSave: (values: OfferValues) => Promise<void> | void;
}) {
  const { t, lang } = useI18n();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OfferValues>({
    resolver: zodResolver(offerSchema(t.validation)),
    mode: "onTouched",
    defaultValues: emptyValues(),
  });

  const includes = useFieldArray({ control, name: "includes" as never });
  const images = useWatch({ control, name: "images" }) ?? [];
  const price = useWatch({ control, name: "price" });
  const originalPrice = useWatch({ control, name: "originalPrice" });

  // reset when the dialog opens so a previous edit never leaks into the next
  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? {
          name: editing.name[lang],
          description: editing.description[lang],
          originalPrice: editing.originalPrice
            ? String(editing.originalPrice)
            : "",
          price: String(editing.price),
          startsAt: editing.startsAt,
          endsAt: editing.endsAt ?? "",
          isActive: editing.isActive,
          badge: editing.badge ?? "none",
          includes: editing.includes.length
            ? editing.includes.map((i) => i[lang])
            : [""],
          images: editing.images,
        }
        : emptyValues(),
    );
  }, [open, editing, lang, reset]);

  // the saving, shown while it is still being decided
  const saving =
    Number(originalPrice) > Number(price) && Number(price) > 0
      ? Math.round(
        ((Number(originalPrice) - Number(price)) / Number(originalPrice)) *
        100,
      )
      : 0;

  const badges: { value: OfferBadge | "none"; label: string }[] = [
    { value: "none", label: t.offers.badgeNone },
    { value: "limited", label: t.offers.badgeLimited },
    { value: "bestValue", label: t.offers.badgeBestValue },
    { value: "new", label: t.offers.badgeNew },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {/* laid out like the storefront's product modal: an unpadded popup so
          the pinned bar spans it edge to edge, with the body carrying its own
          padding underneath */}
      <DialogContent className="scrollbar-none max-h-[88dvh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader flush>
          <DialogTitle>
            {editing ? t.offers.editOffer : t.offers.newOffer}
          </DialogTitle>
        </DialogHeader>

        <form
          noValidate
          onSubmit={handleSubmit(onSave)}
          className="space-y-5 px-4 pt-4"
          id="offer-form"
        >
          <div className="space-y-1.5">
            <Label htmlFor="offer-name">{t.offers.offerName}</Label>
            <Input
              id="offer-name"
              className="h-11"
              placeholder={t.offers.offerNamePlaceholder}
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            <FieldError message={errors.name?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="offer-desc">{t.offers.offerDescription}</Label>
            <Textarea
              id="offer-desc"
              rows={3}
              placeholder={t.offers.offerDescriptionPlaceholder}
              {...register("description")}
            />
          </div>

          {/* photos */}
          <div className="space-y-2">
            <Label>{t.offers.offerImages}</Label>
            {images.length > 0 && (
              <ul className="grid grid-cols-3 gap-2">
                {images.map((src, index) => (
                  <li
                    key={src}
                    className="relative aspect-square overflow-hidden rounded-xl border border-border/60"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element --
                        object URLs from the picker are not remote patterns
                        next/image can resolve */}
                    <img src={src} alt="" className="size-full object-cover" />
                    {index === 0 && (
                      <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[10px] font-bold text-white">
                        {t.dashboard.mainImage}
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={t.dashboard.removeImage}
                      onClick={() =>
                        setValue(
                          "images",
                          images.filter((s) => s !== src),
                          { shouldDirty: true },
                        )
                      }
                      className="absolute end-1 top-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-destructive"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <FileDropzone
              label={t.dashboard.addPhoto}
              hint={t.offers.imagesHint}
              onFile={async (file) => {
                if (!file) return;
                const { url } = await uploadImage(file, "offers");
                setValue("images", [...images, url], { shouldDirty: true });
              }}
            />
          </div>

          {/* what the bundle contains */}
          <div className="space-y-2">
            <Label>{t.offers.includes}</Label>
            <p className="text-xs text-muted-foreground">
              {t.offers.includesHint}
            </p>
            {includes.fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  className="h-11"
                  placeholder={t.offers.includePlaceholder}
                  {...register(`includes.${index}` as const)}
                />
                {includes.fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.common.delete}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => includes.remove(index)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => includes.append("" as never)}
            >
              <Plus className="size-3.5" />
              {t.offers.addInclude}
            </Button>
          </div>

          {/* pricing */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="offer-was">{t.offers.originalPrice}</Label>
              <Input
                id="offer-was"
                inputMode="numeric"
                dir="ltr"
                className="h-11"
                {...register("originalPrice")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offer-price">{t.offers.price}</Label>
              <Input
                id="offer-price"
                inputMode="numeric"
                dir="ltr"
                className="h-11"
                aria-invalid={!!errors.price}
                {...register("price")}
              />
              <FieldError message={errors.price?.message} />
            </div>
          </div>

          {saving > 0 && (
            <p className="flex items-center justify-between rounded-xl border border-success/30 bg-success/10 px-4 py-2.5 text-sm font-bold text-success">
              <span>{fmt(t.offers.discount, { percent: saving })}</span>
              <span dir="ltr">
                {formatPrice(
                  Number(originalPrice) - Number(price),
                  t.common.currency,
                )}
              </span>
            </p>
          )}

          {/* window */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="offer-start">{t.offers.startsAt}</Label>
              <Input
                id="offer-start"
                type="date"
                className="h-11"
                aria-invalid={!!errors.startsAt}
                {...register("startsAt")}
              />
              <FieldError message={errors.startsAt?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offer-end">{t.offers.endsAt}</Label>
              <Input
                id="offer-end"
                type="date"
                className="h-11"
                {...register("endsAt")}
              />
              <p className="text-xs text-muted-foreground">
                {t.offers.endsAtHint}
              </p>
            </div>
          </div>

          {/* badge — a Base UI select, so it goes through Controller */}
          <div className="space-y-1.5">
            <Label>{t.offers.badge}</Label>
            <Controller
              control={control}
              name="badge"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11! w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {badges.map((badge) => (
                      <SelectItem key={badge.value} value={badge.value}>
                        {badge.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="rounded-xl border border-border/60 p-4">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <label className="flex cursor-pointer items-start gap-3">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(Boolean(checked))
                    }
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-bold">
                      {t.offers.isActive}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {t.offers.isActiveHint}
                    </span>
                  </span>
                </label>
              )}
            />
          </div>
        </form>

        {/* pinned to the foot the way the product modal pins its add button:
            the save is reachable without scrolling back down a long form */}
        <DialogFooter className="sticky bottom-0 mt-5 border-t border-border/60 bg-popover px-4 py-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="offer-form" loading={isSubmitting}>
            {t.offers.saveOffer}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
