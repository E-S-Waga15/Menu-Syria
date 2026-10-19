"use client";

import Image from "next/image";
import { useState } from "react";

import { Check, LayoutList } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StorefrontCopy } from "@/features/public-menu/lib/format";
import { useI18n } from "@/i18n/client";
import type { RestaurantTheme } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  name: { ar: string; en: string };
  imageUrl?: string;
}

/**
 * Section picker for storefronts with a long category bar.
 *
 * Past a handful of sections the horizontal bar stops being a list you can
 * read and becomes one you have to drag through, and whatever sits off-screen
 * is effectively hidden. This puts the whole set in one glance instead.
 *
 * The trigger sits outside the scrolling bar rather than inside it, so it stays
 * put no matter how far the pills are dragged.
 */
export function CategoryMenu({
  sections,
  activeId,
  onSelect,
  copy,
  theme,
}: {
  sections: Section[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
  copy: StorefrontCopy;
  /**
   * Passed explicitly: DialogContent portals to document.body, outside the
   * element where menu-screen declares --menu-primary, so the variable would
   * not inherit into the panel.
   */
  theme: RestaurantTheme;
}) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);

  const pick = (id: string) => {
    setOpen(false);
    onSelect(id);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={copy.sectionsTitle}
        title={copy.sectionsTitle}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-container text-foreground/70 transition-colors duration-200 hover:bg-surface-container-high hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:size-10"
      >
        <LayoutList className="size-4.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[80dvh] overflow-y-auto scrollbar-none sm:max-w-sm"
          style={
            { "--menu-primary": theme.primaryColor } as React.CSSProperties
          }
        >
          <DialogHeader>
            <DialogTitle className="text-base">
              {copy.sectionsTitle}
            </DialogTitle>
          </DialogHeader>

          <ul className="mt-1 space-y-1">
            {sections.map((section) => {
              const isActive = section.id === activeId;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => pick(section.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      // 44px touch target — this is tapped on a phone
                      "flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-start text-sm font-semibold transition-colors duration-200",
                      isActive
                        ? "bg-[var(--menu-primary)]/8 text-[var(--menu-primary)]"
                        : "text-foreground/80 hover:bg-surface-container",
                    )}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2.5 truncate">
                      {section.imageUrl && (
                        <Image
                          src={section.imageUrl}
                          alt=""
                          width={24}
                          height={24}
                          className="size-6 shrink-0 rounded-full object-cover"
                        />
                      )}
                      <span className="truncate">{section.name[lang]}</span>
                    </span>
                    {isActive && (
                      <Check
                        className="size-4 shrink-0 text-[var(--menu-primary)]"
                        strokeWidth={3}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
