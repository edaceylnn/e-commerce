// Real-database tests for the email outbox and password reset: one email
// per notification however often it's triggered, one delivery at a time,
// retries after a provider failure, and reset links that work once, expire,
// and don't stay readable in the outbox. Run with `npm run test:db`.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
delete process.env.DEMO_MODE;
delete process.env.SMTP_HOST;

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@/generated/prisma/client";

type Outbox = typeof import("./outbox");
type Reset = typeof import("../password-reset");

const PRODUCT_ID = 993_101;
const TAG = "email-db-test";

describe("email outbox and password reset (real database)", () => {
  let prisma: PrismaClient;
  let outbox: Outbox;
  let reset: Reset;
  let userId: string;
  let email: string;
  let orderId: string;

  before(async () => {
    prisma = (await import("@/lib/db")).prisma;
    outbox = await import("./outbox");
    reset = await import("../password-reset");
    const category = await prisma.category.findFirstOrThrow();
    await prisma.product.upsert({
      where: { id: PRODUCT_ID },
      create: { id: PRODUCT_ID, title: TAG, description: "", categoryId: category.id, price: 1, thumbnail: "/x.jpg" },
      update: {},
    });
    email = `${TAG}-${Date.now()}@example.com`;
    const user = await prisma.user.create({ data: { email, passwordHash: "x", name: "Ayşe Yılmaz" } });
    userId = user.id;
    const address = await prisma.address.create({
      data: { userId, fullName: "Ayşe Yılmaz", phone: "5550000000", line1: "Test Sk. 1", city: "İzmir", district: "Konak", postalCode: "35000" },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-${Date.now()}`,
        userId,
        shippingAddressId: address.id,
        billingAddressId: address.id,
        status: "HAZIRLANIYOR",
        paidAt: new Date(),
        subtotal: 690,
        shippingCost: 29.9,
        total: 719.9,
        items: { create: [{ productId: PRODUCT_ID, title: "Spor Sütyen", thumbnail: "/x.jpg", unitPrice: 690, quantity: 1 }] },
      },
    });
    orderId = order.id;
  });

  after(async () => {
    if (!prisma) return;
    await prisma.emailMessage.deleteMany({ where: { to: email } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.address.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.product.deleteMany({ where: { id: PRODUCT_ID } });
    await prisma.$disconnect();
  });

  it("queues one email per notification, however often it's triggered", async () => {
    const queue = () => prisma.$transaction((tx) => outbox.queueOrderEmail(tx, "order-confirmed", orderId));
    assert.equal(await queue(), true);
    assert.equal(await queue(), false);
    const rows = await prisma.emailMessage.findMany({ where: { orderId, template: "order-confirmed" } });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].to, email);
    assert.match(rows[0].subject, /Siparişin alındı/);
  });

  it("an email rolled back with its transaction was never owed", async () => {
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await outbox.queueOrderEmail(tx, "order-cancelled", orderId);
        throw new Error("cancel failed");
      }),
      /cancel failed/
    );
    assert.equal(await prisma.emailMessage.count({ where: { orderId, template: "order-cancelled" } }), 0);
  });

  it("delivers each email once, even when two deliveries race", async () => {
    const row = await prisma.emailMessage.findFirstOrThrow({ where: { orderId, template: "order-confirmed" } });
    await Promise.all([outbox.deliverEmail(row.id), outbox.deliverEmail(row.id)]);
    const done = await prisma.emailMessage.findUniqueOrThrow({ where: { id: row.id } });
    assert.equal(done.attempts, 1);
    // No SMTP configured here: recorded, deliberately not sent.
    assert.equal(done.status, "SKIPPED");
    assert.match(done.lastError ?? "", /SMTP_HOST/);
  });

  it("keeps a failed email and retries it", async () => {
    process.env.SMTP_HOST = "127.0.0.1";
    process.env.SMTP_PORT = "1"; // nothing listens: connection refused
    try {
      await prisma.$transaction((tx) => outbox.queueOrderEmail(tx, "order-delivered", orderId));
      const row = await prisma.emailMessage.findFirstOrThrow({ where: { orderId, template: "order-delivered" } });
      await outbox.deliverEmail(row.id);
      let failed = await prisma.emailMessage.findUniqueOrThrow({ where: { id: row.id } });
      assert.equal(failed.status, "FAILED");
      assert.equal(failed.attempts, 1);
      assert.ok(failed.lastError);
      await outbox.deliverPending();
      failed = await prisma.emailMessage.findUniqueOrThrow({ where: { id: row.id } });
      assert.equal(failed.attempts, 2);
    } finally {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
    }
  });

  it("resets a password with a link that works once", async () => {
    await reset.requestPasswordReset(email);
    const message = await prisma.emailMessage.findFirstOrThrow({ where: { to: email, template: "password-reset" } });
    const token = /sifre-sifirla\?token=([A-Za-z0-9_-]+)/.exec(message.html)?.[1];
    assert.ok(token);
    // Only the hash is stored.
    assert.equal(await prisma.passwordResetToken.count({ where: { tokenHash: token } }), 0);
    assert.equal(await prisma.passwordResetToken.count({ where: { tokenHash: reset.hashResetToken(token) } }), 1);

    const [a, b] = await Promise.all([reset.resetPassword(token, "YeniSifre1"), reset.resetPassword(token, "Baska1234")]);
    assert.equal([a, b].filter((r) => r.ok).length, 1);
    const { verifyPassword } = await import("../password");
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    assert.ok((await verifyPassword("YeniSifre1", user.passwordHash)) || (await verifyPassword("Baska1234", user.passwordHash)));

    // Once handed off, the link is no longer readable in the outbox.
    await outbox.deliverEmail(message.id);
    const sent = await prisma.emailMessage.findUniqueOrThrow({ where: { id: message.id } });
    assert.ok(!sent.html.includes(token) && !sent.text.includes(token));
    assert.match(sent.html, /\[gizlendi\]/);
  });

  it("refuses expired links and limits requests", async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    const tokenHash = reset.hashResetToken("expired-token-expired-token");
    await prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await reset.resetPassword("expired-token-expired-token", "YeniSifre1")).ok, false);

    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    for (let i = 0; i < 5; i++) await reset.requestPasswordReset(email);
    assert.equal(await prisma.passwordResetToken.count({ where: { userId } }), 3);

    // Unknown address: nothing happens, and nothing tells the caller so.
    await reset.requestPasswordReset(`nobody-${Date.now()}@example.com`);
  });
});
