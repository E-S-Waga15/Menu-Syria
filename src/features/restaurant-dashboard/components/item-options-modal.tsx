"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OptionGroupsFields } from "@/features/restaurant-dashboard/components/option-groups-fields";
import {
  itemOptionsSchema,
  type ItemOptionsValues,
} from "@/features/restaurant-dashboard/schemas";
import { fmt, useI18n } from "@/i18n/client";
import { toast } from "@/lib/toast";
import type { CatalogOptionGroup, MenuItem } from "@/lib/types";

/**
 * Drops any group or option the owner left blank before it ever reaches the
 * server — `id` doubles as the label here, so an empty one is not a valid
 * row to save. A group that ends up with no options left after that is
 * dropped too: the backend rejects an empty `options` array outright
 * (`ItemsService.assertOptionGroups`).
 */
export function toOptionGroups(
  groups: ItemOptionsValues["groups"],
): CatalogOptionGroup[] {
  return groups
    .filter((g) => g.id.trim() !== "")
    .map((g) => ({
      ...g,
      options: g.options.filter((o) => o.id.trim() !== ""),
    }))
    .filter((g) => g.options.length > 0);
}

function toFormGroups(
  groups: CatalogOptionGroup[] | undefined,
): ItemOptionsValues["groups"] {
  return (groups ?? []).map((g) => ({
    id: g.id,
    selectionType: g.selectionType,
    required: g.required,
    options: g.options.map((o) => ({ id: o.id, priceDelta: o.priceDelta })),
  }));
}

/**
 * The backend rejects any option whose priceDelta comes out negative
 * (menu_syria_backend's ItemsService.assertOptionGroups) — which a
 * single-choice group's own "type the final price" entry produces the
 * moment an option costs less than the item's base price (e.g. a "Small"
 * cheaper than the base). Checked here, with the real cause named, instead
 * of letting the save fail with the backend's generic
 * "بيانات خيار المنتج غير صحيحة" and no clue which field is wrong.
 * Returns the offending option's name, or null when every group is valid.
 */
export function findOptionPriceBelowBase(
  groups: CatalogOptionGroup[],
): string | null {
  for (const group of groups) {
    const cheaper = group.options.find((o) => o.priceDelta < 0);
    if (cheaper) return cheaper.id;
  }
  return null;
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

    const cheaperOption = findOptionPriceBelowBase(groups);
    if (cheaperOption) {
      toast.error(
        fmt(t.dashboard.optionPriceBelowBase, {
          option: cheaperOption,
          base: basePrice,
        }),
      );
      return;
    }

    try {
      await onSave(groups);
      onOpenChange(false);
    } catch {
      // the mutation's own onError already toasted — keep the dialog open
      // so the owner's edits are still there to retry
    }
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
          <div className="px-4 pb-2">
            <OptionGroupsFields
              control={control}
              basePrice={basePrice}
              currencySuffix={currencySuffix}
              isStore={isStore}
            />
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
