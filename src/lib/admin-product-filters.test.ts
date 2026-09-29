import {
  adminProductFilterParams,
  applyStockFilter,
  parseAdminProductFilters,
  productStatusFor,
} from "./admin-product-filters";

describe("parseAdminProductFilters", () => {
  it("keeps known values and drops unknown ones", () => {
    expect(parseAdminProductFilters({ q: "tayt", category: "spor", status: "draft", stock: "nope" })).toEqual({
      q: "tayt",
      category: "spor",
      brand: undefined,
      status: "draft",
      stock: undefined,
    });
  });

  it("maps the old tab links onto the filters", () => {
    expect(parseAdminProductFilters({ view: "low-stock" }).stock).toBe("critical");
    expect(parseAdminProductFilters({ view: "out-of-stock" }).stock).toBe("out-of-stock");
    expect(parseAdminProductFilters({ view: "draft" }).status).toBe("draft");
    expect(parseAdminProductFilters({ view: "active" }).status).toBe("active");
    // The old "Çok Satanlar" tab has no filter equivalent: it just shows all.
    expect(parseAdminProductFilters({ view: "best-sellers" })).toEqual(parseAdminProductFilters({}));
    // An explicit filter wins over a legacy view.
    expect(parseAdminProductFilters({ view: "draft", status: "archived" }).status).toBe("archived");
  });
});

describe("adminProductFilterParams", () => {
  it("round-trips through the URL without empty keys", () => {
    const filters = parseAdminProductFilters({ category: "spor", status: "draft", stock: "critical" });
    const params = adminProductFilterParams(filters);
    expect(params.toString()).toBe("category=spor&status=draft&stock=critical");
    expect(parseAdminProductFilters(Object.fromEntries(params))).toEqual(filters);
  });
});

describe("productStatusFor", () => {
  it("translates the URL value to the database status", () => {
    expect(productStatusFor("draft")).toBe("DRAFT");
    expect(productStatusFor(undefined)).toBeUndefined();
  });
});

describe("applyStockFilter", () => {
  const rows = [
    { id: 3, stock: 0, isLowStock: false },
    { id: 2, stock: 3, isLowStock: true },
    { id: 1, stock: 50, isLowStock: false },
  ];
  const ids = (r: typeof rows) => r.map((x) => x.id);

  it("filters by stock state and keeps the incoming (newest-first) order", () => {
    expect(ids(applyStockFilter(rows, {}))).toEqual([3, 2, 1]);
    expect(ids(applyStockFilter(rows, { stock: "critical" }))).toEqual([2]);
    expect(ids(applyStockFilter(rows, { stock: "in-stock" }))).toEqual([2, 1]);
    expect(ids(applyStockFilter(rows, { stock: "out-of-stock" }))).toEqual([3]);
  });
});
