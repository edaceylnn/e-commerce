import { auditProduct, type AuditInput } from "./product-audit";

const complete: AuditInput = {
  title: "Yüksek Bel Toparlayıcı Spor Tayt",
  description:
    "Yüksek bel kesimli, toparlayıcı etkili spor tayt. Esnek kumaşı sayesinde yoga, pilates ve günlük kullanımda rahat hareket imkanı sunar.",
  categorySlug: "spor",
  price: 899,
  stock: 0,
  metaTitle: "Yüksek Bel Spor Tayt | EDACEY",
  metaDescription: "Yüksek bel, toparlayıcı spor tayt. Yoga ve pilates için esnek kumaş.",
  images: [{ url: "/products/green-legging.jpg", altText: "Yeşil spor tayt, önden görünüm" }],
  variants: [
    { colorId: "c1", sizeId: "s", stock: 3 },
    { colorId: "c1", sizeId: "m", stock: 5 },
  ],
};

function ids(input: AuditInput) {
  return auditProduct(input).issues.map((i) => i.id);
}

describe("auditProduct", () => {
  it("gives a complete card full score", () => {
    expect(auditProduct(complete)).toEqual({ score: 100, issues: [] });
  });

  it("flags missing description, meta description and alt text", () => {
    const result = auditProduct({
      ...complete,
      description: "  ",
      metaDescription: "",
      images: [{ url: "/a.jpg" }, { url: "/b.jpg", altText: "ok" }],
    });
    expect(result.issues.map((i) => i.id)).toEqual([
      "description-missing",
      "meta-description-missing",
      "image-alt-missing",
    ]);
    expect(result.issues[2].message).toContain("1/2");
    expect(result.score).toBe(100 - 20 - 10 - 5);
  });

  it("flags missing sizes/colors and falls back to product stock without variants", () => {
    expect(ids({ ...complete, variants: [], stock: 0 })).toEqual(["variants-missing", "stock-empty"]);
    expect(ids({ ...complete, variants: [], stock: 4 })).toEqual(["variants-missing"]);
  });

  it("warns about a single size and empty variant stock", () => {
    expect(ids({ ...complete, variants: [{ colorId: "c1", sizeId: "s", stock: 0 }] })).toEqual([
      "variants-single-size",
      "stock-empty",
    ]);
  });

  it("checks length limits", () => {
    expect(ids({ ...complete, title: "Tayt" })).toEqual(["title-short"]);
    expect(ids({ ...complete, description: "Kısa açıklama." })).toEqual(["description-short"]);
    expect(ids({ ...complete, metaDescription: "a".repeat(161) })).toEqual(["meta-description-long"]);
  });

  it("never goes below zero", () => {
    const result = auditProduct({
      title: "",
      description: "",
      categorySlug: "",
      price: 0,
      stock: 0,
      images: [],
      variants: [],
    });
    expect(result.score).toBe(0);
  });
});
