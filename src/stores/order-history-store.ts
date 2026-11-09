import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CartLine } from "@/stores/cart-store";
import type { FulfillmentMode, LocalizedText } from "@/lib/types";

export interface OrderHistoryEntry {
  id: string;
  /** the real backend order id (`placeExternalOrder`'s response.id) — only
   * present for an order placed through the platform, not the plain
   * WhatsApp hand-off. Lets this entry link to `/track/:id`. */
  serverId?: string;
  /** the logged-in customer's session identifier (phone) — scopes entries per account */
  customerId: string;
  businessId: string;
  businessSlug: string;
  businessType: "restaurant" | "store";
  businessName: LocalizedText;
  fulfillment: FulfillmentMode;
  lines: CartLine[];
  total: number;
  createdAt: string;
}

interface OrderHistoryState {
  entries: OrderHistoryEntry[];
  addEntry: (entry: OrderHistoryEntry) => void;
}

export const useOrderHistoryStore = create<OrderHistoryState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) =>
        set((state) => ({ entries: [entry, ...state.entries] })),
    }),
    { name: "menu-syria-order-history" },
  ),
);
