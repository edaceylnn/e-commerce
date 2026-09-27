import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: number;
  title: string;
  price: number;
  thumbnail: string;
  quantity: number;
  variantId?: string;
  sku?: string;
  /** Display label for the selected variant, e.g. "Bordo" — captured at
   *  add-to-cart time since the line only stores variantId otherwise. */
  variantLabel?: string;
  /** Pre-discount unit price, only set for non-variant discounted items
   *  (variants don't carry their own discountPercentage in the schema). */
  compareAtPrice?: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: number, variantId?: string) => void;
  setQuantity: (id: number, quantity: number, variantId?: string) => void;
  clear: () => void;
};

function isSameLine(
  item: Pick<CartItem, "id" | "variantId">,
  id: number,
  variantId?: string
) {
  return item.id === id && item.variantId === variantId;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) =>
            isSameLine(i, item.id, item.variantId)
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                isSameLine(i, item.id, item.variantId)
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),
      removeItem: (id, variantId) =>
        set((state) => ({
          items: state.items.filter((i) => !isSameLine(i, id, variantId)),
        })),
      setQuantity: (id, quantity, variantId) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => !isSameLine(i, id, variantId))
              : state.items.map((i) =>
                  isSameLine(i, id, variantId) ? { ...i, quantity } : i
                ),
        })),
      clear: () => set({ items: [] }),
    }),
    // Bumped from "ecommerce-cart" — CartItem's shape changed (variantId/sku),
    // and old persisted carts predate variant-aware line matching.
    { name: "ecommerce-cart-v2" }
  )
);

export const selectCartCount = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.quantity, 0);

export const selectCartTotal = (state: CartState) =>
  state.items.reduce((sum, i) => sum + i.quantity * i.price, 0);
