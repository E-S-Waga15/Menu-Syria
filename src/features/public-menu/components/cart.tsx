"use client";

import { ShoppingBag } from "lucide-react";

import { Price } from "@/components/shared/price";
import type { StorefrontCopy } from "@/features/public-menu/lib/format";
import { useI18n } from "@/i18n/client";
import {
  selectCartCount,
  selectCartTotal,
  useCartStore,
} from "@/stores/cart-store";
import { useUiStore } from "@/stores/ui-store";

export function FloatingCartBar({ copy }: { copy: StorefrontCopy }) {
  const { t, lang } = useI18n();
  const count = useCartStore(selectCartCount);
  const total = useCartStore(selectCartTotal);
  const setCartSheetOpen = useUiStore((s) => s.setCartSheetOpen);

  if (count === 0) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-lg animate-cart-pop">
      <button
        type="button"
        onClick={() => setCartSheetOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-full bg-[var(--menu-primary)] py-3.5 ps-5 pe-6 transform-gpu text-white transition-transform duration-200 ease-smooth hover:scale-[1.015] active:scale-[0.99]"
      >
        <span className="flex items-center gap-3">
          <span className="relative">
            <ShoppingBag className="size-5.5" />
            <span
              key={count}
              className="absolute -top-2 -end-2 flex size-5 animate-cart-pop items-center justify-center rounded-full bg-white text-[0.65rem] font-bold text-[var(--menu-primary)]"
            >
              {count}
            </span>
          </span>
          <span className="text-sm font-bold">{copy.viewOrder}</span>
        </span>
        <Price amount={total} currency={t.common.currency} lang={lang} className="text-sm font-bold" />
      </button>
    </div>
  );
}
