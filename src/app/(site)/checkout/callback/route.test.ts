/**
 * @jest-environment node
 */
// Covers the callback's decisions — sell, give the reservation back, or
// refund. The stock mechanics themselves (atomic take, release-once,
// expiry) live in src/lib/stock-reservation.ts and are tested against a
// real database in stock-reservation.db.test.ts.
const findUnique = jest.fn();
const productFindMany = jest.fn();
const couponUpdate = jest.fn();
const orderEventCreate = jest.fn();

const tx = {
  coupon: { update: (...args: unknown[]) => couponUpdate(...args) },
  orderEvent: { create: (...args: unknown[]) => orderEventCreate(...args) },
};
const transaction = jest.fn((cb: (t: typeof tx) => unknown) => Promise.resolve().then(() => cb(tx)));

jest.mock("../../../../lib/db", () => ({
  prisma: {
    order: { findUnique: (...args: unknown[]) => findUnique(...args) },
    product: { findMany: (...args: unknown[]) => productFindMany(...args) },
    $transaction: (cb: (t: typeof tx) => unknown) => transaction(cb),
  },
}));

const markOrderPaid = jest.fn();
const releaseReservation = jest.fn();
jest.mock("../../../../lib/stock-reservation", () => {
  const actual = jest.requireActual("../../../../lib/stock-reservation");
  return {
    ...actual,
    markOrderPaid: (...args: unknown[]) => markOrderPaid(...args),
    releaseReservation: (...args: unknown[]) => releaseReservation(...args),
  };
});

const refundUnfulfillablePayment = jest.fn();
jest.mock("../../../../lib/orders", () => ({
  refundUnfulfillablePayment: (...args: unknown[]) => refundUnfulfillablePayment(...args),
}));

const retrieveCheckoutForm = jest.fn();
const verifyResponseSignature = jest.fn();
// Email content and delivery have their own tests; here only the call matters.
jest.mock("../../../../lib/email/outbox", () => ({
  queueOrderEmail: jest.fn().mockResolvedValue(true),
  deliverSoon: jest.fn(),
}));
jest.mock("../../../../lib/iyzico", () => ({
  retrieveCheckoutForm: (...args: unknown[]) => retrieveCheckoutForm(...args),
  verifyResponseSignature: (...args: unknown[]) => verifyResponseSignature(...args),
}));

// `after()` needs Next's real request-scoped AsyncLocalStorage context,
// which only exists inside an actual served request — not when a route
// handler is invoked directly like this. Run its callback immediately
// instead; automation dispatch itself no-ops in tests since
// N8N_AUTOMATION_ENABLED isn't set.
jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: (fn: () => unknown) => fn(),
}));

import { NextRequest } from "next/server";
import { InsufficientStockError, OrderNotPayableError } from "../../../../lib/stock-reservation";
import { POST } from "./route";

function makeRequest(token?: string) {
  const formData = new FormData();
  if (token) formData.set("token", token);
  return new NextRequest("http://localhost:3000/checkout/callback", {
    method: "POST",
    body: formData,
  });
}

const baseOrder = {
  id: "order_1",
  orderNumber: "BS-20260910-ABC123",
  iyzicoConversationId: "order_1",
  iyzicoPaymentId: null,
  total: 38.84,
  createdAt: new Date("2026-09-18T11:30:00.000Z"),
  paidAt: null,
  refundedAt: null,
  couponId: null,
  user: { id: "user_1", name: "Demo User", email: "demo@example.com" },
  items: [{ productId: 1, variantId: null, sku: null, title: "Rose Serum", unitPrice: 19.42, quantity: 2 }],
};

const verifiedSuccess = {
  status: "success",
  paymentStatus: "SUCCESS",
  paymentId: "pay_1",
  paidPrice: "38.84",
  price: "38.84",
  currency: "TRY",
  basketId: "order_1",
  conversationId: "order_1",
  token: "tok_x",
  signature: "sig",
  itemTransactions: [{ itemId: "1", paymentTransactionId: "txn_1", price: "38.84" }],
};

function location(res: Response) {
  return res.headers.get("location") ?? "";
}

beforeEach(() => {
  jest.clearAllMocks();
  findUnique.mockResolvedValue(baseOrder);
  productFindMany.mockResolvedValue([{ id: 1, stock: 500, title: "Rose Serum", lowStockThreshold: 10 }]);
  markOrderPaid.mockResolvedValue(undefined);
  releaseReservation.mockResolvedValue(true);
  refundUnfulfillablePayment.mockResolvedValue({ refunded: true });
  retrieveCheckoutForm.mockResolvedValue(verifiedSuccess);
  verifyResponseSignature.mockReturnValue(true);
});

