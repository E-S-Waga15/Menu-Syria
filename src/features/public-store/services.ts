import { apiFetch, apiGetOrUndefined, IS_MOCK, mockDelay } from "@/lib/api/client";
import {
  governorates,
  regions,
  storeCategories,
  storeProducts,
  stores,
} from "@/lib/mock/data";
import type {
  CatalogOptionGroup,
  LocalizedText,
  Store,
  StoreCategory,
  StoreProduct,
} from "@/lib/types";

export interface PublicStoreCatalog {
  store: Store;
  categories: StoreCategory[];
  products: StoreProduct[];
  governorateName: LocalizedText;
  regionName: LocalizedText;
}

// ---------------------------------------------------------------------------
// `GET /store-catalog/:slug` response normalization — same mismatch as
// `features/public-menu/services.ts`'s `getPublicMenu`: the backend
// (`public.service.ts`'s `getPublicStoreCatalog`) keys rows by `businessId`
// and nests option groups under `attributes.optionGroups`, not at the
// product's top level. Unwrapped here the same way, so the product modal's
// `item.optionGroups` read (shared with `public-menu`'s `dish-modal.tsx` —
// stores route through the same storefront machinery per AGENTS.md) is
// never silently empty for a real product with size/add-on options.
// ---------------------------------------------------------------------------

interface RawRecord {
  [key: string]: unknown;
}

function normalizePublicCategory(
  raw: RawRecord,
  storeId: string,
): StoreCategory {
  return {
    id: String(raw.id),
    storeId: String(raw.businessId ?? raw.storeId ?? storeId),
    name: raw.name as LocalizedText,
    sortOrder: Number(raw.sortOrder ?? 0),
  };
}

function normalizePublicProduct(raw: RawRecord, storeId: string): StoreProduct {
  const attributes = (raw.attributes ?? {}) as RawRecord;
  const optionGroups =
    (attributes.optionGroups as CatalogOptionGroup[] | undefined) ??
    (raw.optionGroups as CatalogOptionGroup[] | undefined);
  const images = Array.isArray(raw.images) ? (raw.images as string[]) : [];

  return {
    id: String(raw.id),
    categoryId: String(raw.categoryId),
    storeId: String(raw.businessId ?? raw.storeId ?? storeId),
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

export async function getStores(): Promise<Store[]> {
  if (IS_MOCK) return mockDelay(stores, 200);
  return apiFetch("/stores");
}

export async function getStoreBySlug(
  slug: string,
): Promise<Store | undefined> {
  if (IS_MOCK) return mockDelay(stores.find((s) => s.slug === slug), 150);
  return apiGetOrUndefined(`/stores/${slug}`);
}

export async function getPublicStoreCatalog(
  slug: string,
): Promise<PublicStoreCatalog | undefined> {
  if (IS_MOCK) {
    const store = stores.find((s) => s.slug === slug);
    if (!store) return mockDelay(undefined);
    // Demo data ships one full catalog; every store sells it for now
    const categories = storeCategories
      .map((c) => ({ ...c, storeId: store.id }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const products = storeProducts.map((p) => ({ ...p, storeId: store.id }));
    const governorateName = governorates.find(
      (g) => g.id === store.governorateId,
    )?.name ?? { ar: "", en: "" };
    const regionName = regions.find((r) => r.id === store.regionId)?.name ?? {
      ar: "",
      en: "",
    };
    return mockDelay({
      store,
      categories,
      products,
      governorateName,
      regionName,
    });
  }
  const raw = await apiGetOrUndefined<{
    store: Store;
    categories: RawRecord[];
    products: RawRecord[];
    governorateName: LocalizedText;
    regionName: LocalizedText;
  }>(`/store-catalog/${slug}`);
  if (!raw) return undefined;
  const storeId = raw.store.id;
  return {
    store: raw.store,
    categories: raw.categories.map((c) => normalizePublicCategory(c, storeId)),
    products: raw.products.map((p) => normalizePublicProduct(p, storeId)),
    governorateName: raw.governorateName,
    regionName: raw.regionName,
  };
}
