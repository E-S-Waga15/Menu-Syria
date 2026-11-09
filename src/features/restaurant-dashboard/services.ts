import { apiFetch, apiGetOrUndefined, ApiError, IS_MOCK, mockDelay } from "@/lib/api/client";
import { applyRecoveredBusinessFields } from "@/lib/business-text";
import {
  branches,
  bestSellingItems,
  businessInsights,
  businessStatistics,
  categoriesAnalytics,
  customers,
  diningTables,
  invoices,
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
  Customer,
  DayHours,
  DiningTable,
  FulfillmentMode,
  Invoice,
  InvoiceLine,
  InvoicePayment,
  InvoicePaymentStatus,
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
  WhatsAppOrder,
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
    imageUrl: typeof raw.imageUrl === "string" && raw.imageUrl ? raw.imageUrl : undefined,
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
  const quantityLocked =
    (attributes.quantityLocked as boolean | undefined) ??
    (raw.quantityLocked as boolean | undefined);

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
    quantityLocked: quantityLocked || undefined,
    isAvailable: raw.isAvailable !== false,
    sortOrder: toNumber(raw.sortOrder),
    viewCount: raw.viewCount != null ? toNumber(raw.viewCount) : undefined,
    message: typeof raw.message === "string" ? raw.message : undefined,
  };
}

function normalizeOrder(raw: Raw): WithMessage<Order> {
  return raw as unknown as WithMessage<Order>;
}

/** Shared paginated-list shape — same `{items, meta}` contract the admin
 * console's lists already use (see `AdminPaginatedResult`). */
export interface PaginatedResult<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** A list endpoint not migrated to pagination yet still answers a bare
 * array — wrapped as a single, already-complete page so callers never have
 * to branch on which shape came back. */
function toPaginatedResult<T>(
  raw: T[] | PaginatedResult<T>,
  limit: number,
): PaginatedResult<T> {
  if (Array.isArray(raw)) {
    return { items: raw, meta: { page: 1, limit, total: raw.length, totalPages: 1 } };
  }
  return raw;
}

function paginateMock<T>(rows: T[], page: number, limit: number): PaginatedResult<T> {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return {
    items: rows.slice(start, start + limit),
    meta: { page, limit, total, totalPages },
  };
}

const CUSTOMERS_PAGE_SIZE = 24;
const INVOICES_PAGE_SIZE = 24;

function normalizeCustomer(raw: Raw): WithMessage<Customer> {
  return {
    id: String(raw.id),
    businessId: String(raw.businessId ?? ""),
    name: String(raw.name ?? ""),
    phone: typeof raw.phone === "string" && raw.phone ? raw.phone : undefined,
    createdAt: String(raw.createdAt ?? ""),
    updatedAt: String(raw.updatedAt ?? ""),
    message: typeof raw.message === "string" ? raw.message : undefined,
  };
}

function normalizeInvoiceLine(raw: Raw): InvoiceLine {
  return {
    name: String(raw.name ?? ""),
    quantity: toNumber(raw.quantity),
    unitPrice: toNumber(raw.unitPrice),
    lineTotal: toNumber(raw.lineTotal),
  };
}

function normalizeInvoicePayment(raw: Raw): InvoicePayment {
  return {
    id: String(raw.id),
    invoiceId: String(raw.invoiceId),
    amount: toNumber(raw.amount),
    paidAt: String(raw.paidAt ?? ""),
  };
}

