// Runs against the real database (DATABASE_URL from .env.local): the whole
// point is concurrent transactions and the Product.stock trigger, which
// mocks can't show. Uses node:test via tsx rather than Jest, which can't
// load Prisma 7's ESM query engine (why the Jest suites mock the DB).
// Not part of `npm test`, so it never touches your data unasked:
//   npm run test:db
// Everything it creates is namespaced and deleted afterwards. Like any
// checkout, it also releases other orders' reservations that have expired.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  InsufficientStockError,
  markOrderPaid,
  OrderNotPayableError,
  releaseExpiredReservations,
  releaseReservation,
  reserveStock,
} from "./stock-reservation";

const PRODUCT_ID = 990_001;
const TAG = "stock-reservation-db-test";

describe("stock reservation (real database)", () => {
  let prisma: PrismaClient;
  let userId: string;
  let addressId: string;
  let variantId: string;
  let orderSeq = 0;

  async function setVariantStock(stock: number) {
    await prisma.productVariant.update({ where: { id: variantId }, data: { stock } });
  }
  async function stocks() {
    const [variant, product] = await Promise.all([
      prisma.productVariant.findUniqueOrThrow({ where: { id: variantId }, select: { stock: true } }),
      prisma.product.findUniqueOrThrow({ where: { id: PRODUCT_ID }, select: { stock: true } }),
    ]);
    return { variant: variant.stock, product: product.stock };
  }
  async function newOrder(extra: { reservedUntil?: Date | null; status?: "PENDING_PAYMENT" | "IPTAL" } = {}) {
    return prisma.order.create({
      data: {
        orderNumber: `${TAG}-${Date.now()}-${orderSeq++}`,
        userId,
        shippingAddressId: addressId,
        billingAddressId: addressId,
        subtotal: 100,
        total: 100,
        status: extra.status ?? "PENDING_PAYMENT",
        reservedUntil: extra.reservedUntil === undefined ? new Date(Date.now() + 60_000) : extra.reservedUntil,
        items: {
          create: [{ productId: PRODUCT_ID, variantId, title: "Test", thumbnail: "/x.jpg", unitPrice: 100, quantity: 1 }],
        },
      },
      include: { items: true },
    });
  }
  const paid = () => ({ status: "HAZIRLANIYOR" as const, paidAt: new Date() });

  before(async () => {
    prisma = (await import("@/lib/db")).prisma;
    const [category, color, size] = await Promise.all([
      prisma.category.findFirstOrThrow(),
      prisma.color.findFirstOrThrow(),
      prisma.size.findFirstOrThrow(),
    ]);
    const user = await prisma.user.create({
      data: { email: `${TAG}-${Date.now()}@example.com`, passwordHash: "x", name: "Test" },
    });
    userId = user.id;
    const address = await prisma.address.create({
      data: {
        userId,
        fullName: "Test",
        phone: "5550000000",
        line1: "Test",
        city: "İstanbul",
        district: "Kadıköy",
        postalCode: "34000",
      },
    });
    addressId = address.id;
    await prisma.product.create({
      data: {
        id: PRODUCT_ID,
        title: TAG,
        description: "",
        categoryId: category.id,
        price: 100,
        thumbnail: "/x.jpg",
        variants: { create: [{ colorId: color.id, sizeId: size.id, sku: `${TAG}-${Date.now()}`, stock: 1 }] },
      },
    });
    variantId = (await prisma.productVariant.findFirstOrThrow({ where: { productId: PRODUCT_ID } })).id;
  });

  after(async () => {
    if (!prisma) return;
    if (userId) {
      await prisma.order.deleteMany({ where: { userId } });
      await prisma.address.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.stockMovement.deleteMany({ where: { productId: PRODUCT_ID } });
    await prisma.product.deleteMany({ where: { id: PRODUCT_ID } });
    await prisma.$disconnect();
  });

  it("lets only one of two simultaneous buyers reserve the last unit", async () => {
    await setVariantStock(1);
    const [a, b] = await Promise.all([newOrder(), newOrder()]);

    const results = await Promise.allSettled(
      [a, b].map((order) => prisma.$transaction((tx) => reserveStock(tx, order, order.items)))
    );

    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    assert.ok(rejected.reason instanceof InsufficientStockError);
    // Never negative, and the product total follows (trigger).
    assert.deepEqual(await stocks(), { variant: 0, product: 0 });
  });

  it("gives a reservation back exactly once, however many callers race", async () => {
    await setVariantStock(1);
    const order = await newOrder();
    await prisma.$transaction((tx) => reserveStock(tx, order, order.items));
    assert.equal((await stocks()).variant, 0);

    const results = await Promise.all(
      [1, 2, 3].map(() => prisma.$transaction((tx) => releaseReservation(tx, order, "Test")))
    );

    assert.equal(results.filter(Boolean).length, 1);
    assert.deepEqual(await stocks(), { variant: 1, product: 1 });
  });

  it("turns a held reservation into the sale without touching stock again", async () => {
    await setVariantStock(2);
    const order = await newOrder();
    await prisma.$transaction((tx) => reserveStock(tx, order, order.items));

    await prisma.$transaction((tx) => markOrderPaid(tx, order, paid()));

    assert.equal((await stocks()).variant, 1);
    const movements = await prisma.stockMovement.findMany({ where: { orderId: order.id } });
    assert.deepEqual(
      movements.map((m) => [m.type, m.quantity]),
      [["SALE", -1]]
    );
  });

  it("releases expired holds, then refuses a late payment if someone else bought the unit", async () => {
    await setVariantStock(1);
    const late = await newOrder({ reservedUntil: new Date(Date.now() - 1000) });
    await prisma.$transaction((tx) => reserveStock(tx, late, late.items));
    assert.equal((await stocks()).variant, 0);

    assert.ok((await releaseExpiredReservations(prisma)) >= 1);
    assert.equal((await stocks()).variant, 1);

    // Another buyer takes the freed unit…
    const other = await newOrder();
    await prisma.$transaction((tx) => reserveStock(tx, other, other.items));

    // …so the late payment can't be fulfilled and the order stays unpaid.
    await assert.rejects(
      prisma.$transaction((tx) => markOrderPaid(tx, late, paid())),
      InsufficientStockError
    );
    const reloaded = await prisma.order.findUniqueOrThrow({ where: { id: late.id } });
    assert.equal(reloaded.paidAt, null);
    assert.equal((await stocks()).variant, 0);
  });

  it("takes stock again for a late payment when it is still available", async () => {
    await setVariantStock(1);
    const late = await newOrder({ reservedUntil: new Date(Date.now() - 1000) });
    await prisma.$transaction((tx) => reserveStock(tx, late, late.items));
    await releaseExpiredReservations(prisma);

    await prisma.$transaction((tx) => markOrderPaid(tx, late, paid()));

    assert.equal((await stocks()).variant, 0);
  });

  it("refuses to mark a cancelled order paid", async () => {
    await setVariantStock(1);
    const order = await newOrder({ status: "IPTAL" });
    await assert.rejects(
      prisma.$transaction((tx) => markOrderPaid(tx, order, paid())),
      OrderNotPayableError
    );
    assert.equal((await stocks()).variant, 1);
  });
});
