import { apiFetch, apiGetOrUndefined, IS_MOCK, mockDelay } from "@/lib/api/client";
import {
  branches,
  bestSellingItems,
  businessInsights,
  businessStatistics,
  categoriesAnalytics,
  diningTables,
  liveActivity,
  menuCategories,
  menuItems,
  orders,
  overviewStats,
  peakTimes,
  restaurantAnalytics,
  restaurants,
  waiters,
} from "@/lib/mock/data";
import type {
  BestSellingItem,
  Branch,
  BusinessInsight,
  BusinessStatistics,
  CatalogOptionGroup,
  CategoriesAnalytics,
  CurrencyCode,
  DiningTable,
  ItemStatistics,
  LiveActivityStats,
  LocalizedText,
  MenuCategory,
  MenuItem,
  Order,
  OrderStatus,
  OverviewStats,
  PeakTimesStats,
  Restaurant,
  RestaurantAnalytics,
  Waiter,
} from "@/lib/types";

type Raw = Record<string, unknown>;

/**
 * A write response carries the backend's own success message (merged onto
 * `data` by `apiFetch`'s envelope unwrap) — but every normalizer below
 * rebuilds a fresh domain object field-by-field rather than spreading `raw`,
 * which was silently dropping it. Carrying it through as `message` lets a
 * mutation hook's `onSuccess` show the real backend sentence instead of a
 * hardcoded local string.
 */
type WithMessage<T> = T & { message?: string };

/** The write endpoints answer with single-locale rows, while `/me/menu` already
 * answers with the bilingual domain shape. Every mapper below accepts both and
 * settles on the domain shape, so a create/update response can be dropped
 * straight into the cache the list reads. */
const toLocalized = (value: unknown): LocalizedText => {
  if (value && typeof value === "object" && "ar" in value && "en" in value) {
    return value as LocalizedText;
  }
  const text = typeof value === "string" ? value : "";
  return { ar: text, en: text };
};

/** Decimal columns arrive as strings ("40000.00") — coerce to numbers. */
const toNumber = (value: unknown): number => Number(value ?? 0);

function normalizeCategory(raw: Raw, businessId: string): WithMessage<MenuCategory> {
  return {
    id: String(raw.id),
    restaurantId: String(raw.businessId ?? raw.restaurantId ?? businessId),
    name: toLocalized(raw.name),
    sortOrder: toNumber(raw.sortOrder),
    message: typeof raw.message === "string" ? raw.message : undefined,
  };
}

function normalizeItem(raw: Raw, businessId: string): WithMessage<MenuItem> {
  const images = Array.isArray(raw.images)
    ? (raw.images as unknown[]).map((image) =>
        typeof image === "string"
          ? image
          : String((image as Raw)?.imageUrl ?? ""),
      )
    : [];
  const gallery = images.filter(Boolean);
  const attributes = (raw.attributes ?? {}) as Raw;
  const optionGroups =
    (attributes.optionGroups as CatalogOptionGroup[] | undefined) ??
    (raw.optionGroups as CatalogOptionGroup[] | undefined);

  return {
    id: String(raw.id),
    categoryId: String(raw.categoryId),
    restaurantId: String(raw.businessId ?? raw.restaurantId ?? businessId),
    name: toLocalized(raw.name),
    description: toLocalized(raw.description),
    price: toNumber(raw.price),
    currency: raw.currency === "USD" ? "USD" : "SYP",
    imageUrl: gallery[0] ?? String(raw.imageUrl ?? ""),
    images: gallery.length ? gallery : undefined,
    optionGroups: optionGroups?.length ? optionGroups : undefined,
    isAvailable: raw.isAvailable !== false,
    sortOrder: toNumber(raw.sortOrder),
    message: typeof raw.message === "string" ? raw.message : undefined,
  };
}

function normalizeOrder(raw: Raw): WithMessage<Order> {
  return raw as unknown as WithMessage<Order>;
}

