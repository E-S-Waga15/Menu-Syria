"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * A color field that pairs a native color wheel (for picking visually) with a
 * free-text input so a value in any CSS format the visitor types — a hex
 * code, `rgb(...)`, or a named color — is accepted as-is. The swatch button
 * always reflects whatever is currently typed, valid or not, since the
 * browser itself drops a color it can't render.
 */
export function ColorField({
  id,
  label,
  value,
  onChange,
  disabled = false,
  presets,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** quick-pick swatches shown under the field — skipped when absent */
  presets?: string[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2.5">
        <label
          className={cn(
            "relative size-11 shrink-0 overflow-hidden rounded-full border border-border/60 transition-transform duration-200 ease-smooth",
            disabled
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer hover:scale-105",
          )}
          style={{ backgroundColor: value || undefined }}
        >
          <input
            type="color"
            disabled={disabled}
            value={HEX.test(value) ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            aria-label={label}
          />
        </label>
        <input
          id={id}
          type="text"
          dir="ltr"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#850036"
          className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm font-mono outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      {presets && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              aria-label={preset}
              onClick={() => onChange(preset)}
              className={cn(
                "size-6 shrink-0 rounded-full border transition-transform duration-200 ease-smooth disabled:cursor-not-allowed disabled:opacity-50",
                value.toLowerCase() === preset.toLowerCase()
                  ? "border-foreground ring-2 ring-offset-2 ring-offset-background"
                  : "border-border/60 hover:scale-110",
              )}
              style={{ backgroundColor: preset }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
