"use client";

import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/utils";

/**
 * The one stat-card design shared by every dashboard/analytics screen in
 * the platform (restaurant, agent, admin) — a trend badge and the icon up
 * top, the number as the headline, the label underneath it. `highlight`
 * adds a thin accent line along the card's top edge for the one or two
 * cards in a row that should read as the "headline" metric.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "berry",
  hint,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent?: "berry" | "zest" | "neutral";
  /** a short trend/count badge shown above the value, e.g. "+12%" or "192+" */
  hint?: string;
  /** draws a colored accent line along the card's top edge */
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-card p-3.5 md:p-4",
        highlight && "border-t-0",
      )}
    >
      {highlight && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-0 top-0 h-[3px]",
            accent === "berry" && "bg-berry-soft-foreground",
            accent === "zest" && "bg-zest-soft-foreground",
            accent === "neutral" && "bg-foreground/60",
          )}
        />
      )}
      <div className="flex items-start justify-between gap-2.5">
        {hint ? (
          <span className="truncate text-xs font-bold text-success">
            {hint}
          </span>
        ) : (
          <span />
        )}
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl md:size-10",
            accent === "berry" && "bg-berry-soft text-berry-soft-foreground",
            accent === "zest" && "bg-zest-soft text-zest-soft-foreground",
            accent === "neutral" && "bg-surface-container text-foreground/70",
          )}
        >
          <Icon className="size-4.5 md:size-5" strokeWidth={1.7} />
        </span>
      </div>
      <p
        className="mt-2.5 font-heading text-lg font-bold tracking-tight md:text-2xl"
        dir="ltr"
      >
        {value}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
