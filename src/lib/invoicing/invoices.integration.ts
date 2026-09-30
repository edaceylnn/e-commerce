// Real-database tests for invoicing: gapless numbering under concurrency,
// the immutability triggers, and sale/return/cancel against real orders.
// Run with `npm run test:db`. Uses its own series ("TST") so the real
// invoice numbers never get gaps; cleanup lifts the delete trigger only
// inside its own transaction.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
process.env.INVOICE_SERIES = "TST";

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@/generated/prisma/client";

type Invoices = typeof import("./invoices");
type Numbering = typeof import("./numbering");

const PRODUCT_ID = 993_001;
const TAG = "invoice-db-test";

describe("invoicing (real database)", () => {
  let prisma: PrismaClient;
  let inv: Invoices;
  let numbering: Numbering;
  let userId: string;
  let addressId: string;
  let seq = 0;

  // A paid order: two lines (20% and 10% VAT) with a coupon split
  // 129,00 / 69,00, plus 29,90 shipping — the design's example.
  async function paidOrder(status: "HAZIRLANIYOR" | "PENDING_PAYMENT" | "IPTAL" = "HAZIRLANIYOR") {
    return prisma.order.create({
      data: {
        orderNumber: `${TAG}-${Date.now()}-${seq++}`,
        userId,
        shippingAddressId: addressId,
        billingAddressId: addressId,
        status,
        paidAt: status === "PENDING_PAYMENT" ? null : new Date(),
        subtotal: 1980,
        discountTotal: 198,
        shippingCost: 29.9,
        total: 1811.9,
        items: {
          create: [
            { productId: PRODUCT_ID, title: "Tayt", thumbnail: "/x.jpg", unitPrice: 1290, quantity: 1, taxRate: 20, discountAmount: 129 },
            { productId: PRODUCT_ID, title: "Sütyen", thumbnail: "/x.jpg", unitPrice: 690, quantity: 1, taxRate: 10, discountAmount: 69 },
          ],
        },
      },
      include: { items: true },
    });
  }
  const issue = (orderId: string) => prisma.$transaction((tx) => inv.issueSaleInvoice(tx, orderId));

  before(async () => {
    prisma = (await import("@/lib/db")).prisma;
    inv = await import("./invoices");
    numbering = await import("./numbering");
    const category = await prisma.category.findFirstOrThrow();
    await prisma.product.upsert({
      where: { id: PRODUCT_ID },
      create: { id: PRODUCT_ID, title: TAG, description: "", categoryId: category.id, price: 1, thumbnail: "/x.jpg" },
      update: {},
    });
    const user = await prisma.user.create({ data: { email: `${TAG}-${Date.now()}@example.com`, passwordHash: "x", name: "Test" } });
    userId = user.id;
    addressId = (
      await prisma.address.create({
        data: { userId, fullName: "Ayşe Yılmaz", phone: "5550000000", line1: "Test Sk. 1", city: "İzmir", district: "Konak", postalCode: "35000" },
      })
    ).id;
  });

  after(async () => {
    if (!prisma) return;
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`ALTER TABLE "InvoiceLine" DISABLE TRIGGER invoice_line_immutable`);
      await tx.$executeRawUnsafe(`ALTER TABLE "Invoice" DISABLE TRIGGER invoice_immutable`);
      const orders = await tx.order.findMany({ where: { userId }, select: { id: true } });
      const ids = orders.map((o) => o.id);
      await tx.invoiceLine.deleteMany({ where: { invoice: { orderId: { in: ids } } } });
      await tx.invoice.updateMany({ where: { orderId: { in: ids } }, data: { originalInvoiceId: null } });
      await tx.invoice.deleteMany({ where: { orderId: { in: ids } } });
      await tx.$executeRawUnsafe(`ALTER TABLE "Invoice" ENABLE TRIGGER invoice_immutable`);
      await tx.$executeRawUnsafe(`ALTER TABLE "InvoiceLine" ENABLE TRIGGER invoice_line_immutable`);
      await tx.order.deleteMany({ where: { userId } });
      await tx.address.deleteMany({ where: { userId } });
      await tx.user.deleteMany({ where: { id: userId } });
      await tx.product.deleteMany({ where: { id: PRODUCT_ID } });
      await tx.invoiceSequence.deleteMany({ where: { series: { startsWith: "TST" } } });
    });
    await prisma.$disconnect();
  });

  it("issues a sale invoice that adds up to exactly what was paid", async () => {
    const order = await paidOrder();
    const { invoice, created } = await issue(order.id);
    assert.equal(created, true);
    assert.match(invoice.number, /^TST\d{4}\d{9}$/);
    assert.match(invoice.ettn, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const lines = await prisma.invoiceLine.findMany({ where: { invoiceId: invoice.id }, orderBy: { position: "asc" } });
    assert.deepEqual(
      lines.map((l) => [l.description, Number(l.gross), Number(l.net), Number(l.vat), Number(l.vatRate)]),
      [
        ["Tayt", 1161, 967.5, 193.5, 20],
        ["Sütyen", 621, 564.55, 56.45, 10],
        ["Kargo bedeli", 29.9, 24.92, 4.98, 20],
      ]
    );
    assert.equal(Number(invoice.grandTotal), 1811.9);
    assert.equal(Number(invoice.netTotal) + Number(invoice.vatTotal), 1811.9);
    assert.equal(invoice.buyerName, "Ayşe Yılmaz");
  });

  it("issues once, however often it's asked", async () => {
    const order = await paidOrder();
    const [a, b] = await Promise.all([issue(order.id), issue(order.id)]);
    assert.equal(a.invoice.id, b.invoice.id);
    assert.equal(await prisma.invoice.count({ where: { orderId: order.id } }), 1);
  });

  it("refuses unpaid and cancelled orders, and totals that don't match the charge", async () => {
    for (const status of ["PENDING_PAYMENT", "IPTAL"] as const) {
      const order = await paidOrder(status);
      await assert.rejects(issue(order.id), inv.InvoiceError);
    }
    const tampered = await paidOrder();
    await prisma.order.update({ where: { id: tampered.id }, data: { total: 1811.91 } });
    await assert.rejects(issue(tampered.id), /uyuşmuyor/);
  });

  it("numbers concurrent invoices uniquely and without gaps", async () => {
    const orders = await Promise.all([1, 2, 3, 4, 5].map(() => paidOrder()));
    const results = await Promise.all(orders.map((o) => issue(o.id)));
    const numbers = results.map((r) => Number(r.invoice.number.slice(-9))).sort((a, b) => a - b);
    assert.equal(new Set(numbers).size, 5);
    assert.equal(numbers[4] - numbers[0], 4);
  });

  it("gives a rolled-back invoice's number to the next one", async () => {
    const before_ = await prisma.$transaction((tx) => numbering.nextInvoiceNumber(tx, new Date()));
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await numbering.nextInvoiceNumber(tx, new Date());
        throw new Error("provider down");
      }),
      /provider down/
    );
    const after_ = await prisma.$transaction((tx) => numbering.nextInvoiceNumber(tx, new Date()));
    assert.equal(Number(after_.slice(-9)), Number(before_.slice(-9)) + 1);
  });

  it("refuses to change or delete an issued invoice, at the database level", async () => {
    const order = await paidOrder();
    const { invoice } = await issue(order.id);
    await assert.rejects(prisma.invoice.update({ where: { id: invoice.id }, data: { grandTotal: 1 } }), /cannot be changed/);
    await assert.rejects(prisma.invoice.update({ where: { id: invoice.id }, data: { ettn: crypto.randomUUID() } }), /cannot be changed/);
    await assert.rejects(prisma.invoice.delete({ where: { id: invoice.id } }), /cannot be deleted/);
    await assert.rejects(prisma.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } }), /cannot be changed or deleted/);
    await assert.rejects(prisma.order.delete({ where: { id: order.id } }));
    // Cancelling is the one allowed change — and it's final.
    await prisma.$transaction((tx) => inv.cancelInvoice(tx, invoice.id, "Test"));
    await assert.rejects(prisma.invoice.update({ where: { id: invoice.id }, data: { status: "ISSUED" } }), /reinstated/);
  });

  it("returns lines once, shipping only with a full refund, and blocks cancelling a returned sale", async () => {
    const order = await paidOrder();
    const { invoice: sale } = await issue(order.id);
    const [tayt] = order.items;

    const partial = await prisma.$transaction((tx) =>
      inv.issueReturnInvoice(tx, order.id, { orderItemIds: [tayt.id], includeShipping: false })
    );
    assert.ok(partial);
    assert.equal(Number(partial.grandTotal), 1161);
    assert.equal(partial.originalInvoiceId, sale.id);

    // The same line again: nothing left to return.
    const again = await prisma.$transaction((tx) =>
      inv.issueReturnInvoice(tx, order.id, { orderItemIds: [tayt.id], includeShipping: false })
    );
    assert.equal(again, null);

    const rest = await prisma.$transaction((tx) =>
      inv.issueReturnInvoice(tx, order.id, { orderItemIds: "all", includeShipping: true })
    );
    assert.equal(Number(rest!.grandTotal), 621 + 29.9);

    await assert.rejects(prisma.$transaction((tx) => inv.cancelInvoice(tx, sale.id, "Test")), /iade faturası var/);
  });
});
