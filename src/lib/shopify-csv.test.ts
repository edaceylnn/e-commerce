import { toCsv } from "@/lib/csv";
import {
  htmlToText,
  parseMoney,
  parseShopifyCsv,
  planPricing,
  productsToShopifyRows,
  textToHtml,
  type ExportProduct,
} from "@/lib/shopify-csv";

const tayt: ExportProduct = {
  id: 42,
  title: "Yüksek Bel Tayt",
  description: "Yumuşak <örme> kumaş.\nNefes alır.\n\nMakinede yıkanabilir.",
  vendor: "EDACEY",
  type: "Spor",
  tags: ["tayt", "spor"],
  status: "ACTIVE",
  price: 1290,
  discountPercentage: 10,
  cost: 400,
  stock: 12,
  seoTitle: "Tayt",
  seoDescription: null,
  images: [
    { url: "/products/tayt-1.jpg", alt: "Önden" },
    { url: "/products/tayt-2.jpg", alt: null },
    { url: "https://cdn.example.com/tayt-3.jpg", alt: "Yandan" },
  ],
  variants: [
    { sku: "TYT-SYH-S", color: "Siyah", size: "S", stock: 5, priceOverride: null },
    { sku: "TYT-SYH-M", color: "Siyah", size: "M", stock: 7, priceOverride: 1390 },
  ],
};
const absolute = (path: string) => `https://edacey.example${path}`;

describe("Shopify CSV export", () => {
  it("writes a row per variant and per extra image under one handle", () => {
    const [header, ...rows] = productsToShopifyRows([tayt], absolute);
    const col = (name: string) => header.indexOf(name);
    expect(rows).toHaveLength(3); // 2 variants, 3 images
    expect(rows.every((r) => r[col("URL handle")] === "yuksek-bel-tayt-42")).toBe(true);
    expect(rows[0][col("Title")]).toBe("Yüksek Bel Tayt");
    expect(rows[1][col("Title")]).toBe(""); // product fields on the first row only
    expect(rows[0][col("Option1 name")]).toBe("Renk");
    expect(rows[1][col("Option2 value")]).toBe("M");
    // Discounted price, with the original as compare-at; override kept.
    expect(rows[0][col("Price")]).toBe("1161.00");
    expect(rows[0][col("Compare-at price")]).toBe("1290.00");
    expect(rows[1][col("Price")]).toBe("1251.00");
    expect(rows[1][col("Compare-at price")]).toBe("1390.00");
    expect(rows[2][col("SKU")]).toBe(""); // image-only row
    expect(rows[0][col("Product image URL")]).toBe("https://edacey.example/products/tayt-1.jpg");
    expect(rows[2][col("Product image URL")]).toBe("https://cdn.example.com/tayt-3.jpg");
    expect(rows[0][col("Description")]).toBe("<p>Yumuşak &lt;örme&gt; kumaş.<br>Nefes alır.</p><p>Makinede yıkanabilir.</p>");
  });

  it("writes a product without variants the way Shopify does", () => {
    const [header, row] = productsToShopifyRows([{ ...tayt, variants: [], images: [], discountPercentage: 0 }], absolute);
    expect(row[header.indexOf("Option1 name")]).toBe("Title");
    expect(row[header.indexOf("Option1 value")]).toBe("Default Title");
    expect(row[header.indexOf("Inventory quantity")]).toBe("12");
    expect(row[header.indexOf("Compare-at price")]).toBe("");
  });

  it("reads back what it writes", () => {
    const { products, errors } = parseShopifyCsv(toCsv(productsToShopifyRows([tayt], absolute)));
    expect(errors).toEqual([]);
    const [p] = products;
    expect(p.errors).toEqual([]);
    expect(p.title).toBe(tayt.title);
    expect(p.description).toBe(tayt.description);
    expect(p.tags).toEqual(["tayt", "spor"]);
    expect(p.variants.map((v) => [v.color, v.size, v.sku, v.stock])).toEqual([
      ["Siyah", "S", "TYT-SYH-S", 5],
      ["Siyah", "M", "TYT-SYH-M", 7],
    ]);
    expect(p.images.map((i) => i.alt)).toEqual(["Önden", null, "Yandan"]);
    const pricing = planPricing(p.variants);
    expect(pricing).toMatchObject({ price: 1290, discountPercentage: 10, cost: 400, overrides: [null, 1390], warnings: [] });
  });
});

