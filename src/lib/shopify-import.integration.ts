// Real-database tests for the Shopify CSV import: a new product with new
// colours/sizes/brand, updating one we exported, importing the same file
// twice without duplicates, and skipping what's wrong. Images come from a
// fake downloader (no network). Run with `npm run test:db`.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@/generated/prisma/client";

type Csv = typeof import("./shopify-csv");
type Import = typeof import("./shopify-import");

const TAG = `IMPTEST${Date.now().toString(36).toUpperCase()}`;
// A 1×1 PNG, as the "downloaded" image.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);
const fakeDownload = async (url: string) => {
  if (url.includes("broken")) throw new Error("404");
  return { bytes: PNG, ext: "png" };
};

describe("Shopify CSV import (real database)", () => {
  let prisma: PrismaClient;
  let csv: Csv;
  let imp: Import;
  let categoryId: string;
  const productIds = new Set<number>();

  const importCsv = async (text: string, updateStock = true) => {
    const { products, errors } = csv.parseShopifyCsv(text);
    const results = await imp.run(products, errors, { fallbackCategoryId: categoryId, taxRate: 10, updateStock }, fakeDownload);
    for (const r of results) if (r.productId) productIds.add(r.productId);
    return results;
  };

  before(async () => {
    prisma = (await import("@/lib/db")).prisma;
    csv = await import("./shopify-csv");
    imp = await import("./shopify-import");
    categoryId = (await prisma.category.findFirstOrThrow({ orderBy: { position: "asc" } })).id;
  });

  after(async () => {
    if (!prisma) return;
    const images = await prisma.productImage.findMany({ where: { productId: { in: [...productIds] } } });
    for (const img of images) {
      if (img.url.startsWith("/uploads/")) await rm(path.join(process.cwd(), "public", img.url), { force: true });
    }
    await prisma.product.deleteMany({ where: { id: { in: [...productIds] } } });
    await prisma.color.deleteMany({ where: { name: { startsWith: TAG } } });
    await prisma.size.deleteMany({ where: { label: { startsWith: TAG } } });
    await prisma.brand.deleteMany({ where: { name: { startsWith: TAG } } });
    await prisma.$disconnect();
  });

  const newProductCsv = () =>
    [
      "Handle,Title,Body (HTML),Vendor,Type,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Variant SKU,Variant Price,Variant Compare At Price,Variant Inventory Qty,Image Src,Image Alt Text",
      `${TAG.toLowerCase()}-set,${TAG} Saten Set,<p>Parlak <b>saten</b></p>,${TAG} Marka,Bilinmeyen Tür,Color,${TAG}-Mor,Size,${TAG}-S,${TAG}-1,1000.00,1250.00,4,https://cdn.example.com/a.png,Önden`,
      `${TAG.toLowerCase()}-set,,,,,,${TAG}-Mor,,${TAG}-M,${TAG}-2,1000.00,1250.00,0,https://cdn.example.com/broken.png,`,
    ].join("\n");

  it("creates a new product with its variants, pricing, images and stock trail", async () => {
    const [result] = await importCsv(newProductCsv());
    assert.equal(result.done, true, result.errors.join(" "));
    assert.equal(result.action, "create");
    // One of the two images failed to download: a warning, not a failure.
    assert.ok(result.warnings.includes("Görsel indirilemedi: https://cdn.example.com/broken.png"), result.warnings.join(" | "));

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: result.productId! },
      include: { variants: { include: { color: true, size: true } }, images: true, brand: true },
    });
    assert.equal(product.title, `${TAG} Saten Set`);
    assert.equal(product.description, "Parlak saten");
    assert.equal(Number(product.price), 1250); // compare-at is the base…
    assert.equal(Number(product.discountPercentage), 20); // …and the price a 20% discount
    assert.equal(Number(product.taxRate), 10);
    assert.equal(product.categoryId, categoryId); // unknown type → fallback
    assert.equal(product.brand?.name, `${TAG} Marka`);
    assert.equal(product.images.length, 1);
    assert.match(product.thumbnail, /^\/uploads\/products\/.+\.png$/);
    assert.deepEqual(
      product.variants.map((v) => [v.sku, v.color.name, v.size.label, v.stock]).sort(),
      [
        [`${TAG}-1`, `${TAG}-Mor`, `${TAG}-S`, 4],
        [`${TAG}-2`, `${TAG}-Mor`, `${TAG}-M`, 0],
      ]
    );
    assert.equal(product.stock, 4); // total kept by the database trigger
    const movements = await prisma.stockMovement.findMany({ where: { productId: product.id } });
    assert.deepEqual(movements.map((m) => [m.type, m.quantity]), [["RECEIVING", 4]]);
  });

  it("updates instead of duplicating when the same file comes again", async () => {
    const text = newProductCsv().replace(",4,https", ",9,https");
    const [result] = await importCsv(text);
    assert.equal(result.action, "update");
    assert.equal(await prisma.product.count({ where: { title: `${TAG} Saten Set` } }), 1);
    const variant = await prisma.productVariant.findUniqueOrThrow({ where: { sku: `${TAG}-1` } });
    assert.equal(variant.stock, 9);
    const adjustment = await prisma.stockMovement.findFirstOrThrow({
      where: { variantId: variant.id, type: "MANUAL_ADJUSTMENT" },
    });
    assert.deepEqual([adjustment.previousStock, adjustment.newStock], [4, 9]);

    // Without "update stock", stock stays as it is.
    await importCsv(text.replace(",9,https", ",1,https"), false);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { sku: `${TAG}-1` } })).stock, 9);
    // Replaced images don't leave their files behind.
    const images = await prisma.productImage.findMany({ where: { productId: result.productId! } });
    assert.equal(images.length, 1);
    const { readdir } = await import("node:fs/promises");
    const files = await readdir(path.join(process.cwd(), "public", "uploads", "products"));
    const ours = files.filter((f) => images.some((i) => i.url.endsWith(f)));
    assert.equal(ours.length, 1);
  });

  it("round-trips our own export: matched by handle, nothing duplicated", async () => {
    const id = [...productIds][0];
    const p = await prisma.product.findUniqueOrThrow({
      where: { id },
      include: { category: true, brand: true, images: true, variants: { include: { color: true, size: true } } },
    });
    const rows = csv.productsToShopifyRows(
      [
        {
          id: p.id,
          title: p.title,
          description: p.description,
          vendor: p.brand?.name ?? null,
          type: p.category.label,
          tags: p.tags,
          status: p.status,
          price: Number(p.price),
          discountPercentage: Number(p.discountPercentage),
          cost: null,
          stock: p.stock,
          seoTitle: null,
          seoDescription: null,
          images: p.images.map((i) => ({ url: i.url, alt: i.altText })),
          variants: p.variants.map((v) => ({ sku: v.sku, color: v.color.name, size: v.size.label, stock: v.stock, priceOverride: null })),
        },
      ],
      (await import("./email/outbox")).siteUrl
    );
    const { products, errors } = csv.parseShopifyCsv((await import("./csv")).toCsv(rows));
    const options = { fallbackCategoryId: categoryId, taxRate: 20, updateStock: true };
    const planned = await imp.plan(products, errors, options);
    assert.equal(planned.products[0].action, "update");
    assert.equal(planned.products[0].productId, id);
    assert.deepEqual(planned.newColors, []);

    // Our own images are reused as they are: nothing is downloaded, and
    // the file stays (it's still the product's image).
    let downloads = 0;
    const [result] = await imp.run(products, errors, options, async (url) => {
      downloads++;
      return fakeDownload(url);
    });
    assert.equal(result.done, true, result.errors.join(" "));
    assert.equal(downloads, 0);
    const after_ = await prisma.product.findUniqueOrThrow({ where: { id }, include: { images: true } });
    assert.equal(after_.thumbnail, p.thumbnail);
    assert.deepEqual(after_.images.map((i) => i.url), p.images.map((i) => i.url));
    const { access } = await import("node:fs/promises");
    await access(path.join(process.cwd(), "public", p.thumbnail));
  });

  it("gives products created at the same moment different ids", async () => {
    const { nextProductId } = await import("./product-ids");
    const ids = await Promise.all(
      [1, 2, 3, 4, 5].map((n) =>
        prisma.$transaction(async (tx) => {
          const id = await nextProductId(tx);
          await tx.product.create({
            data: { id, title: `${TAG} Eşzamanlı ${n}`, description: "", categoryId, price: 1, thumbnail: "/products/green-legging.jpg" },
          });
          return id;
        })
      )
    );
    ids.forEach((id) => productIds.add(id));
    assert.equal(new Set(ids).size, 5);
  });

  it("skips what's wrong and writes nothing for it", async () => {
    const text = [
      "URL handle,Title,Option1 name,Option1 value,SKU,Price,Product image URL",
      `${TAG.toLowerCase()}-bad,${TAG} Bozuk,Materyal,Pamuk,${TAG}-X,100,https://cdn.example.com/x.png`,
      `${TAG.toLowerCase()}-noimg,${TAG} Görselsiz,,,${TAG}-Y,100,`,
      `${TAG.toLowerCase()}-dead,${TAG} Ölü Görsel,,,${TAG}-Z,100,https://cdn.example.com/broken.png`,
    ].join("\n");
    const results = await importCsv(text);
    assert.deepEqual(results.map((r) => r.done), [false, false, false]);
    assert.match(results[0].errors.join(" "), /Desteklenmeyen seçenek/);
    assert.match(results[1].errors.join(" "), /en az bir görsel/);
    assert.match(results[2].errors.join(" "), /hiçbiri indirilemedi/);
    assert.equal(await prisma.product.count({ where: { title: { in: [`${TAG} Bozuk`, `${TAG} Görselsiz`, `${TAG} Ölü Görsel`] } } }), 0);
  });
});
