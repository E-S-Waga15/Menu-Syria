import { apiFetch, apiGetOrUndefined, IS_MOCK, mockDelay } from "@/lib/api/client";
import { applyRecoveredBusinessFields } from "@/lib/business-text";
import {
  governorates,
  menuCategories,
  menuItems,
  regions,
  restaurants,
} from "@/lib/mock/data";
import type {
  CatalogOptionGroup,
  LocalizedText,
  MenuCategory,
  MenuItem,
  Restaurant,
} from "@/lib/types";

export interface PublicMenu {
  restaurant: Restaurant;
  categories: MenuCategory[];
  items: MenuItem[];
  governorateName: LocalizedText;
  regionName: LocalizedText;
}

// ---------------------------------------------------------------------------
// `GET /menu/:slug` response normalization
// ---------------------------------------------------------------------------
//
// `public.service.ts`'s `getPublicMenu` (backend) sends categories/items
// keyed by `businessId`, not `restaurantId`, and — critically — nests option
// groups inside `attributes.optionGroups` rather than at the item's top
// level (`attributes: i.attributes ?? { optionGroups: [] }`). Reading
// `item.optionGroups` directly, which is what `dish-modal.tsx` does, was
// always `undefined` against the real backend: every option/add-on picker
// on the live public menu silently never rendered. This mirrors the same
// unwrap `restaurant-dashboard/services.ts`'s `normalizeItem` already does
// for the owner-facing `/me/menu` and `/items` endpoints.

interface RawRecord {
  [key: string]: unknown;
}

function normalizePublicCategory(
  raw: RawRecord,
  restaurantId: string,
): MenuCategory {
  return {
    id: String(raw.id),
    restaurantId: String(raw.businessId ?? raw.restaurantId ?? restaurantId),
    name: raw.name as LocalizedText,
    sortOrder: Number(raw.sortOrder ?? 0),
  };
}

function normalizePublicItem(raw: RawRecord, restaurantId: string): MenuItem {
  const attributes = (raw.attributes ?? {}) as RawRecord;
  const optionGroups =
    (attributes.optionGroups as CatalogOptionGroup[] | undefined) ??
    (raw.optionGroups as CatalogOptionGroup[] | undefined);
  const images = Array.isArray(raw.images) ? (raw.images as string[]) : [];

  return {
    id: String(raw.id),
    categoryId: String(raw.categoryId),
    restaurantId: String(raw.businessId ?? raw.restaurantId ?? restaurantId),
    name: raw.name as LocalizedText,
    description: raw.description as LocalizedText,
    price: Number(raw.price ?? 0),
    currency: raw.currency === "USD" ? "USD" : "SYP",
    imageUrl: String(raw.imageUrl ?? images[0] ?? ""),
    images: images.length ? images : undefined,
    optionGroups: optionGroups?.length ? optionGroups : undefined,
    isAvailable: raw.isAvailable !== false,
    sortOrder: Number(raw.sortOrder ?? 0),
  };
}

export async function getPublicMenu(
  slug: string,
): Promise<PublicMenu | undefined> {
  if (IS_MOCK) {
    const restaurant = restaurants.find((r) => r.slug === slug);
    if (!restaurant) return mockDelay(undefined);
    // Demo data ships one full menu; every restaurant serves it for now
    const categories = menuCategories
      .map((c) => ({ ...c, restaurantId: restaurant.id }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const items = menuItems.map((i) => ({
      ...i,
      restaurantId: restaurant.id,
    }));
    const governorateName = governorates.find(
      (g) => g.id === restaurant.governorateId,
    )?.name ?? { ar: "", en: "" };
    const regionName = regions.find((r) => r.id === restaurant.regionId)
      ?.name ?? { ar: "", en: "" };
    return mockDelay({
      restaurant,
      categories,
      items,
      governorateName,
      regionName,
    });
  }
  const raw = await apiGetOrUndefined<{
    restaurant: Restaurant;
    categories: RawRecord[];
    items: RawRecord[];
    governorateName: LocalizedText;
    regionName: LocalizedText;
  }>(`/menu/${slug}`);
  if (!raw) return undefined;
  const restaurantId = raw.restaurant.id;
  return {
    restaurant: applyRecoveredBusinessFields(raw.restaurant),
    categories: raw.categories.map((c) => normalizePublicCategory(c, restaurantId)),
    items: raw.items.map((i) => normalizePublicItem(i, restaurantId)),
    governorateName: raw.governorateName,
    regionName: raw.regionName,
  };
}

// ---------------------------------------------------------------------------
// Guest ordering
// ---------------------------------------------------------------------------

/**
 * What the backend returns after a customer places an order through the
 * platform (`POST /public/businesses/:slug/orders`). The `whatsappLink` is
 * how the order physically reaches the business — the public endpoint both
 * records the order and builds the message that hands it over.
 */
export interface ExternalOrderResponse {
  id: string;
  businessId: string;
  status: string;
  totalAmount: number;
  customerName: string;
  customerPhone: string;
  notes: string | null;
  createdAt: string;
  items: {
    itemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  whatsappLink: string | null;
}

export interface ExternalOrderInput {
  customerName: string;
  customerPhone: string;
  notes?: string;
  /** routes the WhatsApp order link to that branch's own phone instead of
   * the business's main number */
  branchId?: string;
  /** real menu/catalog item UUIDs — offer bundles use synthetic `offer-` ids
   * and cannot be submitted through this endpoint yet */
  items: {
    itemId: string;
    quantity: number;
    /** the options the customer picked, by id within their group — a
     * "customAmount" group's pick also carries the customer-typed final
     * price as `amount`, since there's no predefined option for the
     * backend to look a price up by id for (see update.md) */
    options?: { id: string; amount?: number }[];
  }[];
}

/** Place a guest order through the platform. */
export async function placeExternalOrder(
  slug: string,
  input: ExternalOrderInput,
): Promise<ExternalOrderResponse> {
  if (IS_MOCK) {
    return mockDelay<ExternalOrderResponse>({
      id: "mock-order-id",
      businessId: "",
      status: "pending",
      totalAmount: 0,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      notes: input.notes ?? null,
      createdAt: new Date().toISOString(),
      items: [],
      whatsappLink: null,
    });
  }
  return apiFetch(`/public/businesses/${slug}/orders`, {
    method: "POST",
    body: input,
  });
}

// ---------------------------------------------------------------------------
// Analytics event tracking — public, no token, fire-and-forget
// ---------------------------------------------------------------------------

/** A visitor opened this item's details — once per open. */
export function trackItemView(itemId: string): void {
  if (IS_MOCK || !itemId) return;
  void apiFetch(`/public/items/${itemId}/view`, { method: "POST" }).catch(
    () => {
      // the stat is lost, not the visitor's action — never surface this
    },
  );
}

/** A visitor pressed "add to cart" for this item. */
export function trackItemCartAdd(itemId: string): void {
  if (IS_MOCK || !itemId) return;
  void apiFetch(`/public/items/${itemId}/cart-add`, { method: "POST" }).catch(
    () => {},
  );
}
