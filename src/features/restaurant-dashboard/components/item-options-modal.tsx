"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
} from "react-hook-form";

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
import {
  itemOptionsSchema,
  type ItemOptionsValues,
} from "@/features/restaurant-dashboard/schemas";
import { fmt, useI18n } from "@/i18n/client";
import type { CatalogOptionGroup, MenuItem, OptionSelectionType } from "@/lib/types";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/**
 * Drops any group or option the owner left blank before it ever reaches the
 * server — `id` doubles as the label here, so an empty one is not a valid
 * row to save (moved here unchanged from the old dish dialog). A group that
 * ends up with no options left after that is dropped too: the backend
 * rejects an empty `options` array outright (`ItemsService.assertOptionGroups`).
 */
function toOptionGroups(groups: ItemOptionsValues["groups"]): CatalogOptionGroup[] {
  return groups
    .filter((g) => g.id.trim() !== "")
    .map((g) => ({
      ...g,
      options: g.options.filter((o) => o.id.trim() !== ""),
    }))
    .filter((g) => g.options.length > 0);
}

function toFormGroups(groups: CatalogOptionGroup[] | undefined): ItemOptionsValues["groups"] {
  return (groups ?? []).map((g) => ({
    id: g.id,
    selectionType: g.selectionType,
    required: g.required,
    options: g.options.map((o) => ({ id: o.id, priceDelta: o.priceDelta })),
  }));
}

/**
 * One group's row: name, single/multiple toggle, required checkbox, and its
 * own options. Pulled out so it can own its own nested `useFieldArray` for
 * `options` — hooks can't be called inside the parent's `.map`.
 */
