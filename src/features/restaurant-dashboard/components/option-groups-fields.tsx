"use client";

import { Plus, X } from "lucide-react";
import { Controller, useFieldArray, useWatch, type Control } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/client";
import type { OptionSelectionType } from "@/lib/types";
import { cn } from "@/lib/utils";

/** the shape every consumer's form must hold — a dish dialog and the
 * dedicated options modal alike. `quantityLocked` lives at this top level
 * (an item field, not a group) even though it's only ever edited from
 * inside the open-option card below, since that's what it's actually for. */
export interface OptionGroupsFormValues {
  groups: {
    id: string;
    selectionType: OptionSelectionType;
    required: boolean;
    options: { id: string; priceDelta: number }[];
  }[];
  quantityLocked: boolean;
}

/**
 * One group's row: name, single/multiple toggle, required checkbox, and its
 * own options. Pulled out so it can own its own nested `useFieldArray` for
 * `options` — hooks can't be called inside the parent's `.map`.
 *
 * Never rendered for a "customAmount" group — that type has its own
 * dedicated card (`OpenOptionCard` below) instead of living in this list.
 */
function GroupEditor({
  control,
  groupIndex,
  onRemove,
  currencySuffix,
}: {
  control: Control<OptionGroupsFormValues>;
  groupIndex: number;
  onRemove: () => void;
  currencySuffix: string;
}) {
  const { t } = useI18n();
  const options = useFieldArray({
    control,
    name: `groups.${groupIndex}.options`,
  });

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

      <p className="text-xs text-muted-foreground">{t.dashboard.priceModeHint}</p>

      <div className="space-y-2">
        {options.fields.map((field, optionIndex) => (
          <Controller
            key={field.id}
            control={control}
            name={`groups.${groupIndex}.options.${optionIndex}`}
            render={({ field: optionField }) => {
              // the price box always shows and writes `priceDelta` exactly
              // as stored — no arithmetic with the item's base price in
              // either direction. That used to not be true for a
              // single-choice group (it showed/took the option's own final
              // price, converting to/from a delta), which quietly showed an
              // owner a different number than what was actually saved.
              const value = optionField.value.priceDelta;
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
                    value={value === 0 ? "" : value}
                    onChange={(e) =>
                      optionField.onChange({
                        ...optionField.value,
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

/** the default label a freshly-enabled open option gets — the owner can
 * rename it, same as every other group's own free-text name. Exported so
 * `toOptionGroups` can fall back to it too: an item saved by an older
 * build could have this blank, and a blank label would otherwise make the
 * whole group look unworthy of saving and silently drop it. */
export const DEFAULT_OPEN_OPTION_ID = "القيمة";

/**
 * "خيار مفتوح" — a standalone card above the regular option-group list, not
 * one more type mixed into it: at most one `customAmount` group per item,
 * toggled on/off as a whole rather than added/removed like the others.
 *
 * Enabling it creates that one group; disabling removes it. While it's on,
 * two settings live inside the same card: whether picking a value is
 * required, and whether this item still multiplies by the cart's quantity
 * stepper or always sells as a flat 1x (`quantityLocked`) — both are real
 * choices an owner makes per item, not implied by the group's existence
 * alone (an owner selling "3 shawarma worth 350 each" wants the stepper to
 * keep multiplying; one selling "however much shawarma you want for your
 * own price" wants it locked at one).
 */
function OpenOptionCard({
  control,
  groups,
}: {
  control: Control<OptionGroupsFormValues>;
  groups: ReturnType<typeof useFieldArray<OptionGroupsFormValues, "groups">>;
}) {
  const { t } = useI18n();
  const watchedGroups = useWatch({ control, name: "groups" });
  const groupIndex = watchedGroups.findIndex(
    (g) => g.selectionType === "customAmount",
  );
  const enabled = groupIndex !== -1;

  const toggle = (next: boolean) => {
    if (next) {
      groups.append({
        id: DEFAULT_OPEN_OPTION_ID,
        selectionType: "customAmount",
        required: false,
        options: [],
      });
    } else if (groupIndex !== -1) {
      groups.remove(groupIndex);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-3">
      <label className="flex items-start gap-2.5">
        <Checkbox
          className="mt-0.5"
          checked={enabled}
          onCheckedChange={(v) => toggle(v === true)}
        />
        <span>
          <span className="text-sm font-semibold">
            {t.dashboard.openOptionTitle}
          </span>
          <span className="block text-xs text-muted-foreground">
            {t.dashboard.openOptionHint}
          </span>
        </span>
      </label>

      {enabled && (
        <div className="space-y-3 border-t border-primary/15 pt-3">
          <Controller
            control={control}
            name={`groups.${groupIndex}.id`}
            render={({ field }) => (
              <Input
                value={field.value}
                onChange={field.onChange}
                placeholder={t.dashboard.optionGroupNamePlaceholder}
                className="h-9 bg-background"
              />
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
          <Controller
            control={control}
            name="quantityLocked"
            render={({ field }) => (
              <label className="flex items-start gap-2.5">
                <Checkbox
                  className="mt-0.5"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <span>
                  <span className="text-xs font-semibold">
                    {t.dashboard.openOptionCancelQuantity}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t.dashboard.openOptionCancelQuantityHint}
                  </span>
                </span>
              </label>
            )}
          />
        </div>
      )}
    </div>
  );
}

/**
 * The option-groups editor's full body — the open-option card, then the
 * regular group list plus the size/color/custom preset buttons — shared by
 * the dedicated options modal (editing an existing item) and the add-item
 * dialog (building an item's options as part of creating it). The host
 * form's values type just needs to match `OptionGroupsFormValues`.
 */
export function OptionGroupsFields({
  control,
  currencySuffix,
  isStore = false,
}: {
  control: Control<OptionGroupsFormValues>;
  currencySuffix: string;
  /** the "color" preset only makes sense for a store's products */
  isStore?: boolean;
}) {
  const { t } = useI18n();
  const groups = useFieldArray({ control, name: "groups" });

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
    <div className="space-y-3">
      <OpenOptionCard control={control} groups={groups} />

      {groups.fields.map((field, index) =>
        field.selectionType === "customAmount" ? null : (
          <GroupEditor
            key={field.id}
            control={control}
            groupIndex={index}
            onRemove={() => groups.remove(index)}
            currencySuffix={currencySuffix}
          />
        ),
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => addGroup("size")}>
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
  );
}
