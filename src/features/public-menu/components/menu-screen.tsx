"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { Armchair, Info, MapPin, Phone, Search, Star } from "lucide-react";

import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { FloatingCartBar } from "@/features/public-menu/components/cart";
import { StorefrontOffers } from "@/features/offers/components/storefront-offers";
import { getLiveOffers } from "@/features/offers/services";
import { CategoryMenu } from "@/features/public-menu/components/category-menu";
import { DishCard } from "@/features/public-menu/components/dish-card";
import { getSupportedFulfillment } from "@/features/public-menu/lib/fulfillment";
import { trackItemCartAdd } from "@/features/public-menu/services";
import type { StorefrontCopy } from "@/features/public-menu/lib/format";
import { useI18n } from "@/i18n/client";
import { queryKeys } from "@/lib/api/query-keys";
import type {
  Business,
  CatalogItem,
  FulfillmentMode,
  LocalizedText,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { selectCartCount, useCartStore } from "@/stores/cart-store";
import { useUiStore } from "@/stores/ui-store";

// Overlays load as separate chunks on first use — a QR visitor scrolling
// the menu never downloads the modal/checkout JS until they need it.
const DishModal = dynamic(
  () =>
    import("@/features/public-menu/components/dish-modal").then(
      (m) => m.DishModal,
    ),
  { ssr: false },
);
const CartSheet = dynamic(
  () =>
    import("@/features/public-menu/components/cart-sheet").then(
      (m) => m.CartSheet,
    ),
  { ssr: false },
);

export interface StorefrontCategory {
  id: string;
  name: LocalizedText;
  sortOrder: number;
}

/**
 * The customer-facing storefront screen — renders a restaurant menu or an
 * e-commerce catalog depending on the data and label pack passed in.
 */
/**
 * Past this many sections the horizontal bar becomes something you drag rather
 * than read, so a picker is offered alongside it. At or below it the pills
 * already fit and the extra control would be noise.
 */
const SECTION_MENU_THRESHOLD = 4;

export function MenuScreen({
  business,
  subtitle,
  categories,
  items,
  governorateName,
  regionName,
  aboutHref,
  offersHref,
  copy,
  tableParam,
}: {
  business: Business;
  /** cuisine for restaurants, store category for shops */
  subtitle: LocalizedText;
  categories: StorefrontCategory[];
  items: CatalogItem[];
  governorateName: LocalizedText;
  regionName: LocalizedText;
  aboutHref: string;
  /** the storefront's own offers page — the strip links there */
  offersHref: string;
  copy: StorefrontCopy;
  /** the `?t=` table id, read server-side — present only for a real table QR */
  tableParam?: string;
}) {
  const { t, lang } = useI18n();
  const addItem = useCartStore((s) => s.addItem);
  const clearCart = useCartStore((s) => s.clear);
  const cartCount = useCartStore(selectCartCount);

  // the cart is scoped to a single visit to this storefront: checkout itself
  // stays on this page (the sheet is an overlay, not a route), so the only
  // way to "leave" is to navigate elsewhere — at which point a cart left
  // behind in storage would otherwise resurface, unexplained, whenever the
  // customer next lands on any menu page
  useEffect(() => {
    return () => {
      if (useCartStore.getState().restaurantId === business.id) clearCart();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  const supportedModes = useMemo(
    () => getSupportedFulfillment(business),
    [business],
  );
  const [fulfillment, setFulfillment] = useState<FulfillmentMode>(() =>
    tableParam && supportedModes.includes("dineIn")
      ? "dineIn"
      : "cuisine" in business
        ? "pickup"
        : "delivery",
  );

  // offers are fetched client-side: they change on the owner's schedule, not
  // the page's, and the catalog below must not wait on them to paint
  const { data: offers } = useQuery({
    queryKey: queryKeys.offers.live(business.id),
    queryFn: () => getLiveOffers(business.id),
  });

  const [search, setSearch] = useState("");
  const [compact, setCompact] = useState(false);
  const [openedDish, setOpenedDish] = useState<CatalogItem | null>(null);
  const setCartSheetOpen = useUiStore((s) => s.setCartSheetOpen);
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  // Suspends the scroll-spy while a pill click drives a smooth scroll
  const spySuspended = useRef(false);
  const spyResumeTimer = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 56);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = Object.values(sectionRefs.current).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (spySuspended.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveCategory(visible.target.id.replace("cat-", ""));
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [categories, search]);

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    spySuspended.current = true;
    if (spyResumeTimer.current !== null)
      window.clearTimeout(spyResumeTimer.current);
    spyResumeTimer.current = window.setTimeout(() => {
      spySuspended.current = false;
    }, 900);
    sectionRefs.current[categoryId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const query = search.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      query === ""
        ? items
        : items.filter(
            (item) =>
              item.name.ar.toLowerCase().includes(query) ||
              item.name.en.toLowerCase().includes(query) ||
              item.description.ar.toLowerCase().includes(query) ||
              item.description.en.toLowerCase().includes(query),
          ),
    [items, query],
  );

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of filteredItems) {
      const list = map.get(item.categoryId) ?? [];
      list.push(item);
      map.set(item.categoryId, list);
    }
    for (const list of map.values())
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    return map;
  }, [filteredItems]);

  const handleAdd = (item: CatalogItem) => {
    trackItemCartAdd(item.id);
    addItem(business.id, item);
  };

  return (
    <div
      className="min-h-dvh bg-background"
      style={
        {
          "--menu-primary": business.theme.primaryColor,
          "--menu-secondary": business.theme.secondaryColor,
        } as React.CSSProperties
      }
    >
      {/* shrinking header */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4">
          <div
            className={cn(
              "overflow-hidden transition-[max-height,opacity] duration-300 ease-smooth",
              compact ? "max-h-0 opacity-0" : "max-h-44 opacity-100",
            )}
          >
            {/* identity row */}
            <div className="flex items-center gap-2.5 pt-2.5 sm:gap-3.5 sm:pt-3">
              {business.logoUrl ? (
                <Image
                  src={business.logoUrl}
                  alt=""
                  width={72}
                  height={72}
                  className="size-12 rounded-2xl border-2 border-[var(--menu-primary)]/20 object-cover sm:size-16 md:size-18"
                />
              ) : (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--menu-primary)]/20 bg-berry-soft text-sm font-bold text-berry-soft-foreground sm:size-16 md:size-18">
                  {business.name[lang].charAt(0)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-heading text-base font-bold sm:text-lg md:text-xl">
                  {business.name[lang]}
                </h1>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground sm:gap-1.5 sm:text-xs">
                  <Star className="size-2.5 fill-zest text-zest sm:size-3" />
                  {business.rating} · {subtitle[lang]}
                </p>
                {/* the details page lives inside the storefront route — the only
                    destination a QR visitor can reach, with no site chrome */}
                <Link
                  href={aboutHref}
                  className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--menu-primary)] hover:underline sm:mt-1 sm:text-xs"
                >
                  <Info className="size-3 sm:size-3.5" />
                  {copy.viewRestaurantDetails}
                </Link>
              </div>
              {/* table chip when dine-in, otherwise the open/closed status */}
              {fulfillment === "dineIn" ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--menu-primary)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--menu-primary)] sm:gap-1.5 sm:px-3.5 sm:py-1.5 sm:text-xs">
                  <Armchair className="size-3 sm:size-3.5" />
                  {copy.tableLabel} {tableParam}
                </span>
              ) : (
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs",
                    business.isOpen
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      business.isOpen ? "bg-success" : "bg-muted-foreground",
                    )}
                  />
                  {business.isOpen
                    ? t.restaurant.openNow
                    : t.restaurant.closedNow}
                </span>
              )}
              <LanguageSwitcher />
            </div>

            {/* location + call — only relevant once the customer isn't already at a table */}
            {fulfillment !== "dineIn" && (
              <div className="scrollbar-none -mx-4 mt-2 flex items-center gap-x-1.5 gap-y-1 overflow-x-auto px-4 pb-1 text-[11px] font-semibold text-muted-foreground sm:mt-2.5 sm:gap-x-2 sm:text-xs">
                <span className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                  <MapPin className="size-3 text-[var(--menu-primary)] sm:size-3.5" />
                  {governorateName[lang]}
                  {lang === "ar" ? "، " : ", "}
                  {regionName[lang]}
                </span>
                <a
                  href={`tel:${business.phone.replace(/\s/g, "")}`}
                  className="ms-auto flex shrink-0 items-center gap-1 rounded-full bg-[var(--menu-primary)]/10 px-2.5 py-1 font-bold text-[var(--menu-primary)] transition-colors duration-200 hover:bg-[var(--menu-primary)]/20 sm:gap-1.5 sm:px-3.5 sm:py-1.5"
                >
                  <Phone className="size-3 sm:size-3.5" />
                  {t.restaurant.call}
                </a>
              </div>
            )}
          </div>

          <div
            className={cn(
              "pb-2.5 sm:pb-3",
              compact ? "pt-2.5 sm:pt-3" : "pt-1",
            )}
          >
            <div className="relative">
              <Search className="absolute start-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground sm:start-4 sm:size-4" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="h-9 w-full rounded-full border border-border/70 bg-surface-container-low ps-9 pe-4 text-[13px] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--menu-primary)] focus:ring-2 focus:ring-[var(--menu-primary)]/25 sm:h-11 sm:ps-11 sm:text-sm"
              />
            </div>
          </div>

          {/* categories pills */}
          {query === "" && (
            <div className="flex items-start gap-2 pb-2.5 sm:pb-3">
              {categories.length > SECTION_MENU_THRESHOLD && (
                <CategoryMenu
                  sections={categories}
                  activeId={activeCategory}
                  onSelect={scrollToCategory}
                  copy={copy}
                  theme={business.theme}
                />
              )}
              <nav
                aria-label={copy.sectionsLabel}
                className="scrollbar-none -me-4 flex flex-1 gap-1.5 overflow-x-auto pe-4 sm:gap-2"
              >
                {categories.map((category) => {
                  const isActive = category.id === activeCategory;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => scrollToCategory(category.id)}
                      className={cn(
                        "shrink-0 transform-gpu rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-[background-color,color,translate,scale] duration-300 ease-smooth sm:px-4.5 sm:py-2 sm:text-sm",
                        isActive
                          ? "bg-[var(--menu-primary)] text-white"
                          : "bg-surface-container text-foreground/70 hover:bg-surface-container-high",
                      )}
                    >
                      {category.name[lang]}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* content */}
      <main
        className={cn(
          "mx-auto max-w-5xl px-4 pb-32 transition-[padding]",
          compact ? "pt-32" : "pt-60",
          query !== "" && (compact ? "pt-28" : "pt-56"),
        )}
      >
        {query === "" && (
          <StorefrontOffers
            offers={offers ?? []}
            isStore={!("cuisine" in business)}
            offersHref={offersHref}
          />
        )}

        {query !== "" ? (
          <section>
            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
              {filteredItems.map((item) => (
                <DishCard
                  key={item.id}
                  item={item}
                  copy={copy}
                  onAdd={handleAdd}
                  onOpen={setOpenedDish}
                />
              ))}
            </div>
            {filteredItems.length === 0 && (
              <p className="py-16 text-center text-muted-foreground">
                {copy.emptyCartBody}
              </p>
            )}
          </section>
        ) : items.length === 0 ? (
          // a real, empty storefront — the owner has not published a menu
          // yet — reads very differently from "no category has anything
          // visible", which is a layout accident this branch would rather
          // not claim happened
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <Info className="size-8 text-muted-foreground/40" />
            <p className="font-semibold">{copy.noMenuItems}</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              {copy.noMenuItemsBody}
            </p>
          </div>
        ) : (
          categories.map((category) => {
            const categoryItems = itemsByCategory.get(category.id) ?? [];
            if (categoryItems.length === 0) return null;
            return (
              <section
                key={category.id}
                id={`cat-${category.id}`}
                ref={(el) => {
                  sectionRefs.current[category.id] = el;
                }}
                className="scroll-mt-44 pt-8 first:pt-2"
              >
                <h2 className="font-heading text-xl font-bold">
                  {category.name[lang]}
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                  {categoryItems.map((item) => (
                    <DishCard
                      key={item.id}
                      item={item}
                      copy={copy}
                      onAdd={handleAdd}
                      onOpen={setOpenedDish}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>

      <FloatingCartBar copy={copy} />
      {/* mount lazily: the chunk downloads when the cart first has items /
          a dish is first opened, not on initial page load */}
      {cartCount > 0 && (
        <CartSheet
          business={business}
          copy={copy}
          fulfillment={fulfillment}
          onFulfillmentChange={setFulfillment}
          tableNumber={tableParam}
          onOpenItem={(item) => {
            // one panel at a time: the cart closes as the product opens, so
            // going back lands on the cart rather than stacking two sheets
            setCartSheetOpen(false);
            setOpenedDish(item);
          }}
        />
      )}
      {openedDish && (
        <DishModal
          item={openedDish}
          businessId={business.id}
          theme={business.theme}
          copy={copy}
          onClose={() => setOpenedDish(null)}
        />
      )}
    </div>
  );
}
