"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { FieldError } from "@/components/shared/field-error";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { Button } from "@/components/ui/button";
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
import {
  dishFormSchema,
  type DishFormValues,
} from "@/features/restaurant-dashboard/schemas";
import { useI18n } from "@/i18n/client";
import { uploadImage } from "@/lib/api/upload";
import type { MenuCategory, MenuItem } from "@/lib/types";

/**
 * Create/edit panel for a single menu item, lifted out of MenuManager so the
 * manager reads as layout and the form reads as a form. It owns nothing but
 * the draft: the parent decides what saving means.
 */
export function MenuDishDialog({
  open,
  onOpenChange,
  editing,
  categories,
  isStore,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: MenuItem | null;
  categories: MenuCategory[];
  isStore: boolean;
  onSave: (dish: {
    nameText?: string;
    descText?: string;
    price?: number;
    categoryId: string;
    currency: "SYP" | "USD";
    /** gallery, first entry first — the parent maps [0] onto imageUrl */
    images?: string[];
  }) => void;
}) {
  const { t, lang } = useI18n();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DishFormValues>({
    resolver: zodResolver(dishFormSchema(t.validation)),
    defaultValues: { name: "", desc: "", price: "", currency: "SYP" },
    mode: "onTouched",
  });

  const [images, setImages] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");

  // Re-seed the fields whenever a different dish is opened (during render, no effect)
  const [seededFor, setSeededFor] = useState<{
    editing: MenuItem | null;
    open: boolean;
  } | null>(null);
  if (seededFor?.editing !== editing || seededFor?.open !== open) {
    setSeededFor({ editing, open });
    reset({
      name: editing?.name[lang] ?? "",
      desc: editing?.description[lang] ?? "",
      price: editing ? String(editing.price) : "",
      currency: editing?.currency ?? "SYP",
    });
    setCategoryId(editing?.categoryId ?? categories[0]?.id ?? "");
    // an older item may only have the single imageUrl; treat it as a gallery
    // of one so editing never silently drops it
    setImages(
      editing ? (editing.images ?? [editing.imageUrl]).filter(Boolean) : [],
    );
  }

  const submit = (values: DishFormValues) =>
    onSave({
      nameText: values.name,
      descText: values.desc,
      price: Number(values.price) || 0,
      currency: values.currency,
      categoryId,
      images,
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto scrollbar-none">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? t.common.edit
              : isStore
                ? t.dashboard.addProduct
                : t.dashboard.addDish}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} noValidate>
          <div className="space-y-4 px-4 pb-2">
            <div className="space-y-1.5">
              {/* "اسم المنتج" covers a dish and a product alike — no need
                  to branch on isStore for a label that reads fine either way */}
              <Label htmlFor="dish-name">{t.dashboard.productName}</Label>
              <Input
                id="dish-name"
                placeholder={t.dashboard.productNamePlaceholder}
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="space-y-1.5">
              <Label>{t.dashboard.category}</Label>
              <Select
                value={categoryId}
                onValueChange={(value) => {
                  if (value) setCategoryId(value);
                }}
                // without this, SelectValue has no label to look the id up
                // against and falls back to printing the raw id — which is
                // exactly the uuid the owner saw instead of the category name
                items={Object.fromEntries(
                  categories.map((category) => [category.id, category.name[lang]]),
                )}
              >
                <SelectTrigger
                    className="h-10! w-full"
                    aria-label={t.dashboard.category}
                >
                    <SelectValue placeholder={t.dashboard.category} />
                </SelectTrigger>
                <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name[lang]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dish-price">{t.dashboard.dishPrice}</Label>
              <Input
                  id="dish-price"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder={t.dashboard.dishPricePlaceholder}
                  aria-invalid={!!errors.price}
                  {...register("price")}
              />
              <FieldError message={errors.price?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dish-currency">{t.dashboard.currency}</Label>
              <Controller
                  control={control}
                  name="currency"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        if (value) field.onChange(value);
                      }}
                      items={{
                        SYP: lang === "ar" ? "ل.س" : "SYP",
                        USD: lang === "ar" ? "دولار" : "$",
                      }}
                    >
                      <SelectTrigger
                        id="dish-currency"
                        className="h-10! w-full"
                        aria-label={t.dashboard.currency}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SYP">
                          {lang === "ar" ? "ل.س" : "SYP"}
                        </SelectItem>
                        <SelectItem value="USD">
                          {lang === "ar" ? "دولار" : "$"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dish-desc">{t.dashboard.dishDesc}</Label>
              <Textarea
                id="dish-desc"
                rows={2}
                placeholder={t.dashboard.dishDescPlaceholder}
                {...register("desc")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>
                {isStore ? t.dashboard.productImage : t.dashboard.dishImage}
              </Label>

              {images.length > 0 && (
                <ul className="grid grid-cols-3 gap-2">
                    {images.map((src, index) => (
                      <li
                        key={src}
                        className="group/img relative aspect-square overflow-hidden rounded-xl border border-border/60"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element --
                            object URLs from the picker are not remote patterns
                            next/image can resolve */}
                        <img
                          src={src}
                          alt=""
                          className="size-full object-cover"
                        />
                        {index === 0 && (
                          <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[10px] font-bold text-white">
                            {t.dashboard.mainImage}
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label={t.dashboard.removeImage}
                          onClick={() =>
                            setImages((prev) => prev.filter((s) => s !== src))
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
                hint={t.dashboard.imagesHint}
                onFile={async (file) => {
                    if (!file) return;
                    const { url } = await uploadImage(file, "items");
                    setImages((prev) => [...prev, url]);
                }}
              />
            </div>
          </div>
          <DialogFooter className="px-4 pb-4">
            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full shadow-glow"
            >
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
