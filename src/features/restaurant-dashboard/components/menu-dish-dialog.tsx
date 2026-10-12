"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";

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
import {
  dishFormSchema,
  type DishFormValues,
} from "@/features/restaurant-dashboard/schemas";
import { useI18n } from "@/i18n/client";
import { uploadImage } from "@/lib/api/upload";
import type {
  CatalogOptionGroup,
  MenuCategory,
  MenuItem,
  OptionSelectionType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The backend's `CatalogOption`/`CatalogOptionGroup` carry only `id` — the
 * owner's own typed text doubles as the label, there is no separate name
 * field. That `id` is exactly what this form edits live on every keystroke,
 * so it cannot also be the React key (the list would remount, and every
 * input would drop focus after one character). `key` below is a draft-only,
 * never-submitted identity that solves that; `toOptionGroups` strips it back
 * out to the real shape on save.
 */
interface DraftOption {
  key: string;
  id: string;
  priceDelta: number;
}
interface DraftGroup {
  key: string;
  id: string;
  selectionType: OptionSelectionType;
  required: boolean;
  options: DraftOption[];
}

function toDraftGroups(groups: CatalogOptionGroup[] | undefined): DraftGroup[] {
  return (groups ?? []).map((g) => ({
    key: crypto.randomUUID(),
    id: g.id,
    selectionType: g.selectionType,
    required: g.required,
    options: g.options.map((o) => ({
      key: crypto.randomUUID(),
      id: o.id,
      priceDelta: o.priceDelta,
    })),
  }));
}

function toOptionGroups(groups: DraftGroup[]): CatalogOptionGroup[] {
  return groups.map(({ key: _key, options, ...g }) => ({
    ...g,
    options: options.map(({ key: _optKey, ...o }) => o),
  }));
}

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
    optionGroups?: CatalogOptionGroup[];
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

  const [groups, setGroups] = useState<DraftGroup[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState("");

  // the option price-delta fields show this beside each one, so an owner
  // never has to guess which currency a +2,000 means
  const currencyValue = useWatch({ control, name: "currency" });
  const currencySuffix =
    lang === "ar"
      ? currencyValue === "USD"
        ? "دولار"
        : "ل.س"
      : currencyValue === "USD"
        ? "$"
        : "SYP";

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
    setGroups(toDraftGroups(editing?.optionGroups));
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
      optionGroups: toOptionGroups(groups),
      images,
    });

  const addGroup = (preset: "size" | "color" | "custom") => {
    const presetId =
      preset === "size"
        ? t.dashboard.presetSize
        : preset === "color"
          ? t.dashboard.presetColor
          : "";
    setGroups((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        id: presetId,
        selectionType: preset === "custom" ? "multiple" : "single",
        required: preset !== "custom",
        options: [],
      },
    ]);
  };

  const updateGroup = (key: string, patch: Partial<DraftGroup>) => {
    setGroups((prev) =>
      prev.map((g) => (g.key === key ? { ...g, ...patch } : g)),
    );
  };

  const removeGroup = (key: string) => {
    setGroups((prev) => prev.filter((g) => g.key !== key));
  };

  const addOption = (groupKey: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.key === groupKey
          ? {
            ...g,
            options: [
              ...g.options,
              { key: crypto.randomUUID(), id: "", priceDelta: 0 },
            ],
          }
          : g,
      ),
    );
  };

  const updateOption = (
    groupKey: string,
    optionKey: string,
    patch: Partial<DraftOption>,
  ) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.key !== groupKey
          ? g
          : {
            ...g,
            options: g.options.map((o) =>
              o.key === optionKey ? { ...o, ...patch } : o,
            ),
          },
      ),
    );
  };

  const removeOption = (groupKey: string, optionKey: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.key === groupKey
          ? { ...g, options: g.options.filter((o) => o.key !== optionKey) }
          : g,
      ),
    );
  };

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

            {/* option groups */}
            <div className="space-y-3 border-t border-border/60 pt-4">
              <Label>{t.dashboard.itemOptions}</Label>

              {groups.map((group) => (
                <div
                  key={group.key}
                  className="space-y-3 rounded-xl border border-border/60 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={group.id}
                      onChange={(e) =>
                        updateGroup(group.key, { id: e.target.value })
                      }
                      placeholder={t.dashboard.optionGroupNamePlaceholder}
                      className="h-9 flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.common.delete}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeGroup(group.key)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex gap-1 rounded-lg border border-border/60 p-0.5">
                      {(["single", "multiple"] as OptionSelectionType[]).map(
                        (type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() =>
                              updateGroup(group.key, { selectionType: type })
                            }
                            className={cn(
                              "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                              group.selectionType === type
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent",
                            )}
                          >
                            {type === "single"
                              ? t.dashboard.selectionSingle
                              : t.dashboard.selectionMultiple}
                          </button>
                        ),
                      )}
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Checkbox
                        checked={group.required}
                        onCheckedChange={(v) =>
                          updateGroup(group.key, { required: v === true })
                        }
                      />
                      {t.dashboard.optionRequired}
                    </label>
                  </div>

                  <div className="space-y-2">
                    {group.options.map((option) => (
                      <div key={option.key} className="flex items-center gap-2">
                        <Input
                          value={option.id}
                          onChange={(e) =>
                            updateOption(group.key, option.key, {
                              id: e.target.value,
                            })
                          }
                          placeholder={t.dashboard.optionNamePlaceholder}
                          className="h-8 flex-1"
                        />
                        <Input
                          type="number"
                          dir="ltr"
                          // blank rather than a sitting "0" — the owner types
                          // the actual difference instead of clearing a value
                          // that was never theirs
                          value={option.priceDelta === 0 ? "" : option.priceDelta}
                          onChange={(e) =>
                            updateOption(group.key, option.key, {
                              priceDelta:
                                e.target.value === "" ? 0 : Number(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="h-8 w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span className="text-xs font-semibold whitespace-nowrap text-muted-foreground">
                          {currencySuffix}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t.common.delete}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeOption(group.key, option.key)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-primary"
                      onClick={() => addOption(group.key)}
                    >
                      <Plus className="size-3.5" />
                      {t.dashboard.addOption}
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addGroup("size")}
                >
                  <Plus className="size-3.5" />
                  {t.dashboard.presetSize}
                </Button>
                {isStore && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addGroup("color")}
                  >
                    <Plus className="size-3.5" />
                    {t.dashboard.presetColor}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addGroup("custom")}
                >
                  <Plus className="size-3.5" />
                  {t.dashboard.addOptionGroup}
                </Button>
              </div>
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
