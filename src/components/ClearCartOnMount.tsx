"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/store/cart-store";

// The server confirms payment and creates the Order; the cart itself only
// lives in the browser (Zustand + localStorage), so clearing it after a
// successful order has to happen client-side.
export function ClearCartOnMount() {
  useEffect(() => {
    useCartStore.getState().clear();
  }, []);
  return null;
}
