import { act } from "@testing-library/react";
import { useCartStore, selectCartCount, selectCartTotal } from "./cart-store";

const sampleItem = {
  id: 1,
  title: "Uzun Kollu Ev Takımı",
  price: 8.99,
  thumbnail: "/thumb.webp",
};

beforeEach(() => {
  act(() => {
    useCartStore.getState().clear();
  });
});

describe("cart-store", () => {
  it("adds a new item with quantity 1", () => {
    act(() => useCartStore.getState().addItem(sampleItem));

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({ ...sampleItem, quantity: 1 });
  });

  it("increments quantity when the same item is added again", () => {
    act(() => {
      useCartStore.getState().addItem(sampleItem);
      useCartStore.getState().addItem(sampleItem);
    });

    expect(useCartStore.getState().items[0].quantity).toBe(2);
    expect(selectCartCount(useCartStore.getState())).toBe(2);
  });

  it("removes the item once quantity is set to 0", () => {
    act(() => {
      useCartStore.getState().addItem(sampleItem);
      useCartStore.getState().setQuantity(sampleItem.id, 0);
    });

    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("computes the running total across quantities", () => {
    act(() => {
      useCartStore.getState().addItem(sampleItem);
      useCartStore.getState().setQuantity(sampleItem.id, 3);
    });

    expect(selectCartTotal(useCartStore.getState())).toBeCloseTo(26.97, 2);
  });

  it("clears all items", () => {
    act(() => {
      useCartStore.getState().addItem(sampleItem);
      useCartStore.getState().clear();
    });

    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("keeps different variants of the same product as separate lines", () => {
    act(() => {
      useCartStore.getState().addItem({ ...sampleItem, variantId: "v1", sku: "SKU-1" });
      useCartStore.getState().addItem({ ...sampleItem, variantId: "v2", sku: "SKU-2" });
    });

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(2);
    expect(state.items.map((i) => i.variantId)).toEqual(["v1", "v2"]);
  });

  it("increments only the matching variant's quantity", () => {
    act(() => {
      useCartStore.getState().addItem({ ...sampleItem, variantId: "v1" });
      useCartStore.getState().addItem({ ...sampleItem, variantId: "v2" });
      useCartStore.getState().addItem({ ...sampleItem, variantId: "v1" });
    });

    const state = useCartStore.getState();
    expect(state.items.find((i) => i.variantId === "v1")?.quantity).toBe(2);
    expect(state.items.find((i) => i.variantId === "v2")?.quantity).toBe(1);
  });

  it("removes only the specified variant's line", () => {
    act(() => {
      useCartStore.getState().addItem({ ...sampleItem, variantId: "v1" });
      useCartStore.getState().addItem({ ...sampleItem, variantId: "v2" });
      useCartStore.getState().setQuantity(sampleItem.id, 0, "v1");
    });

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].variantId).toBe("v2");
  });
});
