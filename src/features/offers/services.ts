import { apiFetch, IS_MOCK, mockDelay } from "@/lib/api/client";
import { offers, restaurants, stores } from "@/lib/mock/data";
import type {
  Business,
  CatalogItem,
  LocalizedText,
  Offer,
  SubscriptionStatus,
} from "@/lib/types";

/**
 * Whether an offer should be visible to a customer right now.
 *
 * Two separate things have to be true: the owner has it switched on, and today
 * falls inside its window. Keeping them separate is what lets the dashboard
 * show "expired" and "paused" as different states rather than one dead flag.
 */
export function isOfferLive(offer: Offer, now = new Date()): boolean {
  if (!offer.isActive) return false;
  const today = now.toISOString().slice(0, 10);
  if (offer.startsAt > today) return false;
  return !offer.endsAt || offer.endsAt >= today;
}

/**
 * `upcoming`, `endingSoon` and `expired` are windows; `paused` is the owner's
 * own switch. `endingSoon` exists so the owner sees what needs a decision this
 * week without opening each card to read a date.
 */
export type OfferState =
  | "live"
  | "endingSoon"
  | "paused"
  | "upcoming"
  | "expired";

/** how close to its end date an offer starts flagging itself */
const ENDING_SOON_DAYS = 7;

export function offerState(offer: Offer, now = new Date()): OfferState {
  const today = now.toISOString().slice(0, 10);
  if (offer.endsAt && offer.endsAt < today) return "expired";
  if (!offer.isActive) return "paused";
  if (offer.startsAt > today) return "upcoming";

  if (offer.endsAt) {
    const daysLeft = Math.ceil(
      (new Date(offer.endsAt).getTime() - now.getTime()) / 86_400_000,
    );
    if (daysLeft <= ENDING_SOON_DAYS) return "endingSoon";
  }
  return "live";
}

/**
 * The saving, derived rather than stored — a percentage kept alongside the two
 * prices would be a third number free to drift out of step with them.
 * Returns 0 when the "original" price is not actually higher.
 */
export function offerDiscount(offer: Offer): number {
  if (offer.originalPrice <= offer.price) return 0;
  return Math.round(
    ((offer.originalPrice - offer.price) / offer.originalPrice) * 100,
  );
}

/**
 * An offer, seen as something the cart can hold.
 *
 * The cart, the checkout sheet and the WhatsApp message all speak
 * `CatalogItem`. Rather than teach each of them a second shape, an offer is
 * adapted into one: its bundle contents become the item's `ingredients`, which
 * is what the modal already renders as a list. The `offer-` id prefix keeps it
 * from ever colliding with a real dish.
 */
export function offerAsCatalogItem(offer: Offer): CatalogItem {
  return {
    id: `offer-${offer.id}`,
    categoryId: "offers",
    name: offer.name,
    description: offer.description,
    price: offer.price,
    imageUrl: offer.images[0] ?? "",
    images: offer.images,
    ingredients: offer.includes,
    isAvailable: true,
    sortOrder: offer.sortOrder,
  };
}

// ---------------------------------------------------------------------------
// API adapters — the storefront's offer endpoints speak in the backend's
// single-locale shape (plain strings, decimal prices returned as strings),
// while the UI renders the bilingual domain model from `lib/types.ts`.
// These mappers bridge the two without touching the components.
// ---------------------------------------------------------------------------

const toLocalized = (value: string): LocalizedText => ({ ar: value, en: value });

interface RawOffer {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  images: string[];
  includes: string[];
  originalPrice: number | string;
  price: number | string;
  startsAt: string;
  endsAt?: string | null;
  isActive: boolean;
  badge?: Offer["badge"];
  sortOrder: number;
}

/** Decimal columns arrive as strings ("40000.00") — coerce to numbers. */
const toNumber = (value: number | string): number => Number(value);

