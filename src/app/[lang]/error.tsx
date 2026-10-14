"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Catches a render crash anywhere under `[lang]` (every page in the app)
 * instead of leaving it to bubble past Next with no fallback — without
 * this, a thrown error during the server render pass can cut the HTML
 * response short, which browsers show as a bare connection failure rather
 * than a page at all. Bilingual and dictionary-free on purpose: the crash
 * this is catching may itself be inside the i18n/data-fetching path.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-heading text-6xl font-bold text-berry-soft-foreground/30">
        !
      </p>
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold">
          حدث خطأ غير متوقع — Something went wrong
        </h1>
        <p className="text-muted-foreground">
          يرجى المحاولة مرة أخرى. — Please try again.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-[1.02]"
        >
          إعادة المحاولة · Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-6 py-2.5 font-semibold transition-colors hover:bg-accent"
        >
          الرئيسية · Home
        </Link>
      </div>
    </main>
  );
}
