"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";

/**
 * Inline fallback for a page whose data fetch failed (the backend's own
 * 500, a timeout, a malformed response) — shown instead of leaving a
 * failed SSR fetch to crash the whole render with no page at all (which
 * shows up as a bare browser connection failure), or leaving a client
 * query to spin forever with no way out.
 */
export function FetchError({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
      <p className="font-heading text-lg font-semibold">
        {t.common.loadErrorTitle}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t.common.loadErrorBody}
      </p>
      <Button onClick={onRetry ?? (() => window.location.reload())}>
        <RefreshCw className="size-4" />
        {t.common.retry}
      </Button>
    </div>
  );
}