function normalizeOffer(raw: RawOffer & { message?: string }): Offer & {
  message?: string;
} {
  return {
    id: raw.id,
    businessId: raw.businessId,
    name: toLocalized(raw.name),
    description: toLocalized(raw.description ?? ""),
    images: raw.images ?? [],
    includes: (raw.includes ?? []).map(toLocalized),
    originalPrice: toNumber(raw.originalPrice),
    price: toNumber(raw.price),
    startsAt: raw.startsAt,
    endsAt: raw.endsAt ?? undefined,
    isActive: raw.isActive,
    badge: raw.badge,
    sortOrder: raw.sortOrder,
    message: raw.message,
  };
}

/** A raw business row as featured-offers returns it, mapped onto the
 * storefront `Business` shape so offer banners can render name/logo/theme. */
interface RawOfferBusiness {
  id: string;
  slug: string;
  name: string;
  logo?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  address?: string | null;
  description?: string | null;
  district?: {
    governorateId?: string;
    districtName?: string;
    governorate?: { governorateName?: string };
  } | null;
  districtId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
  businessType?: { name?: string; category?: string } | null;
  restaurantProfile?: { cuisineType?: string | null } | null;
}

function isSubscriptionStatus(
  value: string | undefined,
): value is SubscriptionStatus {
  return value === "active" || value === "expired" || value === "pending";
}

function normalizeOfferBusiness(raw: RawOfferBusiness): Business {
  const name = toLocalized(raw.name);
  return {
    id: raw.id,
    slug: raw.slug,
    name,
    description: toLocalized(raw.description ?? ""),
    logoUrl: raw.logo ?? "",
    coverImages: [],
    governorateId: raw.district?.governorateId ?? raw.districtId ?? "",
    regionId: raw.districtId ?? "",
    address: toLocalized(raw.address ?? ""),
    location: {
      lat: Number(raw.latitude ?? 33.5138),
      lng: Number(raw.longitude ?? 36.2765),
    },
    phone: "",
    whatsapp: "",
    theme: {
      primaryColor: raw.primaryColor ?? "#141617",
      secondaryColor: raw.secondaryColor ?? "#F5F5F7",
    },
    rating: 4.8,
    isOpen: true,
    status: isSubscriptionStatus(raw.status) ? raw.status : "active",
    planExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
  };
}