describe("POST /checkout/callback", () => {
  it("redirects to the failed page when no token is posted", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(303);
    expect(location(res)).toContain("/checkout/failed");
  });

  it("redirects to the failed page when the token matches no order", async () => {
    findUnique.mockResolvedValue(null);
    expect(location(await POST(makeRequest("tok_x")))).toContain("/checkout/failed");
  });

  it("turns the reservation into a paid order on a verified success", async () => {
    const res = await POST(makeRequest("tok_x"));

    expect(markOrderPaid).toHaveBeenCalledWith(
      tx,
      baseOrder,
      expect.objectContaining({
        status: "HAZIRLANIYOR",
        paidAt: expect.any(Date),
        iyzicoPaymentId: "pay_1",
        iyzicoItemTransactions: [{ itemId: "1", paymentTransactionId: "txn_1", price: "38.84" }],
      })
    );
    expect(releaseReservation).not.toHaveBeenCalled();
    expect(refundUnfulfillablePayment).not.toHaveBeenCalled();
    expect(couponUpdate).not.toHaveBeenCalled();
    expect(location(res)).toContain("/checkout/confirmation/BS-20260910-ABC123");
  });

  it("increments the coupon's usedCount when the order used one", async () => {
    findUnique.mockResolvedValue({ ...baseOrder, couponId: "coupon_1" });
    await POST(makeRequest("tok_x"));
    expect(couponUpdate).toHaveBeenCalledWith({
      where: { id: "coupon_1" },
      data: { usedCount: { increment: 1 } },
    });
  });

  it("redirects without side effects when the order is already paid", async () => {
    findUnique.mockResolvedValue({ ...baseOrder, paidAt: new Date() });
    const res = await POST(makeRequest("tok_x"));
    expect(retrieveCheckoutForm).not.toHaveBeenCalled();
    expect(markOrderPaid).not.toHaveBeenCalled();
    expect(location(res)).toContain("/checkout/confirmation/BS-20260910-ABC123");
  });

  it("never refunds twice when the callback is posted again", async () => {
    findUnique.mockResolvedValue({ ...baseOrder, refundedAt: new Date(), iyzicoPaymentId: "pay_1" });
    const res = await POST(makeRequest("tok_x"));
    expect(retrieveCheckoutForm).not.toHaveBeenCalled();
    expect(refundUnfulfillablePayment).not.toHaveBeenCalled();
    expect(location(res)).toContain("refund=done");

    findUnique.mockResolvedValue({ ...baseOrder, iyzicoPaymentId: "pay_1" });
    expect(location(await POST(makeRequest("tok_x")))).toContain("refund=manual");
    expect(refundUnfulfillablePayment).not.toHaveBeenCalled();
  });

  it.each([
    ["the signature is invalid", () => verifyResponseSignature.mockReturnValue(false)],
    ["the confirmed amount does not match", () => retrieveCheckoutForm.mockResolvedValue({ ...verifiedSuccess, paidPrice: "1.00" })],
    ["iyzico could not be reached", () => retrieveCheckoutForm.mockRejectedValue(new Error("timeout"))],
  ])("keeps the reservation (unverified result) when %s", async (_label, arrange) => {
    arrange();
    const res = await POST(makeRequest("tok_x"));
    expect(markOrderPaid).not.toHaveBeenCalled();
    // We can't tell whether money moved — the expiry sweep releases it later.
    expect(releaseReservation).not.toHaveBeenCalled();
    expect(location(res)).toContain("/checkout/failed");
  });

  it("gives the reservation back at once when iyzico confirms the payment failed", async () => {
    retrieveCheckoutForm.mockResolvedValue({ ...verifiedSuccess, paymentStatus: "FAILURE" });
    const res = await POST(makeRequest("tok_x"));
    expect(markOrderPaid).not.toHaveBeenCalled();
    expect(releaseReservation).toHaveBeenCalledWith(tx, baseOrder, "Ödeme başarısız");
    expect(location(res)).toContain("/checkout/failed");
    expect(location(res)).not.toContain("refund=");
  });

  it("refunds automatically when the stock sold out after the reservation lapsed", async () => {
    markOrderPaid.mockRejectedValue(new InsufficientStockError({ productId: 1, quantity: 2 }));
    findUnique.mockResolvedValue({ ...baseOrder, couponId: "coupon_1" });

    const res = await POST(makeRequest("tok_x"));

    expect(refundUnfulfillablePayment).toHaveBeenCalledWith(
      expect.objectContaining({ id: "order_1" }),
      { paymentId: "pay_1", itemTransactions: verifiedSuccess.itemTransactions },
      expect.stringContaining("tükendi"),
      { ip: "127.0.0.1" }
    );
    // The paid transaction rolled back: no coupon use is counted.
    expect(couponUpdate).not.toHaveBeenCalled();
    expect(location(res)).toContain("refund=done");
  });

  it("refunds a payment for an order that was cancelled mid-payment", async () => {
    markOrderPaid.mockRejectedValue(new OrderNotPayableError());
    await POST(makeRequest("tok_x"));
    expect(refundUnfulfillablePayment).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.stringContaining("iptal"),
      expect.anything()
    );
  });

  it("tells the buyer a manual refund is coming when iyzico refuses the refund", async () => {
    markOrderPaid.mockRejectedValue(new InsufficientStockError({ productId: 1, quantity: 2 }));
    refundUnfulfillablePayment.mockResolvedValue({ refunded: false });
    expect(location(await POST(makeRequest("tok_x")))).toContain("refund=manual");
  });

  it("checks plain (non-variant) products for low stock after the sale", async () => {
    productFindMany.mockResolvedValue([{ id: 1, stock: 3, title: "Rose Serum", lowStockThreshold: 10 }]);
    const res = await POST(makeRequest("tok_x"));
    expect(productFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [1] } } }));
    expect(location(res)).toContain("/checkout/confirmation/");

    productFindMany.mockClear();
    findUnique.mockResolvedValue({ ...baseOrder, items: [{ ...baseOrder.items[0], variantId: "v1" }] });
    await POST(makeRequest("tok_x"));
    expect(productFindMany).not.toHaveBeenCalled();
  });
});
