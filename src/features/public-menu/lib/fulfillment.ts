import type { Business, FulfillmentMode } from "@/lib/types";

/** The type-based default for a business that has never configured its own
 * `fulfillmentModes` — restaurants support all three, stores never offer
 * dine-in. Same `"cuisine" in business` narrowing used elsewhere (e.g.
 * `favorites-list.tsx`) to tell a `Restaurant` from a `Store`. */
function defaultFulfillment(business: Business): FulfillmentMode[] {
  // delivery sits in the middle button and is the default selection — the
  // most-used option for most businesses, so it shouldn't need an extra tap
  return "cuisine" in business
    ? ["dineIn", "delivery", "pickup"]
    : ["pickup", "delivery"];
}

/** The owner's own choice (`business.fulfillmentModes`) wins once set;
 * falls back to the type-based default otherwise. `dineIn` is filtered out
 * for a store even if it somehow ended up in the stored list — a store
 * never has a dining room to seat anyone at. */
export function getSupportedFulfillment(business: Business): FulfillmentMode[] {
  const isStore = !("cuisine" in business);
  const configured = business.fulfillmentModes;
  const modes =
    configured && configured.length > 0 ? configured : defaultFulfillment(business);
  return isStore ? modes.filter((m) => m !== "dineIn") : modes;
}
