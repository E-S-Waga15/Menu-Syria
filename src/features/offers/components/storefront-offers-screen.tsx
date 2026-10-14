"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Tag } from "lucide-react";

import { OfferCard } from "@/features/offers/components/offer-card";
import { getLiveOffers } from "@/features/offers/services";
import { BackToMenuBar } from "@/features/public-menu/components/back-to-menu-bar";
import { CartSheet } from "@/features/public-menu/components/cart-sheet";
import { FloatingCartBar } from "@/features/public-menu/components/cart";
import { getSupportedFulfillment } from "@/features/public-menu/lib/fulfillment";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import { selectCartCount, useCartStore } from "@/stores/cart-store";
import { useUiStore } from "@/stores/ui-store";
import type { Business, FulfillmentMode, Offer } from "@/lib/types";

const OfferModal = dynamic(
  () =>
    import("@/features/offers/components/offer-modal").then((m) => m.OfferModal),
  { ssr: false },
);

/**
 * Every live offer a storefront has, as its own page.
 *
 * It used to be a dialog opened from the strip on the menu. A dialog is the
 * wrong container for this: the list is a browsing surface with as many
 * entries as the owner cares to publish, it deserves the whole viewport on a
 * phone, and it should be a place you can be sent to — a link in a message, a
 * back button that returns you to the menu — none of which a modal offers.
 *
 * Individual offers still open in <OfferModal />, because that one *is* a
 * decision taken on top of the list: pick a bundle, set a quantity, add it.
 *
 * No site chrome, exactly like the storefront's own /about page — a QR visitor
 * moves between the menu and this page and nowhere else.
 */
export function StorefrontOffersScreen({
  business,
  menuHref,
  isStore,
  initialOffers,
}: {
  business: Business;
  /** where the back bar returns to */
  menuHref: string;
  isStore: boolean;
  /** rendered on the server so the list is in the first HTML */
  initialOffers: Offer[];
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [opened, setOpened] = useState<Offer | null>(null);
  const cartCount = useCartStore(selectCartCount);
  const setCartSheetOpen = useUiStore((s) => s.setCartSheetOpen);
  const [fulfillment, setFulfillment] = useState<FulfillmentMode>(
    () => getSupportedFulfillment(business)[0] ?? "pickup",
  );

  const { data: offers } = useQuery({
    queryKey: queryKeys.offers.live(business.id),
    queryFn: () => getLiveOffers(business.id),
    initialData: initialOffers,
  });

  return (
    <main
      className="min-h-dvh pt-14"
      style={
        {
          "--menu-primary": business.theme.primaryColor,
        } as React.CSSProperties
      }
    >
      <BackToMenuBar menuHref={menuHref} />

      <div className="container-page py-8 md:py-12">
        <header className="max-w-2xl">
          <p className="label-eyebrow text-primary">{t.offers.title}</p>
          <h1 className="text-display mt-3 text-2xl md:text-4xl">
            {business.name[lang]}
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground md:text-lg">
            {isStore ? t.offers.storefrontBody : t.offers.browseBody}
          </p>
        </header>

        {offers.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-berry-soft text-berry-soft-foreground">
              <Tag className="size-6" />
            </span>
            <p className="mt-4 font-heading text-lg font-bold">
              {t.offers.noOffers}
            </p>
          </div>
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {offers.map((offer) => (
              <li key={offer.id}>
                <OfferCard offer={offer} onClick={() => setOpened(offer)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {opened && (
        <OfferModal
          offer={opened}
          businessId={business.id}
          theme={business.theme}
          onClose={() => setOpened(null)}
        />
      )}

      <FloatingCartBar copy={isStore ? t.storeFront : t.menu} />
      {/* mount lazily, same as the menu page's own cart sheet */}
      {cartCount > 0 && (
        <CartSheet
          business={business}
          copy={isStore ? t.storeFront : t.menu}
          fulfillment={fulfillment}
          onFulfillmentChange={setFulfillment}
          onOpenItem={() => {
            // no item-detail panel on this page — send the shopper back to
            // the full menu, where every item can open its own panel
            setCartSheetOpen(false);
            router.push(menuHref);
          }}
        />
      )}
    </main>
  );
}
