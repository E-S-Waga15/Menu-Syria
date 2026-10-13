"use client";

import { Button } from "@/components/ui/button";

/**
 * A floating save/discard bar for staged edits — modelled on the storefront's
 * floating cart button (same fixed pill at the bottom of the screen), but for
 * "you have changes waiting" instead of "you have items waiting". Nothing it
 * triggers writes anything itself; the caller still owns the confirm step.
 */
export function PendingChangesBar({
  message,
  saveLabel,
  discardLabel,
  onSave,
  onDiscard,
  pending = false,
}: {
  message: string;
  saveLabel: string;
  discardLabel: string;
  onSave: () => void;
  onDiscard: () => void;
  pending?: boolean;
}) {
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-lg animate-cart-pop">
      <div className="flex items-center justify-between gap-3 rounded-full bg-primary py-2.5 ps-5 pe-2 text-primary-foreground transform-gpu transition-[translate,scale] duration-200 ease-smooth">
        <span className="min-w-0 truncate text-sm font-semibold">
          {message}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
            onClick={onDiscard}
          >
            {discardLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            loading={pending}
            onClick={onSave}
          >
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
