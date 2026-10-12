import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Shared governorate (+ optional region) picker — every screen that filters
 * or collects a location (directory search bars, registration forms) goes
 * through this instead of re-declaring the same pair of `Select`s.
 *
 * The height carries `!`: SelectTrigger ships `data-[size=default]:h-8`, whose
 * attribute selector outranks a plain `h-11` class (0,2,0 beats 0,1,0), so
 * without it every one of these fields silently rendered 32px tall next to a
 * 44px search input. Padding is set here too — the trigger's own `ps-2.5` is
 * scaled for the 32px default and looks pinched at this size.
 *
 * Pass
 * `regionItems`/`onRegionChange` to render the dependent region field next
 * to the governorate one; omit them for a governorate-only picker.
 */
/** matches the 44px search inputs these selects sit beside */
const FIELD = "h-11! w-full gap-2 pe-3.5 ps-4 text-sm";

export function GovernorateRegionSelect({
  governorateValue,
  onGovernorateChange,
  governorateItems,
  governorateAriaLabel,
  governorateInvalid,
  governorateDisabled,
  regionValue,
  onRegionChange,
  regionItems,
  regionAriaLabel,
  regionDisabled,
  triggerClassName,
  className,
  /** true = return the two fields unwrapped (for a caller that already
   * places them inside its own grid, e.g. alongside a search input) */
  unwrapped = false,
}: {
  governorateValue: string;
  onGovernorateChange: (value: string) => void;
  governorateItems: Record<string, string>;
  governorateAriaLabel: string;
  governorateInvalid?: boolean;
  governorateDisabled?: boolean;
  regionValue?: string;
  onRegionChange?: (value: string) => void;
  regionItems?: Record<string, string>;
  regionAriaLabel?: string;
  regionDisabled?: boolean;
  triggerClassName?: string;
  className?: string;
  unwrapped?: boolean;
}) {
  const governorateSelect = (
    <Select
      value={governorateValue || null}
      onValueChange={(v) => v && onGovernorateChange(v)}
      items={governorateItems}
      disabled={governorateDisabled}
    >
      <SelectTrigger
        className={cn(FIELD, triggerClassName)}
        aria-label={governorateAriaLabel}
        aria-invalid={governorateInvalid}
      >
        <SelectValue placeholder={governorateAriaLabel} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(governorateItems).map(([id, label]) => (
          <SelectItem key={id} value={id}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (!regionItems || !onRegionChange) return governorateSelect;

  const regionSelect = (
    <Select
      value={regionValue || null}
      onValueChange={(v) => v && onRegionChange(v)}
      items={regionItems}
      disabled={regionDisabled}
    >
      <SelectTrigger
        className={cn(FIELD, triggerClassName)}
        aria-label={regionAriaLabel}
      >
        <SelectValue placeholder={regionAriaLabel} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(regionItems).map(([id, label]) => (
          <SelectItem key={id} value={id}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (unwrapped) {
    return (
      <>
        {governorateSelect}
        {regionSelect}
      </>
    );
  }

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {governorateSelect}
      {regionSelect}
    </div>
  );
}
