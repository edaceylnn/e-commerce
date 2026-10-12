import { parseProductParam, productPath } from "./product-url";

describe("productPath", () => {
  it("joins the id and a Turkish-aware slug of the title", () => {
    expect(productPath({ id: 1, title: "Yumuşak Örme Hırka & Pantolon" })).toBe(
      "/products/1-yumusak-orme-hirka-pantolon"
    );
    expect(productPath({ id: 12, title: "İndirimli Çizgili Takım" })).toBe("/products/12-indirimli-cizgili-takim");
  });

  it("falls back to the bare id when the title has no slug-able characters", () => {
    expect(productPath({ id: 7, title: "—" })).toBe("/products/7");
  });
});

describe("parseProductParam", () => {
  it("reads the id from a slugged or bare segment", () => {
    expect(parseProductParam("1-yumusak-orme-hirka-pantolon")).toBe(1);
    expect(parseProductParam("118")).toBe(118);
  });

  it("rejects segments that don't start with a whole id", () => {
    expect(parseProductParam("yumusak-orme")).toBeNull();
    expect(parseProductParam("12abc")).toBeNull();
    expect(parseProductParam("")).toBeNull();
    expect(parseProductParam("99999999999999999999")).toBeNull();
  });
});
