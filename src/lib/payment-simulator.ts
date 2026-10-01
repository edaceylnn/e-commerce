import crypto from "crypto";
import { prisma } from "@/lib/db";
import { allocate, toKurus, toLira } from "@/lib/invoicing/tax";

// The built-in payment simulator: when no iyzico keys are set (the public
// demo), src/lib/iyzico.ts sends its requests here instead of to iyzico.
// It speaks iyzico's checkout form API — initialize, retrieve, refund — and
// signs its answers like iyzico does, so checkout, the payment callback
// (signature and amount checks included) and refunds run exactly the same
// code as with the real thing. Nothing is charged: the buyer picks
// "succeed" or "fail" on /odeme-simulatoru/<token>.

// Must match the secret src/lib/iyzico.ts verifies simulator answers with.
export const SIMULATOR_SECRET = "edacey-payment-simulator";

const INITIALIZE = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
const RETRIEVE = "/payment/iyzipos/checkoutform/auth/ecom/detail";
const REFUND = "/payment/refund";

type BasketItem = { id: string; name: string; price: string };

// Same formula as iyzico (see verifyResponseSignature in iyzico.ts).
function sign(fields: (string | undefined)[]) {
  return crypto.createHmac("sha256", SIMULATOR_SECRET).update(fields.map((f) => f ?? "").join(":")).digest("hex");
}

// Like iyzico, the paid total (after discounts, with shipping) is spread
// over the basket items by their price — that is what each item's
// transaction was charged, and the most it can be refunded.
function itemTransactions(p: { paymentId: string; paidPrice: unknown; basketItems: unknown }) {
  const items = p.basketItems as BasketItem[];
  const shares = allocate(toKurus(Number(p.paidPrice)), items.map((i) => toKurus(Number(i.price))));
  return items.map((item, i) => ({
    itemId: item.id,
    paymentTransactionId: `${p.paymentId}-${i}`,
    price: item.price,
    paidPrice: toLira(shares[i]).toFixed(2),
  }));
}

export async function simulateIyzico(path: string, body: Record<string, unknown>): Promise<unknown> {
  if (path === INITIALIZE) {
    const token = crypto.randomUUID();
    const conversationId = String(body.conversationId);
    await prisma.simulatedPayment.create({
      data: {
        token,
        paymentId: `SIM${Date.now()}${crypto.randomInt(1000, 9999)}`,
        conversationId,
        basketId: String(body.basketId),
        price: Number(body.price),
        paidPrice: Number(body.paidPrice),
        basketItems: ((body.basketItems as BasketItem[]) ?? []).map(({ id, name, price }) => ({ id, name, price })),
        callbackUrl: String(body.callbackUrl),
      },
    });
    return {
      status: "success",
      conversationId,
      token,
      paymentPageUrl: `/odeme-simulatoru/${token}`,
      signature: sign([conversationId, token]),
    };
  }

  if (path === RETRIEVE) {
    const payment = await prisma.simulatedPayment.findUnique({ where: { token: String(body.token) } });
    if (!payment?.outcome) return { status: "failure", errorCode: "SIM404", errorMessage: "Ödeme bulunamadı ya da tamamlanmadı." };
    const answer = {
      status: "success",
      paymentStatus: payment.outcome,
      paymentId: payment.paymentId,
      token: payment.token,
      price: Number(payment.price).toFixed(2),
      paidPrice: Number(payment.paidPrice).toFixed(2),
      currency: "TRY",
      basketId: payment.basketId,
      conversationId: payment.conversationId,
      itemTransactions: payment.outcome === "SUCCESS" ? itemTransactions(payment) : [],
    };
    return {
      ...answer,
      signature: sign([
        answer.paymentStatus,
        answer.paymentId,
        answer.currency,
        answer.basketId,
        answer.conversationId,
        answer.paidPrice,
        answer.price,
        answer.token,
      ]),
    };
  }

  if (path === REFUND) {
    // Refused like iyzico would: an unknown transaction, or more than was
    // charged for it in total.
    const transactionId = String(body.paymentTransactionId);
    const amount = toKurus(Number(body.price));
    return prisma.$transaction(async (tx) => {
      const paymentId = transactionId.replace(/-\d+$/, "");
      await tx.$queryRaw`SELECT "token" FROM "SimulatedPayment" WHERE "paymentId" = ${paymentId} FOR UPDATE`;
      const payment = await tx.simulatedPayment.findUnique({ where: { paymentId } });
      const transaction = payment?.outcome === "SUCCESS" ? itemTransactions(payment).find((t) => t.paymentTransactionId === transactionId) : undefined;
      if (!payment || !transaction) return { status: "failure", errorCode: "SIM404", errorMessage: "İşlem bulunamadı." };
      const refunds = payment.refunds as Record<string, number>;
      const refunded = refunds[transactionId] ?? 0;
      if (amount <= 0 || refunded + amount > toKurus(Number(transaction.paidPrice))) {
        return { status: "failure", errorCode: "SIM400", errorMessage: "İade tutarı, işlemde çekilen tutarı aşıyor." };
      }
      await tx.simulatedPayment.update({
        where: { paymentId },
        data: { refunds: { ...refunds, [transactionId]: refunded + amount } },
      });
      return { status: "success", paymentId, paymentTransactionId: transactionId, price: toLira(amount).toFixed(2), currency: "TRY" };
    });
  }

  throw new Error(`Ödeme simülatörü bu isteği tanımıyor: ${path}`);
}

// The buyer's choice on the simulated payment page. Once only.
export async function completeSimulatedPayment(token: string, outcome: "SUCCESS" | "FAILURE") {
  const { count } = await prisma.simulatedPayment.updateMany({
    where: { token, outcome: null },
    data: { outcome, completedAt: new Date() },
  });
  return count === 1;
}
