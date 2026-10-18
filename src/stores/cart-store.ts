import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CatalogItem, CatalogOption, OptionSelectionType } from "@/lib/types";

/**
 * A selected option, tagged with its group's `selectionType` — the cart and
 * the WhatsApp message need to tell a size pick from an add-on apart (one
 * replaces the price, the other stacks on it) without holding onto the
 * whole `CatalogOptionGroup` just to look that up.
 */
export interface CartOption extends CatalogOption {
  selectionType: OptionSelectionType;
}

export interface CartLine {
  /** item id + selected option ids — lines with different options stay separate */
  key: string;
  item: CatalogItem;
  options: CartOption[];
  quantity: number;
}

const lineKey = (itemId: string, options: CatalogOption[]) =>
  `${itemId}|${options
    .map((o) => o.id)
    .sort()
    .join(",")}`;

export const lineUnitPrice = (line: CartLine) =>
  line.item.price + line.options.reduce((sum, o) => sum + o.priceDelta, 0);

interface CartState {
  /** Carts are kept per business (restaurant or store) so a second QR never mixes orders */
  restaurantId: string | null;
  lines: CartLine[];
  addItem: (
    restaurantId: string,
    item: CatalogItem,
    options?: CartOption[],
    quantity?: number,
  ) => void;
  removeLine: (key: string) => void;
  /** drops one selected option from a line — used for an add-on's own "x",
   * which should only clear that pick, not the whole item */
  removeLineOption: (key: string, optionId: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      restaurantId: null,
      lines: [],

      addItem: (restaurantId, item, options = [], quantity = 1) =>
        set((state) => {
          // Switching restaurants starts a fresh cart
          const lines =
            state.restaurantId === restaurantId ? state.lines : [];
          // a quantity-locked item (see CatalogItem.quantityLocked) never
          // merges into an existing line — each add is its own 1x order,
          // since a stacked quantity would be meaningless (or, worse,
          // silently wrong) for something like a customer-typed amount
          if (item.quantityLocked) {
            const key = `${lineKey(item.id, options)}::${crypto.randomUUID()}`;
            return {
              restaurantId,
              lines: [...lines, { key, item, options, quantity: 1 }],
            };
          }
          const key = lineKey(item.id, options);
          const existing = lines.find((l) => l.key === key);
          return {
            restaurantId,
            lines: existing
              ? lines.map((l) =>
                  l.key === key
                    ? { ...l, quantity: l.quantity + quantity }
                    : l,
                )
              : [...lines, { key, item, options, quantity }],
          };
        }),

      removeLine: (key) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.key !== key),
        })),

      removeLineOption: (key, optionId) =>
        set((state) => {
          const line = state.lines.find((l) => l.key === key);
          if (!line) return state;
          const nextOptions = line.options.filter((o) => o.id !== optionId);
          const nextKey = lineKey(line.item.id, nextOptions);
          // the option's removal may land on a combo another line already
          // holds (e.g. the same dish with fewer add-ons already in the
          // cart) — merge into it instead of carrying two lines for one combo
          const mergeTarget = state.lines.find(
            (l) => l.key === nextKey && l.key !== key,
          );
          if (mergeTarget) {
            return {
              lines: state.lines
                .filter((l) => l.key !== key)
                .map((l) =>
                  l.key === nextKey
                    ? { ...l, quantity: l.quantity + line.quantity }
                    : l,
                ),
            };
          }
          return {
            lines: state.lines.map((l) =>
              l.key === key ? { ...l, key: nextKey, options: nextOptions } : l,
            ),
          };
        }),

      setQuantity: (key, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) =>
                  l.key === key ? { ...l, quantity } : l,
                ),
        })),

      clear: () => set({ lines: [], restaurantId: null }),
    }),
    // v5: an option now also carries its group's `selectionType` — bumped
    // so a stale cart from before that field existed resets instead of
    // showing every pick as an additive add-on
    { name: "menu-syria-cart", version: 5 },
  ),
);

export const selectCartCount = (state: CartState) =>
  state.lines.reduce((sum, l) => sum + l.quantity, 0);

export const selectCartTotal = (state: CartState) =>
  state.lines.reduce((sum, l) => sum + l.quantity * lineUnitPrice(l), 0);
