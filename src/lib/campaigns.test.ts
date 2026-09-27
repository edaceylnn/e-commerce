import { computeCampaignDiscount } from "./campaigns";

const pijamaLine = { categoryId: "pijama", brandId: "brand-a", unitPrice: 100, quantity: 1 };
const sporLine = { categoryId: "spor", brandId: "brand-b", unitPrice: 50, quantity: 2 };

describe("computeCampaignDiscount", () => {
  it("applies a category-scoped discount only to matching lines", () => {
    const discount = computeCampaignDiscount(
      { discountPercentage: 20, categoryId: "pijama", brandId: null, minSpend: null },
      [pijamaLine, sporLine]
    );
    // Only the 100 TL pijama line is eligible: 100 * 0.20
    expect(discount).toBeCloseTo(20, 2);
  });

  it("applies a brand-scoped discount only to matching lines", () => {
    const discount = computeCampaignDiscount(
      { discountPercentage: 10, categoryId: null, brandId: "brand-b", minSpend: null },
      [pijamaLine, sporLine]
    );
    // Only the spor line (2 * 50 = 100) matches brand-b: 100 * 0.10
    expect(discount).toBeCloseTo(10, 2);
  });

  it("applies to the whole cart when neither category nor brand is set", () => {
    const discount = computeCampaignDiscount(
      { discountPercentage: 10, categoryId: null, brandId: null, minSpend: null },
      [pijamaLine, sporLine]
    );
    // (100 + 100) * 0.10
    expect(discount).toBeCloseTo(20, 2);
  });

  it("returns 0 when the cart has no line matching the campaign's scope", () => {
    const discount = computeCampaignDiscount(
      { discountPercentage: 50, categoryId: "loungewear", brandId: null, minSpend: null },
      [pijamaLine, sporLine]
    );
    expect(discount).toBe(0);
  });

  it("returns 0 when the cart subtotal is below minSpend", () => {
    const discount = computeCampaignDiscount(
      { discountPercentage: 10, categoryId: null, brandId: null, minSpend: 1000 },
      [pijamaLine, sporLine]
    );
    expect(discount).toBe(0);
  });

  it("applies once minSpend is met, computed against the full cart", () => {
    const discount = computeCampaignDiscount(
      { discountPercentage: 10, categoryId: null, brandId: null, minSpend: 150 },
      [pijamaLine, sporLine]
    );
    expect(discount).toBeCloseTo(20, 2);
  });
});
