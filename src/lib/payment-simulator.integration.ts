// Real-database tests for the payment simulator: it must look like iyzico
// to the store — answers that pass our own signature check, the paid total
// spread over the items to the kuruş, and refunds refused like iyzico
// refuses them (too much, or twice). Run with `npm run test:db`.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
delete process.env.IYZICO_API_KEY;
delete process.env.IYZICO_SECRET_KEY;

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@/generated/prisma/client";

type Iyzico = typeof import("./iyzico");
type Simulator = typeof import("./payment-simulator");

describe("payment simulator (real database)", () => {
  let prisma: PrismaClient;
  let iyzico: Iyzico;
  let sim: Simulator;
  const tokens: string[] = [];

  before(async () => {
    prisma = (await import("@/lib/db")).prisma;
    iyzico = await import("./iyzico");
    sim = await import("./payment-simulator");
  });

  after(async () => {
    if (!prisma) return;
    await prisma.simulatedPayment.deleteMany({ where: { token: { in: tokens } } });
    await prisma.$disconnect();
  });

  // A 2,380 TL basket paid 2,171.90 (10% coupon, 29.90 shipping).
  const start = async () => {
    const init = await iyzico.initializeCheckoutForm({
      conversationId: "order-sim-test",
      price: "2380.00",
      paidPrice: "2171.90",
      currency: "TRY",
      basketId: "order-sim-test",
      paymentGroup: "PRODUCT",
      callbackUrl: "http://localhost:3000/checkout/callback",
      buyer: {} as never,
      shippingAddress: {} as never,
      billingAddress: {} as never,
      basketItems: [
        { id: "4", price: "1690.00", name: "Tayt", category1: "Giyim", itemType: "PHYSICAL" },
        { id: "7", price: "690.00", name: "Sütyen", category1: "Giyim", itemType: "PHYSICAL" },
      ],
    });
    tokens.push(init.token!);
    return init;
  };

  it("starts a payment like iyzico, with a signature the store accepts", async () => {
    assert.equal(iyzico.isPaymentSimulated(), true);
    const init = await start();
    assert.equal(init.status, "success");
    assert.equal(init.paymentPageUrl, `/odeme-simulatoru/${init.token}`);
    assert.ok(iyzico.verifyResponseSignature([init.conversationId, init.token], init.signature));
  });

  it("reports the buyer's choice, signed, with the paid total spread over the items", async () => {
    const init = await start();
    const pending = await iyzico.retrieveCheckoutForm({ token: init.token! });
    assert.equal(pending.status, "failure"); // nothing chosen yet

    assert.equal(await sim.completeSimulatedPayment(init.token!, "SUCCESS"), true);
    assert.equal(await sim.completeSimulatedPayment(init.token!, "FAILURE"), false); // once only

    const r = await iyzico.retrieveCheckoutForm({ token: init.token! });
    assert.equal(r.paymentStatus, "SUCCESS");
    assert.ok(
      iyzico.verifyResponseSignature(
        [r.paymentStatus, r.paymentId, r.currency, r.basketId, r.conversationId, r.paidPrice, r.price, r.token],
        r.signature
      )
    );
    const paid = r.itemTransactions!.map((t) => Math.round(Number(t.paidPrice) * 100));
    assert.equal(paid.reduce((a, b) => a + b, 0), 217190);
    assert.deepEqual(paid, [154223, 62967]); // 2,171.90 × 1,690 / 2,380 = 1,542.23
  });

  it("refunds up to what each item was charged, and not twice", async () => {
    const init = await start();
    await sim.completeSimulatedPayment(init.token!, "SUCCESS");
    const [tayt] = (await iyzico.retrieveCheckoutForm({ token: init.token! })).itemTransactions!;
    const refund = (price: string) =>
      iyzico.refundPayment({ paymentTransactionId: tayt.paymentTransactionId, price, currency: "TRY", ip: "127.0.0.1" });

    // The list price is more than was charged for it: refused.
    assert.equal((await refund("1690.00")).status, "failure");
    assert.equal((await refund(tayt.paidPrice!)).status, "success");
    // Already refunded in full: refused.
    const again = await refund("1.00");
    assert.equal(again.status, "failure");
    assert.match(again.errorMessage ?? "", /aşıyor/);
  });

  it("a failed payment has nothing to refund", async () => {
    const init = await start();
    await sim.completeSimulatedPayment(init.token!, "FAILURE");
    const r = await iyzico.retrieveCheckoutForm({ token: init.token! });
    assert.equal(r.paymentStatus, "FAILURE");
    assert.deepEqual(r.itemTransactions, []);
  });
});
