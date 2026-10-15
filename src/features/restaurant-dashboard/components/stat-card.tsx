"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";

import { cn } from "@/lib/utils";

type Tone = "success" | "info" | "zest" | "berry" | "neutral";

const TONE_CHIP: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  zest: "bg-zest-soft text-zest-soft-foreground",
  berry: "bg-berry-soft text-berry-soft-foreground",
  neutral: "bg-surface-container text-foreground/70",
};

const TONE_ICON_BG: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  zest: "bg-zest-soft text-zest-soft-foreground",
  berry: "bg-berry-soft text-berry-soft-foreground",
  neutral: "bg-surface-container text-foreground/70",
};

export interface StatCardBadge {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  text: string;
  tone?: Tone;
}

/**
 * The one stat-card design shared by every dashboard/analytics screen in
 * the platform (restaurant, agent, admin) — label and icon lead the card
 * on opposite ends, small colored badges optionally sit underneath the
 * label, and the number is the headline at the bottom.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "berry",
  badges,
  numeric = true,
}: {
  label: string;
  /** usually a plain string; pass JSX when a price/number needs its own
   * explicit layout control instead of relying on bidi text reordering */
  value: ReactNode;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent?: Tone;
  /** small colored chips shown under the label, e.g. a trend ("+12%") or
   * a secondary count ("5 عميل") — each can carry its own tone */
  badges?: StatCardBadge[];
  /** true (the default) forces the value LTR, correct for a number or a
   * price. Pass false when `value` is actual text (a product name, "—")
   * so it reads in the page's own direction instead of always starting
   * from the left. */
  numeric?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3.5 md:p-4">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-muted-foreground">
            {label}
          </p>
          {badges && badges.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {badges.map((badge, i) => (
                <span
                  key={i}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    TONE_CHIP[badge.tone ?? "neutral"],
                  )}
                >
                  <badge.icon className="size-2.5" strokeWidth={2} />
                  {badge.text}
                </span>
              ))}
            </div>
          )}
          <p
            className={cn(
              "mt-2 font-heading text-base font-bold tracking-tight md:text-xl",
              numeric && "truncate",
            )}
            dir={numeric ? "ltr" : undefined}
          >
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl md:size-9",
            TONE_ICON_BG[accent],
          )}
        >
          <Icon className="size-4 md:size-4.5" strokeWidth={1.7} />
        </span>
      </div>
    </div>
  );
}
