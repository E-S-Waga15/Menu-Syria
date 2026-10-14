/**
 * Domain contracts shared across the platform.
 * These mirror the future REST API payloads — when the backend lands,
 * only `lib/api/client.ts` needs a base URL, the shapes stay identical.
 */

export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "suspended"
  | "expired"
  | "pending";

export interface LocalizedText {
  ar: string;
  en: string;
}

export interface Governorate {
  id: string;
  name: LocalizedText;
}

export interface Region {
  id: string;
  governorateId: string;
  name: LocalizedText;
}

/** A physical location of a restaurant/store — the API's `name`, `address`
 * and `phone` are plain strings, not localized. */
export interface Branch {
  id: string;
  businessId: string;
  districtId: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * A branch as the public storefront endpoints embed it (`GET /restaurants/
 * :slug`, `/stores/:slug`, `/public/businesses/:slug`, and nested under
 * `restaurant` in `/menu/:slug`) — lighter than the owner-facing `Branch`:
 * no `businessId` (implicit — it's always this business) and no
 * `createdAt`/`updatedAt`.
 */
export interface PublicBranch {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  /** this one number doubles as both the branch's phone and WhatsApp */
  phone: string;
  governorateId: string | null;
  districtId: string;
}

/**
 * The backend only returns an Arabic `name` and a coarse `category` — no
 * English translation and no direct RESTAURANT/STORE flag. The slug is
 * stable, so the frontend maps it to an English label and to our own
 * business-type split (see `BUSINESS_SUB_TYPE_LABELS` and
 * `getBusinessSubTypes` in `features/marketing/services`).
 */
export interface BusinessSubType {
  id: string;
  name: string;
  category: "food_beverage" | "retail_goods";
  slug: string;
}

export interface RestaurantTheme {
  primaryColor: string;
  secondaryColor: string;
}

/**
 * Shared shape for anything that sells through the platform —
 * restaurants publish menus, stores publish product catalogs.
 */
/**
 * Lightweight contact info for the Menu Syria agent who onboarded a
 * business — just enough to show "who activated your subscription and how
 * to reach them" on the owner's own dashboard. The full `Agent` profile
 * (bio, photo, commission rate…) is a separate, public-facing type; this
 * is deliberately narrower since it only ever appears on an owner's own
 * `/me/restaurant`/`/me/store` read.
 */
export interface BusinessAgent {
  id: string;
  name: string;
  governorateId: string;
  regionId: string;
  phone: string;
  whatsapp: string;
  instagram?: string;
  facebook?: string;
}

export interface Business {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  logoUrl: string;
  coverImages: string[];
  governorateId: string;
  regionId: string;
  address: LocalizedText;
  location: { lat: number; lng: number };
  phone: string;
  whatsapp: string;
  instagram?: string;
  facebook?: string;
  theme: RestaurantTheme;
  rating: number;
  isOpen: boolean;
  /** display-only reopen time (e.g. "٩:٠٠ ص") shown when closed — not a
   * real schedule, just enough for the closed-state copy on the storefront */
  opensAt?: LocalizedText;
  status: SubscriptionStatus;
  planExpiresAt: string;
  /** when the current plan period started — paired with `planExpiresAt`
   * for "X days remaining" and a start/end display. Absent on a business
   * that predates this field. */
  planStartedAt?: string;
  /** the active plan's display name (e.g. "Premium") — absent falls back
   * to a generic label instead of a hardcoded one. */
  planName?: string;
  /** the Menu Syria agent who onboarded this business, if any — present
   * only on the owner's own `/me/restaurant`/`/me/store` read, never on
   * public storefront reads. Absent/`null` means the business signed up
   * without an agent (or predates this field). */
  agent?: BusinessAgent | null;
  /** order channels the plan covers; omitted means both are available */
  orderChannels?: OrderChannel[];
  /**
   * Opening hours, index 0 = Sunday. `null` for a day the place is shut.
   * Omitted entirely means the owner has not published hours — a different
   * thing from being closed, and shown differently.
   */
  openingHours?: (DayHours | null)[];
  /** Sham Cash transfer QR, shown to the customer at checkout. Empty/absent
   * means the business has not set one up. */
  paymentQrCode?: string;
  /** Sham Cash transfer code, shown alongside (or instead of) the QR for a
   * customer who'd rather paste it into the app than scan an image.
   * Empty/absent means the business has not set one up. */
  paymentCode?: string;
  /** flat delivery charge added to the cart total for delivery orders.
   * `0`/`null`/absent all mean delivery is free. */
  deliveryFee?: number | null;
  /** true once the owner has explicitly saved a delivery fee at least once
   * (even 0/free) — distinct from `deliveryFee` being `0`/absent because
   * it was simply never touched. Delivery can't be enabled in
   * `fulfillmentModes` until this is true. */
  deliveryFeeConfigured?: boolean;
  /**
   * Which of dine-in/pickup/delivery this business offers, owner-
   * configurable. Absent/`null` means "use the type-based default" —
   * `getSupportedFulfillment` falls back to that for a business that has
   * never touched this setting, so this field is safe to treat as optional
   * everywhere it's read.
   */
  fulfillmentModes?: FulfillmentMode[];
  /**
   * Other physical locations of this business, for the storefront's branch
   * switcher. Only populated by the public storefront endpoints (never
   * missing there — `[]` means genuinely no other branches); absent
   * entirely from owner-facing shapes like `/me/business`, which still use
   * the authenticated `/branches?businessId=` read instead.
   */
  branches?: PublicBranch[];
  /**
   * The structured business sub-type id (from `getBusinessSubTypes`) —
   * present on the owner's own `/me/restaurant`/`/me/store` read (the
   * backend spreads the raw entity, which carries this FK column).
   */
  subTypeId?: string;
  /**
   * The same sub-type, resolved to `{id, name}` — what the public
   * storefront endpoints send (owner-facing `/me/*` reads carry it too, via
   * the same spread). This is the business's real "type" to display
   * (e.g. "مطعم إيطالي"), in place of the `cuisine`/`category` free-text
   * fallbacks below. `null`/absent means the business never picked one.
   */
  subType?: { id: string; name: string } | null;
}

export interface DayHours {
  opens: string;
  closes: string;
}

export interface Restaurant extends Business {
  cuisine: LocalizedText;
}

/** E-commerce storefront (clothing, electronics, gifts…) */
export interface Store extends Business {
  category: LocalizedText;
}

/** How the customer will receive their order. Restaurants support all
 * three; stores never offer dine-in (see `getSupportedFulfillment`). */
export type FulfillmentMode = "dineIn" | "pickup" | "delivery";

/**
 * How an order can be placed, which the business's plan decides: straight
 * through the platform, handed off to WhatsApp, or both. A business with only
 * one enabled shows one button, not a disabled second one.
 */
export type OrderChannel = "platform" | "whatsapp";

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: LocalizedText;
  sortOrder: number;
}

export interface StoreCategory {
  id: string;
  storeId: string;
  name: LocalizedText;
  sortOrder: number;
}

export type DishBadge = "popular" | "new" | "chefSpecial";
export type CurrencyCode = "SYP" | "USD";

export type OptionSelectionType = "single" | "multiple";

/**
 * The backend stores only `id` and `priceDelta` per option — no separate
 * display name. `id` is free text the owner types when creating the group
 * (e.g. "صغير", "large"), and doubles as the label shown to a customer;
 * it only has to be unique within its own group.
 *
 * `priceDelta` is always what the order's price math (backend and
 * `dish-modal.tsx` alike) adds to the item's base price unconditionally —
 * that part never changes. What it *means* to the owner depends on the
 * parent group's `selectionType`: in a "single" group (e.g. size) the
 * dashboard editor shows/accepts each option's own final price and
 * silently converts it to/from this delta, since only one such option can
 * ever be picked; in a "multiple" group (add-ons) it's edited as the plain
 * additive amount, because several can stack.
 */
export interface CatalogOption {
  id: string;
  priceDelta: number;
}

/**
 * A group of related choices on a catalog item — "single" renders as an
 * exclusive pick (e.g. Size: Regular/Large, only one at a time), "multiple"
 * as independent add-ons (e.g. extra toppings, several at once).
 */
/** Same as `CatalogOption`: `id` is free text the owner chose (e.g. "المقاس",
 * "extras") and is the group's own label — there is no separate name field. */
export interface CatalogOptionGroup {
  id: string;
  selectionType: OptionSelectionType;
  required: boolean;
  options: CatalogOption[];
}

/**
 * Shared sellable-item shape: a dish on a menu or a product in a store.
 * The public storefront UI (cards, modal, cart, WhatsApp order) renders
 * this shape regardless of the business type behind it.
 */
export interface CatalogItem {
  id: string;
  categoryId: string;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  currency?: CurrencyCode;
  imageUrl: string;
  /** extra gallery photos for the item modal; falls back to [imageUrl] */
  images?: string[];
  /** dish ingredients — or product specs/features for stores */
  ingredients?: LocalizedText[];
  optionGroups?: CatalogOptionGroup[];
  isAvailable: boolean;
  badge?: DishBadge;
  sortOrder: number;
}

export interface MenuItem extends CatalogItem {
  restaurantId: string;
}

export interface StoreProduct extends CatalogItem {
  storeId: string;
}

/** How an offer is flagged on the storefront; the copy lives in the dictionary. */
export type OfferBadge = "limited" | "bestValue" | "new";

/**
 * A promotional bundle a business publishes — a meal deal on a restaurant's
 * menu, a product bundle in a store. The same shape serves both, exactly as
 * `CatalogItem` does, so the storefront renders one component either way.
 *
 * Both prices are absolute rather than a percentage: the discount is derived
 * for display (see `offerDiscount`), never stored, so the two can never
 * disagree about what the customer actually pays.
 */
export interface Offer {
  id: string;
  /** the restaurant or store publishing it */
  businessId: string;
  name: LocalizedText;
  description: LocalizedText;
  /** cover first; the modal shows the rest as a gallery */
  images: string[];
  /** what the bundle contains — dishes for a menu, products for a store */
  includes: LocalizedText[];
  /** what the same items cost bought separately, shown struck through */
  originalPrice: number;
  /** what the customer pays for the bundle */
  price: number;
  /** ISO date the offer opens */
  startsAt: string;
  /** ISO date it closes; omitted means it runs until the owner stops it */
  endsAt?: string;
  /** the owner's on/off switch — an expired offer is a different thing */
  isActive: boolean;
  badge?: OfferBadge;
  sortOrder: number;
}

export interface Review {
  id: string;
  restaurantId: string;
  author: string;
  rating: number;
  comment: LocalizedText;
  date: string;
}

export interface Agent {
  id: string;
  name: LocalizedText;
  photoUrl: string;
  bio: LocalizedText;
  governorateId: string;
  /** the regions this agent covers within `governorateId` — one or two,
   * never from a different governorate */
  regionIds: string[];
  phone: string;
  whatsapp: string;
  instagram?: string;
  facebook?: string;
  restaurantsCount: number;
  status: SubscriptionStatus;
  referralCode: string;
  commissionRate: number;
}

export type OrderStatus = "new" | "preparing" | "ready";

export interface OrderLine {
  itemId: string;
  name: LocalizedText;
  quantity: number;
  price: number;
  /** The options the customer picked for this line (e.g. "Large", "Red"),
   * exactly as `GET /orders/:id` names the field. `null`/absent means none
   * were picked (or the item has no option groups). */
  selectedOptions?: { id: string; priceDelta: number }[] | null;
}

export interface Order {
  id: string;
  /** the backend derives this from the order id ("C161A8CB"), so it is a
   * label rather than an integer — display-only, never sorted numerically */
  number: number | string;
  restaurantId: string;
  tableNumber?: number;
  customerName?: string;
  lines: OrderLine[];
  notes?: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export type TableShape = "square" | "round";

export interface DiningTable {
  id: string;
  number: number;
  shape: TableShape;
  seats: number;
  isOccupied: boolean;
  waiterId?: string;
  /** position on the interactive hall canvas, in % */
  x: number;
  y: number;
}

export interface Waiter {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  date: string;
  restaurantName: LocalizedText;
  type: "commission" | "payout";
  amount: number;
}

export interface AnalyticsPoint {
  label: string;
  value: number;
}

export interface RestaurantAnalytics {
  todayOrders: number;
  todayRevenue: number;
  menuViews: number;
  avgOrderValue: number;
  revenueByMonth: AnalyticsPoint[];
  visitsByDay: AnalyticsPoint[];
  salesByCategory: AnalyticsPoint[];
  bestSeller: MenuItem;
}

// ---------------------------------------------------------------------------
// Statistics & analytics (`/statistics/*`) — gated behind the business's own
// plan (`plan.hasStatistics`); every read below can come back 403 for a
// business on a plan that doesn't include it.
// ---------------------------------------------------------------------------

export interface TopSoldItem {
  itemId: string;
  name: string;
  totalQuantity: number;
}

/** `GET /statistics/business` — headline numbers for a date range. */
export interface BusinessStatistics {
  visitCount: number;
  orderCount: number;
  revenue: number;
  topItems: TopSoldItem[];
}

export interface OverviewCartItemStat {
  itemId: string;
  name: string;
  cartAddCount: number;
}

/** `GET /statistics/overview` — this calendar month, for the dashboard home. */
export interface OverviewStats {
  mostAddedToCart: OverviewCartItemStat | null;
  mostViewedWithoutPurchase:
    | { itemId: string; name: string; viewCount: number }
    | null;
  /** null only when there is no active subscription at all */
  daysUntilSubscriptionExpiry: number | null;
  leastAddedToCart: (OverviewCartItemStat & { tip: string }) | null;
}

/** `GET /statistics/best-selling` — up to 10 rows, by quantitySold desc. */
export interface BestSellingItem {
  itemId: string;
  name: string;
  imageUrl: string;
  isAvailable: boolean;
  cartAddCount: number;
  quantitySold: number;
  revenue: number;
}

export interface CategoryViewStat {
  categoryId: string;
  name: string;
  viewCount: number;
  /** rounded share of total category views, 0–100 */
  percentage: number;
}

/** `GET /statistics/categories` — all-time. */
export interface CategoriesAnalytics {
  mostVisited: { categoryId: string; name: string } | null;
  leastActive: { categoryId: string; name: string } | null;
  breakdown: CategoryViewStat[];
}

/** `GET /statistics/peak-times` — all-time, scored by cart-add events only. */
export interface PeakTimesStats {
  topHourSlots: { hourRange: string; cartAddCount: number }[];
  bestDayOfWeek: { dayAr: string; cartAddCount: number } | null;
  bestMonth: { label: string; cartAddCount: number } | null;
}

/**
 * `GET /statistics/items/:id` — one product's own performance, for the
 * per-item stats modal in the dashboard. Not yet implemented by the backend;
 * see the API spec handed to the backend team alongside this type.
 */
export interface ItemStatistics {
  itemId: string;
  /** times the item's detail view/modal was opened by a customer */
  viewCount: number;
  /** times the item was added to a cart (re-adds count again) */
  cartAddCount: number;
  /** units sold across completed orders */
  quantitySold: number;
  /** revenue from this item across completed orders, in the item's currency */
  revenue: number;
  /** times a customer favourited the item, if favourites are enabled */
  favoriteCount: number;
  /** cartAddCount that actually became an order, 0–100 */
  conversionRate: number;
  /** the window these numbers cover */
  period: { from: string; to: string };
}

/** `GET /statistics/live-activity` — a rough, explicitly approximate count. */
export interface LiveActivityStats {
  activeCount: number;
  windowMinutes: number;
  isApproximate: boolean;
}

/** `GET /statistics/insights` — ready-to-show smart-alert lines. */
export interface BusinessInsight {
  icon: "calendar" | "lightbulb";
  textAr: string;
}

/** What a notification is about; the copy for each lives in the dictionary. */
export type NotificationKind =
  "expiringSoon" | "expired" | "renewed" | "joined";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  /** the business the notice concerns */
  subjectName: LocalizedText;
  /** days until expiry (or since, when already expired) */
  days?: number;
  createdAt: string;
  /** where reading it should take you */
  href?: string;
}

/** Roles the console can list and act on. Mirrors the auth store's UserRole. */
export type PlatformRole = "user" | "owner" | "agent" | "waiter" | "admin";

export interface PlatformUser {
  id: string;
  name: string;
  phone: string;
  role: PlatformRole;
  governorateId?: string;
  joinedAt: string;
  status: "active" | "banned";
}

/** A subscription tier the platform sells. */
/**
 * A subscription tier, with every price already computed server-side —
 * the yearly price (discounted — "two months free" for committing to a
 * year), the agent's own cost on both billing cycles (30% off), and the
 * savings figures shown alongside them. The frontend only ever displays
 * these fields; it never multiplies/discounts a price itself, so admin
 * and agent screens can't drift from whatever the backend decided.
 */
export interface Plan {
  id: string;
  name: LocalizedText;
  /** which currency every price field on this plan is denominated in —
   * chosen once, at creation, for the whole plan */
  currency: CurrencyCode;
  /** the one price an admin actually sets when creating a plan — in
   * `currency`, per month */
  priceMonthly: number;
  /** backend-computed from the monthly price and the yearly-discount
   * policy (currently: 10 months' worth for a full year) */
  priceYearly: number;
  /** `priceMonthly * 12` — the "before discount" reference price shown
   * struck through next to `priceYearly`, computed and returned as its
   * own field so the frontend never has to multiply it out itself */
  yearlyOriginalPrice: number;
  /** how many months' worth the yearly price waives, e.g. 2 — a display
   * fact, not something the frontend derives from the two prices */
  yearlySavingsMonths: number;
  /** the SYP amount `priceMonthly * 12 - priceYearly` works out to —
   * computed and returned as-is */
  yearlySavingsAmount: number;
  /** `priceYearly / 12` — the discounted "per month, billed annually" rate
   * shown under the yearly price (optional: a page simply hides that line
   * until the backend adds this field) */
  yearlyPricePerMonth?: number;
  /** what an agent pays for this plan — `priceMonthly`/`priceYearly`
   * after the agent discount (see `agentDiscountPercent`) */
  agentPriceMonthly: number;
  agentPriceYearly: number;
  /** the SYP amount `priceYearly - agentPriceYearly` works out to */
  agentYearlySavingsAmount: number;
  /** `agentPriceYearly / 12` — the agent's own "per month, billed
   * annually" rate, same optionality as `yearlyPricePerMonth` */
  agentYearlyPricePerMonth?: number;
  /** the discount rate applied to get the agent prices above, e.g. 30
   * (meaning 30%) — shown as "X% off" without the frontend computing it
   * from the two price pairs */
  agentDiscountPercent: number;
  features: LocalizedText[];
  /** how many businesses are on it right now */
  subscriberCount: number;
  isPopular?: boolean;
}