function normalizeTable(raw: Raw): WithMessage<DiningTable> {
  const status = raw.status === undefined ? "" : String(raw.status);
  return {
    id: String(raw.id),
    number: toNumber(raw.number ?? raw.tableNumber),
    shape: raw.shape === "round" ? "round" : "square",
    seats: toNumber(raw.seats) || 4,
    // the API's own status enum is the authority; `isOccupied` is only accepted
    // as a fallback for a payload that carries no status
    isOccupied:
      raw.status !== undefined ? status === "occupied" : Boolean(raw.isOccupied),
    waiterId: raw.waiterId ? String(raw.waiterId) : undefined,
    x: toNumber(raw.x),
    y: toNumber(raw.y),
    message: typeof raw.message === "string" ? raw.message : undefined,
  };
}

/** The signed-in demo restaurant. */
export async function getMyRestaurant(): Promise<Restaurant> {
  if (IS_MOCK) return mockDelay(restaurants[0]!);
  return apiFetch("/me/restaurant");
}

export async function getMyMenu(): Promise<{
  categories: MenuCategory[];
  items: MenuItem[];
}> {
  if (IS_MOCK)
    return mockDelay({ categories: menuCategories, items: menuItems });
  const raw = await apiFetch<{ categories: Raw[]; items: Raw[] }>("/me/menu");
  // the payload carries no business id of its own, but every row does
  const businessId = String(raw.categories[0]?.businessId ?? "");
  return {
    categories: raw.categories.map((c) => normalizeCategory(c, businessId)),
    items: raw.items.map((i) => normalizeItem(i, businessId)),
  };
}

export async function getMyOrders(): Promise<Order[]> {
  if (IS_MOCK) return mockDelay(orders);
  const raw = await apiFetch<Raw[]>("/me/orders");
  return raw.map(normalizeOrder);
}

export async function getMyTables(): Promise<DiningTable[]> {
  if (IS_MOCK) return mockDelay(diningTables);
  const raw = await apiFetch<Raw[]>("/me/tables");
  return raw.map(normalizeTable);
}

export async function getMyWaiters(): Promise<Waiter[]> {
  if (IS_MOCK) return mockDelay(waiters, 150);
  return apiFetch("/me/waiters");
}

export async function getMyAnalytics(): Promise<RestaurantAnalytics> {
  if (IS_MOCK) return mockDelay(restaurantAnalytics);
  return apiFetch("/me/analytics");
}

// ---------------------------------------------------------------------------
// Statistics & analytics (`/statistics/*`)
//
// `businessId` is left out of every call below: the backend resolves it from
// the signed-in owner's own token when omitted, which is exactly who these
// pages are for. Every one of these can answer 403 — the business's plan may
// not include statistics (`plan.hasStatistics`) — and that is left for the
// caller to catch and show as an upgrade prompt rather than swallowed here.
// ---------------------------------------------------------------------------

