"use client";

import type { ComponentType, SVGProps } from "react";

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

const TONE_BAR: Record<Tone, string> = {
  success: "bg-success",
  info: "bg-blue-500",
  zest: "bg-zest",
  berry: "bg-primary",
  neutral: "bg-foreground/50",
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
 * label, and the number is the headline at the bottom. `highlight` draws
 * a short colored bar along the card's bottom edge for the one or two
 * cards in a row that should read as the "important" metric — use
 * `accent="berry"` (the brand color) for the single most important card
 * in a row, and `success`/`info`/`zest` for the rest so a row reads at a
 * glance instead of looking like one undifferentiated block of cards.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "berry",
  badges,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent?: Tone;
  /** small colored chips shown under the label, e.g. a trend ("+12%") or
   * a secondary count ("5 عميل") — each can carry its own tone */
  badges?: StatCardBadge[];
  /** draws a short colored bar along the card's bottom edge */
  highlight?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-3.5 pb-5 md:p-4 md:pb-6">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-muted-foreground">
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
            className="mt-2 font-heading text-lg font-bold tracking-tight md:text-2xl"
            dir="ltr"
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
      {highlight && (
        <span
          aria-hidden
          className={cn(
            "absolute bottom-0 start-1/2 h-[3px] w-10 -translate-x-1/2 rounded-full",
            TONE_BAR[accent],
          )}
        />
      )}
    </div>
  );
}