/** Every offer a business has, in the owner's own order — dashboard view. */
export async function getBusinessOffers(businessId: string): Promise<Offer[]> {
  if (IS_MOCK) {
    return mockDelay(
      offers
        .filter((o) => o.businessId === businessId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
      250,
    );
  }
  const raw = await apiFetch<RawOffer[]>(`/businesses/${businessId}/offers`);
  return raw.map(normalizeOffer);
}

/** Only what a customer should see on the storefront. */
export async function getLiveOffers(businessId: string): Promise<Offer[]> {
  if (IS_MOCK) {
    return mockDelay(
      offers
        .filter((o) => o.businessId === businessId && isOfferLive(o))
        .sort((a, b) => a.sortOrder - b.sortOrder),
      200,
    );
  }
  const raw = await apiFetch<RawOffer[]>(
    `/businesses/${businessId}/offers?live=1`,
  );
  return raw.map(normalizeOffer);
}

/**
 * An offer plus the business behind it, for the places that mix offers from
 * several storefronts — the signed-in customer's home page. The storefront
 * kind decides which route the card links to, since restaurants live under
 * `/menu` and stores under `/store`.
 */
export interface FeaturedOffer {
  offer: Offer;
  business: Business;
  kind: "restaurant" | "store";
}

export async function getFeaturedOffers(limit = 6): Promise<FeaturedOffer[]> {
  if (IS_MOCK) {
    const byId = new Map<
      string,
      { business: Business; kind: "restaurant" | "store" }
    >([
      ...restaurants.map(
        (r) =>
          [
            r.id,
            { business: r as Business, kind: "restaurant" as const },
          ] as const,
      ),
      ...stores.map(
        (s) =>
          [s.id, { business: s as Business, kind: "store" as const }] as const,
      ),
    ]);

    return mockDelay(
      offers
        .filter((o) => isOfferLive(o))
        .flatMap((offer) => {
          const source = byId.get(offer.businessId);
          // an offer whose business is gone is not renderable, so it is
          // dropped rather than shown with a blank name
          return source
            ? [{ offer, business: source.business, kind: source.kind }]
            : [];
        })
        .slice(0, limit),
      250,
    );
  }
  const raw = await apiFetch<
    { offer: RawOffer; business: RawOfferBusiness; kind: "restaurant" | "store" }[]
  >(`/offers/featured?limit=${limit}`);
  return raw.map(({ offer, business, kind }) => ({
    offer: normalizeOffer(offer),
    business: normalizeOfferBusiness(business),
    kind,
  }));
}

// ---------------------------------------------------------------------------
// Writes — offers
// ---------------------------------------------------------------------------

/**
 * What the offer form submits, in the API's own shape: one string per field
 * (the backend stores a single locale) and absolute prices as numbers.
 */
export interface OfferWriteInput {
  name: string;
  description: string;
  images: string[];
  includes: string[];
  originalPrice: number;
  price: number;
  startsAt: string;
  /** omitted entirely means "runs until the owner stops it" */
  endsAt?: string;
  isActive: boolean;
  badge?: Offer["badge"];
  sortOrder: number;
}

export async function createOffer(
  businessId: string,
  input: OfferWriteInput,
): Promise<Offer & { message?: string }> {
  if (IS_MOCK) {
    return mockDelay({
      id: `of${Date.now()}`,
      businessId,
      name: toLocalized(input.name),
      description: toLocalized(input.description),
      images: input.images,
      includes: input.includes.map(toLocalized),
      originalPrice: input.originalPrice,
      price: input.price,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      isActive: input.isActive,
      badge: input.badge,
      sortOrder: input.sortOrder,
    });
  }
  const raw = await apiFetch<RawOffer>(`/businesses/${businessId}/offers`, {
    method: "POST",
    body: toOfferBody(input),
  });
  return normalizeOffer(raw);
}

export async function updateOffer(
  businessId: string,
  id: string,
  input: Partial<OfferWriteInput>,
): Promise<Offer & { message?: string }> {
  if (IS_MOCK) {
    return mockDelay({
      id,
      businessId,
      name: toLocalized(input.name ?? ""),
      description: toLocalized(input.description ?? ""),
      images: input.images ?? [],
      includes: (input.includes ?? []).map(toLocalized),
      originalPrice: input.originalPrice ?? 0,
      price: input.price ?? 0,
      startsAt: input.startsAt ?? "",
      endsAt: input.endsAt,
      isActive: input.isActive ?? true,
      badge: input.badge,
      sortOrder: input.sortOrder ?? 0,
    });
  }
  const raw = await apiFetch<RawOffer>(
    `/businesses/${businessId}/offers/${id}`,
    { method: "PATCH", body: toOfferBody(input) },
  );
  return normalizeOffer(raw);
}

export async function deleteOffer(
  businessId: string,
  id: string,
): Promise<{ message?: string } | undefined> {
  if (IS_MOCK) return mockDelay(undefined);
  return apiFetch<{ message?: string }>(
    `/businesses/${businessId}/offers/${id}`,
    { method: "DELETE" },
  );
}

/**
 * Only the keys the caller actually supplied are sent.
 *
 * `endsAt: null` is not the same as omitting it: null clears the end date,
 * omitting it leaves whatever is stored alone — which is what makes
 * "pause this offer" a one-field write.
 */
function toOfferBody(input: Partial<OfferWriteInput>) {
  const body: Record<string, unknown> = {};
  for (const key of [
    "name",
    "description",
    "images",
    "includes",
    "originalPrice",
    "price",
    "startsAt",
    "isActive",
    "badge",
    "sortOrder",
  ] as const) {
    if (input[key] !== undefined) body[key] = input[key];
  }
  if (input.endsAt !== undefined) body.endsAt = input.endsAt || null;
  return body;
}

