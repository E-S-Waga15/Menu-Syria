import type { Business, FulfillmentMode } from "@/lib/types";

/** The type-based default for a business that has never configured its own
 * `fulfillmentModes` — restaurants support all three, stores never offer
 * dine-in. Same `"cuisine" in business` narrowing used elsewhere (e.g.
 * `favorites-list.tsx`) to tell a `Restaurant` from a `Store`. */
function defaultFulfillment(business: Business): FulfillmentMode[] {
  return "cuisine" in business
    ? ["dineIn", "pickup", "delivery"]
    : ["pickup", "delivery"];
}

/** Delivery always sits in the middle button, whichever order the owner
 * saved (or never set) — it's the most-used option for most businesses, so
 * it shouldn't need an extra tap to reach. Only the display order changes;
 * which modes are offered at all still comes entirely from the owner's own
 * choice (or the type-based default). */
const DISPLAY_ORDER: FulfillmentMode[] = ["dineIn", "delivery", "pickup"];

/** The owner's own choice (`business.fulfillmentModes`) wins once set;
 * falls back to the type-based default otherwise. `dineIn` is filtered out
 * for a store even if it somehow ended up in the stored list — a store
 * never has a dining room to seat anyone at. */
export function getSupportedFulfillment(business: Business): FulfillmentMode[] {
  const isStore = !("cuisine" in business);
  const configured = business.fulfillmentModes;
  const modes =
    configured && configured.length > 0 ? configured : defaultFulfillment(business);
  const supported = isStore ? modes.filter((m) => m !== "dineIn") : modes;
  return [...supported].sort(
    (a, b) => DISPLAY_ORDER.indexOf(a) - DISPLAY_ORDER.indexOf(b),
  );
}
