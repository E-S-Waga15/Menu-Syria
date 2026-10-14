"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Picks up to `max` regions (an agent's coverage area, within one
 * governorate) through a dropdown instead of a wall of toggle chips —
 * a governorate can have a long region list, and showing every one of
 * them as a button doesn't scale the way picking from a list does. Each
 * pick adds a removable badge above the dropdown; the dropdown itself
 * only ever offers regions not already picked, and disables once `max`
 * is reached.
 */
export function MultiRegionPicker({
  regionChoices,
  selectedIds,
  onChange,
  placeholder,
  disabled = false,
  max = 2,
  triggerClassName,
}: {
  regionChoices: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  disabled?: boolean;
  max?: number;
  triggerClassName?: string;
}) {
  const { t } = useI18n();
  const availableChoices = regionChoices.filter(
    (r) => !selectedIds.includes(r.id),
  );
  const atMax = selectedIds.length >= max;

  const remove = (id: string) =>
    onChange(selectedIds.filter((existing) => existing !== id));
  const add = (id: string) => {
    if (atMax || selectedIds.includes(id)) return;
    onChange([...selectedIds, id]);
  };

  return (
    <div className="space-y-2">
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((id) => {
            const region = regionChoices.find((r) => r.id === id);
            if (!region) return null;
            return (
              <Badge
                key={id}
                variant="secondary"
                className="gap-1 py-1 ps-2.5 pe-1.5 text-xs"
              >
                {region.name}
                {!disabled && (
                  <button
                    type="button"
                    aria-label={t.common.delete}
                    onClick={() => remove(id)}
                    className="flex size-3.5 shrink-0 items-center justify-center rounded-full text-current transition-colors hover:bg-destructive/20 hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}
      <Select
        value={null}
        onValueChange={(v) => v && add(v)}
        items={Object.fromEntries(
          availableChoices.map((r) => [r.id, r.name]),
        )}
        disabled={disabled || atMax || availableChoices.length === 0}
      >
        <SelectTrigger className={cn("h-11! w-full", triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {availableChoices.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
