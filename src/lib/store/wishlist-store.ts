import { create } from "zustand";

// Unlike the cart, wishlist state is owned by the server (per-user DB rows)
// — this store is just a client-side cache hydrated once on load, not
// persisted to localStorage.
type WishlistState = {
  ids: Set<number>;
  hydrated: boolean;
  hydrate: (ids: number[]) => void;
  add: (id: number) => void;
  remove: (id: number) => void;
};

export const useWishlistStore = create<WishlistState>((set) => ({
  ids: new Set(),
  hydrated: false,
  hydrate: (ids) => set({ ids: new Set(ids), hydrated: true }),
  add: (id) =>
    set((state) => ({ ids: new Set(state.ids).add(id) })),
  remove: (id) =>
    set((state) => {
      const next = new Set(state.ids);
      next.delete(id);
      return { ids: next };
    }),
}));
