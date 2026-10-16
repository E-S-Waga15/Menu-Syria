"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fmt, useI18n } from "@/i18n/client";

/** Default page size for an admin console grid/list — divisible by 2, 3 and
 * 4 so a grid never ends on a half-empty row at any breakpoint. */
export const ADMIN_PAGE_SIZE = 24;

/**
 * Prev/next pager shared by every admin list — until the backend list
 * endpoints accept `page`/`limit` (see update.md), this paginates whatever
 * array the page already fetched and filtered client-side; swapping to
 * server-driven pagination later only changes where `totalPages` comes
 * from, not this component.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const { t, dir } = useI18n();
  if (totalPages <= 1) return null;

  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <nav
      aria-label={t.common.pageOfTotal}
      className="flex items-center justify-center gap-3 pt-2"
    >
      <Button
        variant="outline"
        size="icon-sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label={t.common.previousPage}
      >
        <PrevIcon className="size-4" />
      </Button>
      <span className="text-sm font-semibold text-muted-foreground tabular-nums">
        {fmt(t.common.pageOfTotal, { page, total: totalPages })}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label={t.common.nextPage}
      >
        <NextIcon className="size-4" />
      </Button>
    </nav>
  );
}