export async function getBusinessStatistics(range?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<BusinessStatistics> {
  if (IS_MOCK) return mockDelay(businessStatistics);
  const params = new URLSearchParams();
  if (range?.dateFrom) params.set("dateFrom", range.dateFrom);
  if (range?.dateTo) params.set("dateTo", range.dateTo);
  const query = params.toString();
  return apiFetch(`/statistics/business${query ? `?${query}` : ""}`);
}

export async function getOverviewStats(): Promise<OverviewStats> {
  if (IS_MOCK) return mockDelay(overviewStats);
  return apiFetch("/statistics/overview");
}

/** `days`: 1–90, defaults to 7 server-side. */
export async function getBestSelling(days?: number): Promise<BestSellingItem[]> {
  if (IS_MOCK) return mockDelay(bestSellingItems);
  return apiFetch(
    `/statistics/best-selling${days ? `?days=${days}` : ""}`,
  );
}

export async function getCategoriesAnalytics(): Promise<CategoriesAnalytics> {
  if (IS_MOCK) return mockDelay(categoriesAnalytics);
  return apiFetch("/statistics/categories");
}

export async function getPeakTimes(): Promise<PeakTimesStats> {
  if (IS_MOCK) return mockDelay(peakTimes);
  return apiFetch("/statistics/peak-times");
}

export async function getLiveActivity(): Promise<LiveActivityStats> {
  if (IS_MOCK) return mockDelay(liveActivity);
  return apiFetch("/statistics/live-activity");
}

export async function getBusinessInsights(): Promise<BusinessInsight[]> {
  if (IS_MOCK) return mockDelay(businessInsights);
  return apiFetch("/statistics/insights");
}

/**
 * `GET /statistics/items/:id` — one product's own performance (views,
 * cart-adds, units sold, revenue…), for the per-item stats modal. This
 * endpoint does not exist on the backend yet — see the API spec written for
 * it — so a 404 here is expected and surfaces as "not available yet" rather
 * than an error; a 403 still means the plan itself has no statistics.
 */
export async function getItemStatistics(
  itemId: string,
): Promise<ItemStatistics | undefined> {
  if (IS_MOCK) return mockDelay(undefined);
  return apiGetOrUndefined(`/statistics/items/${itemId}`);
}

// ---------------------------------------------------------------------------
// Writes — categories
// ---------------------------------------------------------------------------

export async function createCategory(input: {
  businessId: string;
  name: string;
  sortOrder: number;
}): Promise<WithMessage<MenuCategory>> {
  if (IS_MOCK)
    return mockDelay({
      id: `c${Date.now()}`,
      restaurantId: input.businessId,
      name: { ar: input.name, en: input.name },
      sortOrder: input.sortOrder,
    });
  const raw = await apiFetch<Raw>("/categories", {
    method: "POST",
    body: input,
  });
  return normalizeCategory(raw, input.businessId);
}

export async function updateCategory(input: {
  id: string;
  businessId: string;
  name?: string;
  sortOrder?: number;
}): Promise<WithMessage<MenuCategory>> {
  const { id, businessId, ...body } = input;
  if (IS_MOCK)
    return mockDelay({
      id,
      restaurantId: businessId,
      name: toLocalized(body.name),
      sortOrder: body.sortOrder ?? 0,
    });
  const raw = await apiFetch<Raw>(`/categories/${id}`, {
    method: "PATCH",
    body,
  });
  return normalizeCategory(raw, businessId);
}

export async function deleteCategory(
  id: string,
): Promise<{ message?: string } | undefined> {
  if (IS_MOCK) return mockDelay(undefined);
  return apiFetch<{ message?: string }>(`/categories/${id}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Writes — items (a dish on a menu, a product in a store)
// ---------------------------------------------------------------------------

export interface ItemWriteInput {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  currency: CurrencyCode;
  images: string[];
  optionGroups?: CatalogOptionGroup[];
  isAvailable?: boolean;
  sortOrder?: number;
}

/**
 * The item payload the API expects.
 *
 * `optionGroups` rides inside `attributes` — the entity's documented home for
 * category-specific fields — rather than as columns of its own, which is what
 * lets a restaurant's sizes and a store's variants share one storage slot.
 */
function toItemBody(input: Partial<ItemWriteInput> & Record<string, unknown>) {
  const body: Record<string, unknown> = {};
  for (const key of [
    "categoryId",
    "name",
    "description",
    "price",
    "currency",
    "images",
    "isAvailable",
    "sortOrder",
  ] as const) {
    if (input[key] !== undefined) body[key] = input[key];
  }
  if (input.optionGroups !== undefined) {
    body.attributes = { optionGroups: input.optionGroups };
  }
  return body;
}

function mockItem(input: Partial<ItemWriteInput> & { id?: string }): MenuItem {
  return {
    id: input.id ?? `m${Date.now()}`,
    categoryId: input.categoryId ?? "",
    restaurantId: "",
    name: toLocalized(input.name),
    description: toLocalized(input.description),
    price: input.price ?? 0,
    currency: input.currency ?? "SYP",
    imageUrl: input.images?.[0] ?? "",
    images: input.images,
    optionGroups: input.optionGroups,
    isAvailable: true,
    sortOrder: 0,
  };
}

export async function createItem(
  input: {
    businessId: string;
    sortOrder: number;
    isAvailable?: boolean;
  } & ItemWriteInput,
): Promise<WithMessage<MenuItem>> {
  if (IS_MOCK) return mockDelay(mockItem(input));
  const { businessId, ...rest } = input;
  const raw = await apiFetch<Raw>("/items", {
    method: "POST",
    body: {
      businessId,
      ...toItemBody(rest),
      isAvailable: input.isAvailable ?? true,
    },
  });
  return normalizeItem(raw, businessId);
}

export type ItemUpdateInput = {
  id: string;
  businessId: string;
} & Partial<ItemWriteInput> & {
    isAvailable?: boolean;
    sortOrder?: number;
  };

export async function updateItem(
  input: ItemUpdateInput,
): Promise<WithMessage<MenuItem>> {
  if (IS_MOCK) return mockDelay(mockItem(input));
  const { id, businessId, ...rest } = input;
  const raw = await apiFetch<Raw>(`/items/${id}`, {
    method: "PATCH",
    body: toItemBody(rest),
  });
  return normalizeItem(raw, businessId);
}

export async function deleteItem(
  id: string,
): Promise<{ message?: string } | undefined> {
  if (IS_MOCK) return mockDelay(undefined);
  return apiFetch<{ message?: string }>(`/items/${id}`, { method: "DELETE" });
}


// ---------------------------------------------------------------------------
// Writes — orders
// ---------------------------------------------------------------------------

/**
 * The owner's two moves on the kanban: start cooking, then hand it over.
 *
 * The board's `new`/`preparing`/`ready` labels are the API's
 * `pending`/`preparing`/`ready`. The mapping lives here, in one place, so a
 * rename on either side cannot leave the board and the server disagreeing
 * about which column an order belongs in.
 */
export function toApiOrderStatus(status: OrderStatus): string {
  return status === "new" ? "pending" : status;
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<WithMessage<Order>> {
  if (IS_MOCK) return mockDelay({ id, status } as Order);
  const raw = await apiFetch<Raw>(`/orders/${id}/status`, {
    method: "PATCH",
    body: { status: toApiOrderStatus(status) },
  });
  return normalizeOrder(raw);
}

// ---------------------------------------------------------------------------
// Writes — tables
// ---------------------------------------------------------------------------

export interface TableWriteInput {
  tableNumber?: string;
  status?: "available" | "occupied" | "reserved";
  /**
   * NOT accepted by `UpdateTableDto` — `RestaurantTable` has no waiter/staff
   * column at all, so there is nowhere on the backend to persist this.
   * Stripped before the request below rather than sent, since
   * `forbidNonWhitelisted` would 400 the WHOLE request (including the
   * `status` change riding alongside it) over this one unknown field.
   * Backend gap — see audit report.
   */
  waiterId?: string | null;
  seats?: number;
  shape?: string;
  x?: number;
  y?: number;
}

export async function updateTable(
  id: string,
  input: TableWriteInput,
): Promise<WithMessage<DiningTable>> {
  if (IS_MOCK) return mockDelay({ id, ...input } as unknown as DiningTable);
  const body: Record<string, unknown> = { ...input };
  delete body.waiterId;
  const raw = await apiFetch<Raw>(`/tables/${id}`, {
    method: "PATCH",
    body,
  });
  return normalizeTable(raw);
}

// ---------------------------------------------------------------------------
// Writes — the business profile
// ---------------------------------------------------------------------------

export interface BusinessProfileInput {
  name?: string;
  description?: string;
  address?: string;
  /**
   * NOT accepted by `UpdateBusinessDto` on the backend (only `CreateBusinessDto`
   * has it) — sending it 400s the whole request under `forbidNonWhitelisted`.
   * No caller sends it; kept typed here only so a backend fix (add
   * `districtId` to `UpdateBusinessDto`) doesn't require touching this type.
   * Backend gap — see audit report.
   */
  districtId?: string;
  latitude?: number;
  longitude?: number;
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
  /** food_beverage only — sent as `restaurantProfile.cuisineType` */
  cuisineType?: string;
  /**
   * NOT accepted by `UpdateBusinessDto` — `BusinessPhone`/`BusinessLink` rows
   * have no update endpoint at all, only ever written once at registration
   * approval. Sending these 400s the whole request. Backend gap — see audit
   * report.
   */
  phones?: { type: string; number: string }[];
  socialLinks?: { platform: string; url: string }[];
  images?: string[];
  /** Sham Cash QR — a data URL, an already-uploaded image URL, or "" to clear it */
  paymentQrCode?: string;
  /** flat delivery charge; 0 (or omitted) means free delivery */
  deliveryFee?: number | null;
}

export async function updateBusinessProfile(
  businessId: string,
  input: BusinessProfileInput,
): Promise<Restaurant> {
  if (IS_MOCK) {
    return mockDelay({ ...restaurants[0]!, ...input } as unknown as Restaurant);
  }
  const { cuisineType, ...rest } = input;
  const body: Record<string, unknown> = { ...rest };
  if (cuisineType !== undefined) {
    // cuisine only exists on the food_beverage profile; sending it for a store
    // is rejected by the API's category check
    body.restaurantProfile = { cuisineType };
  }
  return apiFetch(`/businesses/${businessId}`, { method: "PATCH", body });
}

// ---------------------------------------------------------------------------
// Writes — branches
// ---------------------------------------------------------------------------

function normalizeBranch(raw: Raw): WithMessage<Branch> {
  return {
    id: String(raw.id),
    businessId: String(raw.businessId),
    districtId: String(raw.districtId),
    name: String(raw.name ?? ""),
    address: String(raw.address ?? ""),
    latitude: raw.latitude === null || raw.latitude === undefined ? null : toNumber(raw.latitude),
    longitude: raw.longitude === null || raw.longitude === undefined ? null : toNumber(raw.longitude),
    phone: String(raw.phone ?? ""),
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
    message: typeof raw.message === "string" ? raw.message : undefined,
  };
}

export interface BranchWriteInput {
  name: string;
  districtId: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  phone: string;
}

export async function getMyBranches(businessId: string): Promise<Branch[]> {
  if (IS_MOCK)
    return mockDelay(branches.filter((b) => b.businessId === businessId));
  const raw = await apiFetch<Raw[]>(`/branches?businessId=${businessId}`);
  return raw.map(normalizeBranch);
}

export async function createBranch(
  input: { businessId: string } & BranchWriteInput,
): Promise<WithMessage<Branch>> {
  if (IS_MOCK) {
    return mockDelay({
      id: `branch-${Date.now()}`,
      businessId: input.businessId,
      districtId: input.districtId,
      name: input.name,
      address: input.address ?? "",
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      phone: input.phone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  const raw = await apiFetch<Raw>("/branches", { method: "POST", body: input });
  return normalizeBranch(raw);
}

export async function updateBranch(
  id: string,
  input: Partial<BranchWriteInput>,
): Promise<WithMessage<Branch>> {
  if (IS_MOCK) {
    const existing = branches.find((b) => b.id === id)!;
    return mockDelay({
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    } as Branch);
  }
  const raw = await apiFetch<Raw>(`/branches/${id}`, {
    method: "PATCH",
    body: input,
  });
  return normalizeBranch(raw);
}

export async function deleteBranch(
  id: string,
): Promise<{ message?: string } | undefined> {
  if (IS_MOCK) return mockDelay(undefined);
  return apiFetch<{ message?: string }>(`/branches/${id}`, {
    method: "DELETE",
  });
}
