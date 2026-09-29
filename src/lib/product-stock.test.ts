import { generateSku, totalVariantStock, variantDuplicatesError } from "./product-stock";

describe("totalVariantStock", () => {
  it("sums variant stock", () => {
    expect(totalVariantStock([{ stock: 3 }, { stock: 0 }, { stock: 4 }])).toBe(7);
    expect(totalVariantStock([])).toBe(0);
  });
});

describe("variantDuplicatesError", () => {
  const v = (colorId: string, sizeId: string, sku: string) => ({ colorId, sizeId, sku });

  it("accepts distinct color/size rows", () => {
    expect(variantDuplicatesError([v("kil", "s", "A-S"), v("kil", "m", "A-M"), v("siyah", "s", "B-S")])).toBeNull();
  });

  it("rejects the same color and size twice", () => {
    expect(variantDuplicatesError([v("kil", "s", "A-1"), v("kil", "s", "A-2")])).toBe(
      "Aynı renk ve beden iki kez eklenmiş."
    );
  });

  it("lets several blank SKUs through (they're generated on save)", () => {
    expect(variantDuplicatesError([v("kil", "s", ""), v("kil", "m", " ")])).toBeNull();
  });

  it("rejects a repeated SKU, ignoring case and spaces", () => {
    expect(variantDuplicatesError([v("kil", "s", "A-S"), v("kil", "m", " a-s ")])).toContain("iki varyantta");
  });
});

describe("generateSku", () => {
  it("follows the ED-<id> convention with Turkish-safe color and size", () => {
    expect(generateSku(123, "Kil", "M")).toBe("ED-123-KIL-M");
    expect(generateSku(7, "Zeytin Yeşili", "XS")).toBe("ED-7-ZEYTIN-YESILI-XS");
    expect(generateSku(7, "Çizgili Ekru", "Standart Beden")).toBe("ED-7-CIZGILI-EKRU-STANDART-BEDEN");
  });
});