function normalizeInvoice(raw: Raw): WithMessage<Invoice> {
  return {
    id: String(raw.id),
    number: toNumber(raw.number),
    businessId: String(raw.businessId ?? ""),
    orderId: String(raw.orderId ?? ""),
    customerId: raw.customerId ? String(raw.customerId) : undefined,
    lines: Array.isArray(raw.lines)
      ? (raw.lines as Raw[]).map(normalizeInvoiceLine)
      : [],
    totalAmount: toNumber(raw.totalAmount),
    amountPaid: toNumber(raw.amountPaid),
    remaining: toNumber(raw.remaining),
    currency: raw.currency === "USD" ? "USD" : "SYP",
    paymentStatus: (raw.paymentStatus as InvoicePaymentStatus) || "unpaid",
    paymentMethod:
      typeof raw.paymentMethod === "string" && raw.paymentMethod
        ? raw.paymentMethod
        : undefined,
    businessName: String(raw.businessName ?? ""),
    businessAddress:
      typeof raw.businessAddress === "string" ? raw.businessAddress : undefined,
    customerName: typeof raw.customerName === "string" ? raw.customerName : undefined,
    customerPhone:
      typeof raw.customerPhone === "string" ? raw.customerPhone : undefined,
    issuedAt: String(raw.issuedAt ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.issuedAt ?? ""),
    payments: Array.isArray(raw.payments)
      ? (raw.payments as Raw[]).map(normalizeInvoicePayment)
      : undefined,
    message: typeof raw.message === "string" ? raw.message : undefined,
  };
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
  const restaurant = await apiFetch<Restaurant>("/me/restaurant");
  return applyRecoveredBusinessFields(restaurant);
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

/** Orders placed through the plain "order via WhatsApp" button — logged by
 * `recordWhatsAppOrder` (public-menu/services.ts), read back here for the
 * dashboard's own WhatsApp-orders page. Not yet a real backend endpoint,
 * see update.md. */
export async function getMyWhatsAppOrders(): Promise<WhatsAppOrder[]> {
  if (IS_MOCK) return mockDelay([]);
  const raw = await apiFetch<Raw[]>("/me/whatsapp-orders");
  return raw as unknown as WhatsAppOrder[];
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
 * cart-adds, units sold, revenue…), for the per-item stats modal. A 404
 * (item not found/not this business's) surfaces as "not available" rather
 * than an error. No plan gate applies here currently — every business can
 * read it regardless of plan.
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
  imageUrl?: string;
}): Promise<WithMessage<MenuCategory>> {
  if (IS_MOCK)
    return mockDelay({
      id: `c${Date.now()}`,
      restaurantId: input.businessId,
      name: { ar: input.name, en: input.name },
      sortOrder: input.sortOrder,
      imageUrl: input.imageUrl,
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
  /** "" clears it back to no image — same empty-string-clears convention
   * used for a business logo/an agent's photo */
  imageUrl?: string;
}): Promise<WithMessage<MenuCategory>> {
  const { id, businessId, ...body } = input;
  if (IS_MOCK)
    return mockDelay({
      id,
      restaurantId: businessId,
      name: toLocalized(body.name),
      sortOrder: body.sortOrder ?? 0,
      imageUrl: body.imageUrl || undefined,
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
  quantityLocked?: boolean;
  isAvailable?: boolean;
  sortOrder?: number;
}

/**
 * The item payload the API expects.
 *
 * `optionGroups`/`quantityLocked` ride inside `attributes` — the entity's
 * documented home for category-specific fields — rather than as columns of
 * their own, which is what lets a restaurant's sizes and a store's variants
 * share one storage slot.
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
  if (input.optionGroups !== undefined || input.quantityLocked !== undefined) {
    body.attributes = {
      ...(input.optionGroups !== undefined && { optionGroups: input.optionGroups }),
      ...(input.quantityLocked !== undefined && {
        quantityLocked: input.quantityLocked,
      }),
    };
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
    quantityLocked: input.quantityLocked,
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

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<WithMessage<Order>> {
  if (IS_MOCK) return mockDelay({ id, status } as Order);
  const raw = await apiFetch<Raw>(`/orders/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
  return normalizeOrder(raw);
}

// ---------------------------------------------------------------------------
// Writes — tables
// ---------------------------------------------------------------------------

export interface TableWriteInput {
  tableNumber?: string;
  status?: "available" | "occupied" | "reserved";
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
  const raw = await apiFetch<Raw>(`/tables/${id}`, {
    method: "PATCH",
    body: input,
  });
  return normalizeTable(raw);
}

// ---------------------------------------------------------------------------
// Writes — the business profile
// ---------------------------------------------------------------------------

export interface BusinessProfileInput {
  name?: string;
  /** overrides just the "main" entry's label in a branch picker — "" clears
   * it back to following `name`. See update.md. */
  mainBranchName?: string;
  /** the storefront link's unique identifier (/menusyria.app/{slug}) — owner-
   * editable; the backend converts spaces to "_", rejects dots, and 409s if
   * another business already holds it. See update.md. */
  slug?: string;
  description?: string;
  address?: string;
  districtId?: string;
  /** the structured subtype (e.g. "Fast Food") — same list `/business-sub-types`
   * feeds the registration form's picker with, now editable after signup too */
  subTypeId?: string;
  latitude?: number;
  longitude?: number;
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
  /** food_beverage only — free-text display label, sent as
   * `restaurantProfile.cuisineType`; distinct from `subTypeId` */
  cuisineType?: string;
  phones?: { numberType: "mobile" | "landline" | "whatsapp"; number: string }[];
  socialLinks?: { socialPlatform: string; url: string }[];
  images?: string[];
  /** Sham Cash QR — a data URL, an already-uploaded image URL, or "" to clear it */
  paymentQrCode?: string;
  /** Sham Cash transfer code — a plain string, or "" to clear it */
  paymentCode?: string;
  /** flat delivery charge; 0 (or omitted) means free delivery. Required
   * (even 0) the first time delivery is turned on in `fulfillmentModes` —
   * see update.md §2 */
  deliveryFee?: number | null;
  /** which of dine-in/pickup/delivery this business offers; see update.md §1 */
  fulfillmentModes?: FulfillmentMode[];
  /** index 0 = Sunday; `null` for a day the business is closed. Always sent
   * as the full 7-entry array — see update.md for the requested endpoint. */
  openingHours?: (DayHours | null)[];
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
    logoUrl: typeof raw.logoUrl === "string" && raw.logoUrl ? raw.logoUrl : undefined,
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
  /** "" clears it back to no logo — same empty-string-clears convention
   * used for a category/business logo */
  logoUrl?: string;
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
      logoUrl: input.logoUrl || undefined,
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

// ---------------------------------------------------------------------------
// Customers (`/customers`) — the business's own persistent customer book,
// separate from the free-text `customerName`/`customerPhone` every order
// already carries. See update-backend-orders.md's invoicing/debt section.
// ---------------------------------------------------------------------------

export interface CustomersQuery {
  page?: number;
  limit?: number;
  q?: string;
}

export async function getCustomers(
  query: CustomersQuery = {},
): Promise<PaginatedResult<Customer>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? CUSTOMERS_PAGE_SIZE;
  if (IS_MOCK) {
    const q = query.q?.trim().toLowerCase();
    const rows = q
      ? customers.filter(
          (c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q),
        )
      : customers;
    return mockDelay(paginateMock(rows, page, limit));
  }
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (query.q) params.set("q", query.q);
  const raw = await apiFetch<Raw[] | PaginatedResult<Raw>>(`/customers?${params}`);
  const { items, meta } = toPaginatedResult(raw, limit);
  return { items: items.map(normalizeCustomer), meta };
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  if (IS_MOCK) return mockDelay(customers.find((c) => c.id === id));
  const raw = await apiGetOrUndefined<Raw>(`/customers/${id}`);
  return raw ? normalizeCustomer(raw) : undefined;
}

export async function createCustomer(input: {
  name: string;
  phone?: string;
}): Promise<WithMessage<Customer>> {
  if (IS_MOCK) {
    if (input.phone && customers.some((c) => c.phone === input.phone)) {
      throw new ApiError(409, "هذا الرقم مستخدم لزبون آخر مسجّل مسبقاً");
    }
    return mockDelay({
      id: `cu${Date.now()}`,
      businessId: restaurants[0]!.id,
      name: input.name,
      phone: input.phone || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  const raw = await apiFetch<Raw>("/customers", { method: "POST", body: input });
  return normalizeCustomer(raw);
}

export async function updateCustomer(
  id: string,
  input: { name?: string; phone?: string },
): Promise<WithMessage<Customer>> {
  if (IS_MOCK) {
    const existing = customers.find((c) => c.id === id)!;
    return mockDelay({
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    });
  }
  const raw = await apiFetch<Raw>(`/customers/${id}`, {
    method: "PATCH",
    body: input,
  });
  return normalizeCustomer(raw);
}

// ---------------------------------------------------------------------------
// Invoices & debt ledger (`/invoices`) — issued from a `delivered` order,
// optionally linked to a persistent `Customer` for debt tracking across
// visits. See update-backend-orders.md's invoicing/debt section.
// ---------------------------------------------------------------------------

export interface InvoicesQuery {
  page?: number;
  limit?: number;
  q?: string;
  paymentStatus?: InvoicePaymentStatus;
  customerId?: string;
}

export async function getInvoices(
  query: InvoicesQuery = {},
): Promise<PaginatedResult<Invoice>> {
  const page = query.page ?? 1;
  const limit = query.limit ?? INVOICES_PAGE_SIZE;
  if (IS_MOCK) {
    const q = query.q?.trim().toLowerCase();
    let rows = invoices;
    if (query.customerId) rows = rows.filter((inv) => inv.customerId === query.customerId);
    if (query.paymentStatus)
      rows = rows.filter((inv) => inv.paymentStatus === query.paymentStatus);
    if (q) {
      rows = rows.filter(
        (inv) =>
          String(inv.number).includes(q) ||
          (inv.customerName ?? "").toLowerCase().includes(q) ||
          (inv.customerPhone ?? "").includes(q),
      );
    }
    return mockDelay(paginateMock(rows, page, limit));
  }
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (query.q) params.set("q", query.q);
  if (query.paymentStatus) params.set("paymentStatus", query.paymentStatus);
  if (query.customerId) params.set("customerId", query.customerId);
  const raw = await apiFetch<Raw[] | PaginatedResult<Raw>>(`/invoices?${params}`);
  const { items, meta } = toPaginatedResult(raw, limit);
  return { items: items.map(normalizeInvoice), meta };
}

export async function getInvoice(id: string): Promise<Invoice | undefined> {
  if (IS_MOCK) return mockDelay(invoices.find((inv) => inv.id === id));
  const raw = await apiGetOrUndefined<Raw>(`/invoices/${id}`);
  return raw ? normalizeInvoice(raw) : undefined;
}

export interface IssueInvoiceInput {
  orderId: string;
  customerId?: string;
  customerPhone?: string;
  paymentMethod?: string;
  amountPaid?: number;
}

export async function issueInvoice(
  input: IssueInvoiceInput,
): Promise<WithMessage<Invoice>> {
  if (IS_MOCK) {
    if (invoices.some((inv) => inv.orderId === input.orderId)) {
      throw new ApiError(409, "هذا الطلب لديه فاتورة مسبقاً");
    }
    const order = orders.find((o) => o.id === input.orderId);
    if (!order) throw new ApiError(404, "الطلب غير موجود");
    const amountPaid = input.amountPaid ?? 0;
    const id = `inv${Date.now()}`;
    return mockDelay({
      id,
      number: invoices.length + 1,
      businessId: order.restaurantId,
      orderId: order.id,
      customerId: input.customerId,
      lines: order.lines.map((line) => ({
        name: line.name.ar,
        quantity: line.quantity,
        unitPrice: line.price,
        lineTotal: line.price * line.quantity,
      })),
      totalAmount: order.total,
      amountPaid,
      remaining: order.total - amountPaid,
      currency: "SYP",
      paymentStatus:
        amountPaid >= order.total ? "paid" : amountPaid > 0 ? "partially_paid" : "unpaid",
      paymentMethod: input.paymentMethod,
      businessName: restaurants[0]!.name.ar,
      customerName:
        customers.find((c) => c.id === input.customerId)?.name ?? order.customerName,
      customerPhone: input.customerPhone,
      issuedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      payments: amountPaid > 0
        ? [{ id: `pay${Date.now()}`, invoiceId: id, amount: amountPaid, paidAt: new Date().toISOString() }]
        : [],
    });
  }
  const raw = await apiFetch<Raw>("/invoices", { method: "POST", body: input });
  return normalizeInvoice(raw);
}

export async function addInvoicePayment(
  invoiceId: string,
  input: { amount: number; paidAt?: string },
): Promise<WithMessage<Invoice>> {
  if (IS_MOCK) {
    const existing = invoices.find((inv) => inv.id === invoiceId);
    if (!existing) throw new ApiError(404, "الفاتورة غير موجودة");
    if (input.amount > existing.remaining) {
      throw new ApiError(400, "المبلغ أكبر من المتبقي على الفاتورة");
    }
    const amountPaid = existing.amountPaid + input.amount;
    return mockDelay({
      ...existing,
      amountPaid,
      remaining: existing.totalAmount - amountPaid,
      paymentStatus:
        amountPaid >= existing.totalAmount ? ("paid" as const) : ("partially_paid" as const),
      payments: [
        ...(existing.payments ?? []),
        {
          id: `pay${Date.now()}`,
          invoiceId,
          amount: input.amount,
          paidAt: input.paidAt ?? new Date().toISOString(),
        },
      ],
    });
  }
  const raw = await apiFetch<Raw>(`/invoices/${invoiceId}/payments`, {
    method: "POST",
    body: input,
  });
  return normalizeInvoice(raw);
}