describe("Shopify CSV import", () => {
  it("accepts the older column names too", () => {
    const csv = [
      "Handle,Title,Body (HTML),Vendor,Type,Tags,Option1 Name,Option1 Value,Variant SKU,Variant Price,Variant Compare At Price,Variant Inventory Qty,Image Src",
      'pijama,Saten Pijama,<p>Parlak &amp; yumuşak</p>,Marka,Pijama,"a, b",Size,M,PJ-M,899.90,,3,https://cdn.shopify.com/p1.jpg',
      "pijama,,,,,,,L,PJ-L,899.90,,0,https://cdn.shopify.com/p2.jpg",
    ].join("\n");
    const { products } = parseShopifyCsv(csv);
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      handle: "pijama",
      description: "Parlak & yumuşak",
      tags: ["a", "b"],
      hasOptions: true,
      errors: [],
    });
    expect(products[0].variants.map((v) => [v.color, v.size, v.price])).toEqual([
      [null, "M", 899.9],
      [null, "L", 899.9],
    ]);
    expect(products[0].images).toHaveLength(2);
  });

  it("explains what's wrong, per line", () => {
    const csv = [
      "URL handle,Title,Option1 name,Option1 value,SKU,Price,Inventory quantity,Product image URL",
      "a,Ürün A,Materyal,Pamuk,A-1,100,1,https://x.example/a.jpg",
      "b,Ürün B,Renk,Mavi,B-1,abc,-2,ftp://x.example/b.jpg",
      "b,,,Mavi,A-1,50,1,",
    ].join("\n");
    const { products } = parseShopifyCsv(csv);
    const [a, b] = products;
    expect(a.errors.join(" ")).toMatch(/Desteklenmeyen seçenek "Materyal"/);
    expect(b.errors.join(" ")).toMatch(/Satır 3: geçerli bir fiyat/);
    expect(b.errors.join(" ")).toMatch(/Satır 3: stok/);
    expect(b.warnings.join(" ")).toMatch(/Satır 3: görsel adresi geçersiz/);
    expect(b.errors.join(" ")).toMatch(/aynı renk\/beden/);
    expect(b.errors.join(" ")).toMatch(/SKU "A-1" dosyada başka bir üründe de var/);
  });

  it("refuses a file that isn't a product CSV", () => {
    expect(parseShopifyCsv("Ad,Soyad\nAyşe,Yılmaz").errors[0]).toMatch(/Title/);
    expect(parseShopifyCsv("Title\n").errors[0]).toMatch(/veri yok/);
  });

  it("reads prices written either way", () => {
    expect(parseMoney("1290.50")).toBe(1290.5);
    expect(parseMoney("1.290,50")).toBe(1290.5);
    expect(parseMoney("1,290.50")).toBe(1290.5);
    expect(parseMoney("₺ 899,9")).toBe(899.9);
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("on iki")).toBeNaN();
  });

  it("warns when variants were discounted differently", () => {
    const v = (price: number, compareAt: number | null) => ({ color: null, size: null, sku: "", price, compareAt, cost: null, stock: 0 });
    expect(planPricing([v(90, 100), v(80, 100)]).warnings[0]).toMatch(/%10 indirim/);
  });

  it("converts HTML descriptions to text", () => {
    expect(htmlToText("<h2>Özellikler</h2><ul><li>Pamuk</li><li>Likra</li></ul><p>A&nbsp;B &#8217;</p>")).toBe(
      "Özellikler\n\n- Pamuk\n- Likra\n\nA B ’"
    );
    expect(textToHtml("a\n\nb")).toBe("<p>a</p><p>b</p>");
  });
});
