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
import {
  DEFAULT_OPEN_OPTION_ID,
  OptionGroupsFields,
} from "@/features/restaurant-dashboard/components/option-groups-fields";
import {
  itemOptionsSchema,
  type ItemOptionsValues,
} from "@/features/restaurant-dashboard/schemas";
import { fmt, useI18n } from "@/i18n/client";
import { toast } from "@/lib/toast";
import type { CatalogOptionGroup, MenuItem } from "@/lib/types";

/**
 * Checked on submit, before `toOptionGroups` ever runs — that function
 * quietly drops a blank group/option name instead of erroring, which is
 * the right call for leftover empty rows the owner never meant to fill in,
 * but the wrong one for a group or option the owner is actively building
 * and just hasn't named yet: losing it silently on save is worse than
 * making them fill it in. Returns the first problem found, or null when
 * every name that should exist does. The open option is exempt — its name
 * field already falls back to a default instead of needing one.
 */
export function findMissingOptionName(
  groups: ItemOptionsValues["groups"],
  t: { groupNameRequired: string; optionNameRequiredInGroup: string },
): string | null {
  for (const group of groups) {
    if (group.selectionType === "customAmount") continue;
    if (group.id.trim() === "") return t.groupNameRequired;
    for (const option of group.options) {
      if (option.id.trim() === "") {
        return fmt(t.optionNameRequiredInGroup, { group: group.id });
      }
    }
  }
  return null;
}

/**
 * Drops any group or option the owner left blank before it ever reaches the
 * server — `id` doubles as the label here, so an empty one is not a valid
 * row to save. A group that ends up with no options left after that is
 * dropped too: the backend rejects an empty `options` array outright
 * (`ItemsService.assertOptionGroups`).
 *
 * The open option (`customAmount`) is the one exception to "blank id means
 * drop it": its id field is really just a free-text label the owner can
 * leave alone, and an item saved before that label existed can already have
 * it blank — without this fallback, re-saving that item silently removes
 * its open option instead of just keeping the default label.
 */
export function toOptionGroups(
  groups: ItemOptionsValues["groups"],
): CatalogOptionGroup[] {
  return groups
    .map((g) =>
      g.selectionType === "customAmount" && g.id.trim() === ""
        ? { ...g, id: DEFAULT_OPEN_OPTION_ID }
        : g,
    )
    .filter((g) => g.id.trim() !== "")
    .map((g) => ({
      ...g,
      // a "customAmount" group has nothing to predefine — the customer
      // types the amount at order time — so it never has options to begin
      // with; every other group still needs at least one to be worth saving
      options:
        g.selectionType === "customAmount"
          ? []
          : g.options.filter((o) => o.id.trim() !== ""),
    }))
    .filter((g) => g.selectionType === "customAmount" || g.options.length > 0);
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
  onSave: (fields: {
    optionGroups: CatalogOptionGroup[];
    quantityLocked: boolean;
  }) => Promise<void> | void;
  /** the "color" preset only makes sense for a store's products */
  isStore?: boolean;
}) {
  const { t, lang } = useI18n();

  const { control, handleSubmit, reset, formState: { isSubmitting } } =
    useForm<ItemOptionsValues>({
      resolver: zodResolver(itemOptionsSchema()),
      defaultValues: { groups: [], quantityLocked: false },
    });

  // reset whenever a different item opens, so a previous edit never leaks
  useEffect(() => {
    if (!open) return;
    reset({
      groups: toFormGroups(item?.optionGroups),
      quantityLocked: item?.quantityLocked ?? false,
    });
  }, [open, item, reset]);

  const currencySuffix =
    lang === "ar"
      ? item?.currency === "USD"
        ? "دولار"
        : "ل.س"
      : item?.currency === "USD"
        ? "$"
        : "SYP";

  const submit = async (values: ItemOptionsValues) => {
    const missingName = findMissingOptionName(values.groups, t.dashboard);
    if (missingName) {
      toast.error(missingName);
      return;
    }

    const groups = toOptionGroups(values.groups);

    try {
      await onSave({ optionGroups: groups, quantityLocked: values.quantityLocked });
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