function GroupEditor({
  control,
  groupIndex,
  onRemove,
  basePrice,
  currencySuffix,
}: {
  control: Control<ItemOptionsValues>;
  groupIndex: number;
  onRemove: () => void;
  basePrice: number;
  currencySuffix: string;
}) {
  const { t } = useI18n();
  const options = useFieldArray({
    control,
    name: `groups.${groupIndex}.options`,
  });
  const selectionType = useWatch({
    control,
    name: `groups.${groupIndex}.selectionType`,
  });
  // single-choice (size) is always priced as each option's own final price;
  // multiple-choice (add-ons) is always priced as what it adds — never a
  // per-group toggle, so a customer never sees the two logics mixed
  const isAbsolute = selectionType === "single";

  return (
    <div className="space-y-3 rounded-xl border border-border/60 p-3">
      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name={`groups.${groupIndex}.id`}
          render={({ field }) => (
            <Input
              value={field.value}
              onChange={field.onChange}
              placeholder={t.dashboard.optionGroupNamePlaceholder}
              className="h-9 flex-1"
            />
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t.common.delete}
          className="text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Controller
          control={control}
          name={`groups.${groupIndex}.selectionType`}
          render={({ field }) => (
            <div className="flex gap-1 rounded-lg border border-border/60 p-0.5">
              {(["single", "multiple"] as OptionSelectionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => field.onChange(type)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                    field.value === type
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {type === "single"
                    ? t.dashboard.selectionSingle
                    : t.dashboard.selectionMultiple}
                </button>
              ))}
            </div>
          )}
        />
        <Controller
          control={control}
          name={`groups.${groupIndex}.required`}
          render={({ field }) => (
            <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
              {t.dashboard.optionRequired}
            </label>
          )}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {isAbsolute ? t.dashboard.priceModeHint : t.dashboard.priceModeAddHint}
      </p>

      <div className="space-y-2">
        {options.fields.map((field, optionIndex) => (
          <Controller
            key={field.id}
            control={control}
            name={`groups.${groupIndex}.options.${optionIndex}`}
            render={({ field: optionField }) => {
              // a single-choice group shows/edits the option's own final
              // price; what's stored (`priceDelta`) stays the difference
              // from the base price either way, since that's the only shape
              // the order's price math reads
              const displayValue = isAbsolute
                ? basePrice + optionField.value.priceDelta
                : optionField.value.priceDelta;
              return (
                <div className="flex items-center gap-2">
                  <Input
                    value={optionField.value.id}
                    onChange={(e) =>
                      optionField.onChange({
                        ...optionField.value,
                        id: e.target.value,
                      })
                    }
                    placeholder={t.dashboard.optionNamePlaceholder}
                    className="h-8 flex-1"
                  />
                  <Input
                    type="number"
                    dir="ltr"
                    // blank rather than a sitting "0" — the owner types the
                    // actual value instead of clearing a value never theirs
                    value={displayValue === 0 ? "" : displayValue}
                    onChange={(e) => {
                      const entered =
                        e.target.value === "" ? 0 : Number(e.target.value);
                      optionField.onChange({
                        ...optionField.value,
                        priceDelta: isAbsolute ? entered - basePrice : entered,
                      });
                    }}
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
                    onClick={() => options.remove(optionIndex)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              );
            }}
          />
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-primary"
          onClick={() => options.append({ id: "", priceDelta: 0 })}
        >
          <Plus className="size-3.5" />
          {t.dashboard.addOption}
        </Button>
      </div>
    </div>
  );
}

/**
 * Edits one item's option groups on their own, split out of the old
 * all-in-one dish dialog. Opens from the item card's kebab menu and saves
 * through `itemMutations.edit(item.id, { optionGroups })` — the backend
 * accepts a partial item update, so nothing else on the item is touched.
 */
export function ItemOptionsModal({
  item,
  open,
  onOpenChange,
  onSave,
  isStore = false,
}: {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (optionGroups: CatalogOptionGroup[]) => Promise<void> | void;
  /** the "color" preset only makes sense for a store's products */
  isStore?: boolean;
}) {
  const { t, lang } = useI18n();

  const { control, handleSubmit, reset, formState: { isSubmitting } } =
    useForm<ItemOptionsValues>({
      resolver: zodResolver(itemOptionsSchema()),
      defaultValues: { groups: [] },
    });

  const groups = useFieldArray({ control, name: "groups" });

  // reset whenever a different item opens, so a previous edit never leaks
  useEffect(() => {
    if (!open) return;
    reset({ groups: toFormGroups(item?.optionGroups) });
  }, [open, item, reset]);

  const basePrice = item?.price ?? 0;
  const currencySuffix =
    lang === "ar"
      ? item?.currency === "USD"
        ? "دولار"
        : "ل.س"
      : item?.currency === "USD"
        ? "$"
        : "SYP";

  const submit = async (values: ItemOptionsValues) => {
    const groups = toOptionGroups(values.groups);

    // The backend rejects any option whose priceDelta comes out negative
    // (menu_syria_backend's ItemsService.assertOptionGroups) — which a
    // single-choice group's own "type the final price" entry produces the
    // moment an option costs less than the item's base price (e.g. a
    // "Small" cheaper than the base). Caught here, with the real cause
    // named, instead of letting the save fail with the backend's generic
    // "بيانات خيار المنتج غير صحيحة" and no clue which field is wrong.
    for (const group of groups) {
      const cheaper = group.options.find((o) => o.priceDelta < 0);
      if (cheaper) {
        toast.error(
          fmt(t.dashboard.optionPriceBelowBase, {
            option: cheaper.id,
            base: basePrice,
          }),
        );
        return;
      }
    }

    try {
      await onSave(groups);
      onOpenChange(false);
    } catch {
      // the mutation's own onError already toasted — keep the dialog open
      // so the owner's edits are still there to retry
    }
  };

  const addGroup = (preset: "size" | "color" | "custom") => {
    const presetId =
      preset === "size"
        ? t.dashboard.presetSize
        : preset === "color"
          ? t.dashboard.presetColor
          : "";
    groups.append({
      id: presetId,
      selectionType: preset === "custom" ? "multiple" : "single",
      required: preset !== "custom",
      options: [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto scrollbar-none">
        <DialogHeader>
          <DialogTitle>
            {item ? `${t.dashboard.itemOptions} — ${item.name[lang]}` : t.dashboard.itemOptions}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} noValidate>
          <div className="space-y-3 px-4 pb-2">
            {groups.fields.map((field, index) => (
              <GroupEditor
                key={field.id}
                control={control}
                groupIndex={index}
                onRemove={() => groups.remove(index)}
                basePrice={basePrice}
                currencySuffix={currencySuffix}
              />
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
          <DialogFooter className="px-4 pb-4">
            <Button type="submit" loading={isSubmitting} className="w-full">
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
