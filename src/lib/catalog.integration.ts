// Real-database tests for storefront search/listing (src/lib/catalog.ts):
// the accent-folding search functions and trigram index come from a
// migration, and filters/facets are SQL — neither shows up in mocks.
// Run with `npm run test:db`. Every product here carries the token
// "zqxtest" and searches are scoped by it, so other data can't interfere.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@/generated/prisma/client";
import { EMPTY_FILTERS } from "./product-filters";
// catalog.ts opens the database connection on import, so it's loaded in
// before() — after dotenv has read DATABASE_URL (imports run first).
type Catalog = typeof import("./catalog");

const FIRST_ID = 991_000;
const T = "zqxtest";

describe("catalog search (real database)", () => {
  let prisma: PrismaClient;
  let catalog: Catalog;
  let kil: string, siyahYok: string, sizeM: string, sizeS: string;

  const search = (q: string, extra: Partial<Parameters<Catalog["searchCatalog"]>[0]> = {}) =>
    catalog.searchCatalog({ scope: { q }, filters: EMPTY_FILTERS, sort: "onerilen", ...extra });

  before(async () => {
    prisma = (await import("@/lib/db")).prisma;
    catalog = await import("./catalog");
    await prisma.product.deleteMany({ where: { id: { gte: FIRST_ID, lt: FIRST_ID + 1000 } } });
    const [category, colors, sizes] = await Promise.all([
      prisma.category.findFirstOrThrow(),
      prisma.color.findMany({ orderBy: { name: "asc" }, take: 2 }),
      prisma.size.findMany({ orderBy: { position: "asc" }, take: 2 }),
    ]);
    [kil, siyahYok] = [colors[0].id, colors[1].id];
    [sizeS, sizeM] = [sizes[0].id, sizes[1].id];

    const base = { categoryId: category.id, thumbnail: "/x.jpg", status: "ACTIVE" as const };
    // 30 plain products for paging, plus a few with specific traits.
    await prisma.product.createMany({
      data: Array.from({ length: 30 }, (_, i) => ({
        ...base,
        id: FIRST_ID + i,
        title: `${T} Basic Tişört ${i}`,
        description: "Pamuklu",
        price: 100 + i,
      })),
    });
    await prisma.product.create({
      data: {
        ...base,
        id: FIRST_ID + 100,
        title: `${T} Şort Takımı`,
        description: "Yazlık",
        price: 500,
        discountPercentage: 50, // effective 250
        variants: {
          create: [
            { colorId: kil, sizeId: sizeM, sku: `${T}-1`, stock: 3 },
            { colorId: kil, sizeId: sizeS, sku: `${T}-2`, stock: 0 },
          ],
        },
      },
    });
    await prisma.product.create({
      data: {
        ...base,
        id: FIRST_ID + 101,
        title: `${T} Pijama`,
        description: "Şort ve üst takımı",
        price: 300,
        variants: { create: [{ colorId: siyahYok, sizeId: sizeS, sku: `${T}-3`, stock: 5 }] },
      },
    });
  });

  after(async () => {
    if (!prisma) return;
    await prisma.product.deleteMany({ where: { id: { gte: FIRST_ID, lt: FIRST_ID + 1000 } } });
    await prisma.$disconnect();
  });

  it("finds Turkish words typed without Turkish characters, in any case", async () => {
    for (const q of [`${T} sort takimi`, `${T.toUpperCase()} ŞORT`, `${T} TAKIM`]) {
      const r = await search(q);
      assert.ok(r.products.some((p) => p.title === `${T} Şort Takımı`), q);
    }
  });

  it("ranks a title match above a description-only match", async () => {
    const r = await search(`${T} sort`);
    assert.deepEqual(
      r.products.map((p) => p.title),
      [`${T} Şort Takımı`, `${T} Pijama`]
    );
  });

  it("pages through results and reports the full total", async () => {
    const first = await search(`${T} tisort`);
    assert.equal(first.total, 30);
    assert.equal(first.products.length, catalog.LISTING_PAGE_SIZE);
    const both = await search(`${T} tisort`, { pages: 2 });
    assert.equal(both.products.length, 30);
    assert.deepEqual(
      both.products.slice(0, catalog.LISTING_PAGE_SIZE).map((p) => p.id),
      first.products.map((p) => p.id)
    );
  });

  it("matches word starts, not the middle of words", async () => {
    // "tişört" folds to "tisort", which contains "sort" — but not at a word start.
    assert.equal((await search(`${T} sort`)).products.some((p) => p.title.includes("Tişört")), false);
    // Typing the start of a word already finds it.
    assert.equal((await search(`${T} tak`)).products[0]?.title, `${T} Şort Takımı`);
  });

  it("treats typed wildcards and regex characters literally", async () => {
    for (const q of [`${T} %`, `${T} _`, `${T} .*`, `${T} (`, `${T} [`]) {
      assert.equal((await search(q)).total, 0, q);
    }
  });

  it("filters by in-stock size, color and discounted price", async () => {
    const f = (patch: Partial<typeof EMPTY_FILTERS>) => search(T, { filters: { ...EMPTY_FILTERS, ...patch } });
    const size = (id: string) => prisma.size.findUniqueOrThrow({ where: { id } }).then((s) => s.label);
    const color = (id: string) => prisma.color.findUniqueOrThrow({ where: { id } }).then((c) => c.name);

    // Size S exists on the Şort Takımı but with 0 stock — only the Pijama has it in stock.
    assert.deepEqual((await f({ sizes: [await size(sizeS)] })).products.map((p) => p.id), [FIRST_ID + 101]);
    assert.deepEqual((await f({ colors: [await color(kil)] })).products.map((p) => p.id), [FIRST_ID + 100]);
    // 500 at 50% off = 250: inside 200–260, although the list price isn't.
    const priced = await f({ minPrice: 200, maxPrice: 260 });
    assert.deepEqual(priced.products.map((p) => p.id), [FIRST_ID + 100]);
  });

  it("counts facet options over the unfiltered scope", async () => {
    const r = await search(T, { filters: { ...EMPTY_FILTERS, colors: ["no-such-color"] } });
    assert.equal(r.total, 0);
    assert.equal(r.scopeTotal, 32);
    const sizeS_ = await prisma.size.findUniqueOrThrow({ where: { id: sizeS } });
    // Only in-stock variants count: S is in stock on one product.
    assert.equal(r.facets.sizes.find((s) => s.value === sizeS_.label)?.count, 1);
    assert.equal(r.facets.priceMin, 100);
    assert.equal(r.facets.priceMax, 300);
  });

  it("sorts by effective price", async () => {
    const r = await search(`${T}`, { sort: "price-desc" });
    assert.equal(r.products[0].id, FIRST_ID + 101); // 300 beats 500×50% = 250
  });
});
