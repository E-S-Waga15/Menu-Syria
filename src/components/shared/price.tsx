import { currencyLabel } from "@/features/public-menu/lib/format";
import type { CurrencyCode } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Renders an amount and its currency label as two separate elements in
 * explicit flex order, instead of one string left to the browser's own
 * bidi reordering. Every currency label here is single-script (`"ل.س"`/
 * `"دولار"` in Arabic, `"SYP"`/`"$"` in English — see `currencyLabel`), so
 * there's never script-mixing inside either piece; only the ORDER of the
 * two pieces needs to flip per language, which a flex container (following
 * the page's own direction) does deterministically. A plain `dir="ltr"`
 * wrapper around the combined string was tried before and kept reordering
 * correctly for one language's currency label and wrong for the other's.
 *
 * Arabic: amount first (read first, right-aligned in RTL), currency to its
 * left — "١٠ ل.س" reads amount-then-currency. English: the reverse, "SYP
 * 10" / "$10" — currency leads, matching normal English currency notation.
 */
export function Price({
  amount,
  currency,
  lang,
  className,
}: {
  amount: number | null | undefined;
  currency: CurrencyCode | string;
  lang: "ar" | "en";
  className?: string;
}) {
  const label = currencyLabel(currency, lang);
  const number = (amount ?? 0).toLocaleString("en-US");

  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      {lang === "ar" ? (
        <>
          <span dir="ltr">{number}</span>
          <span>{label}</span>
        </>
      ) : (
        <>
          <span>{label}</span>
          <span dir="ltr">{number}</span>
        </>
      )}
    </span>
  );
}
