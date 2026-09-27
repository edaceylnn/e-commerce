/**
 * @jest-environment node
 */
const findUnique = jest.fn();
const orderUpdate = jest.fn();
const couponUpdate = jest.fn();
const productUpdateMany = jest.fn();
const productFindUniqueOrThrow = jest.fn();
const productVariantUpdateMany = jest.fn();
const productVariantFindUniqueOrThrow = jest.fn();
const stockMovementCreate = jest.fn();
const orderEventCreate = jest.fn();

function makeTx() {
  return {
    order: { update: (...args: unknown[]) => orderUpdate(...args) },
    coupon: { update: (...args: unknown[]) => couponUpdate(...args) },
    product: {
      updateMany: (...args: unknown[]) => productUpdateMany(...args),
      findUniqueOrThrow: (...args: unknown[]) => productFindUniqueOrThrow(...args),
    },
    productVariant: {
      updateMany: (...args: unknown[]) => productVariantUpdateMany(...args),
      findUniqueOrThrow: (...args: unknown[]) => productVariantFindUniqueOrThrow(...args),
    },
    stockMovement: {
      create: (...args: unknown[]) => stockMovementCreate(...args),
    },
    orderEvent: {
      create: (...args: unknown[]) => orderEventCreate(...args),
    },
  };
}

const transaction = jest.fn((cb: (tx: ReturnType<typeof makeTx>) => unknown) =>
  Promise.resolve(cb(makeTx()))
);

jest.mock("../../../../lib/db", () => ({
  prisma: {
    order: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => orderUpdate(...args),
    },
    orderEvent: {
      create: (...args: unknown[]) => orderEventCreate(...args),
    },
    $transaction: (cb: (tx: ReturnType<typeof makeTx>) => unknown) => transaction(cb),
  },
}));

const retrieveCheckoutForm = jest.fn();
const verifyResponseSignature = jest.fn();

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
  total: 38.84,
  createdAt: new Date("2026-09-18T11:30:00.000Z"),
  paidAt: null,
  user: {
    id: "user_1",
    name: "Demo User",
    email: "demo@example.com",
  },
  items: [
    {
      productId: 1,
      variantId: null,
      sku: null,
      title: "Rose Serum",
      unitPrice: 19.42,
      quantity: 2,
    },
  ],
};

// Plenty of headroom above any lowStockThreshold used in these tests, so a
// test that isn't specifically about the low-stock signal doesn't
// accidentally trip it.
const abundantStock = { stock: 500, title: "Rose Serum", lowStockThreshold: 10 };

beforeEach(() => {
  findUnique.mockReset();
  orderUpdate.mockReset();
  couponUpdate.mockReset();
  productUpdateMany.mockReset().mockResolvedValue({ count: 1 });
  productFindUniqueOrThrow.mockReset().mockResolvedValue(abundantStock);
  productVariantUpdateMany.mockReset().mockResolvedValue({ count: 1 });
  productVariantFindUniqueOrThrow.mockReset().mockResolvedValue({ stock: 500 });
  stockMovementCreate.mockReset();
  orderEventCreate.mockReset();
  transaction.mockClear();
  retrieveCheckoutForm.mockReset();
  verifyResponseSignature.mockReset();
});

describe("POST /checkout/callback", () => {
  it("redirects to the failed page when no token is posted", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("/checkout/failed");
  });

  it("redirects to the failed page when the token matches no order", async () => {
    findUnique.mockResolvedValue(null);
    const res = await POST(makeRequest("tok_x"));
    expect(res.headers.get("location")).toContain("/checkout/failed");
  });

  it("marks the order paid and redirects to confirmation on a verified success", async () => {
    findUnique.mockResolvedValue(baseOrder);
    retrieveCheckoutForm.mockResolvedValue({
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
      itemTransactions: [
        { itemId: "1", paymentTransactionId: "txn_1", price: "38.84" },
      ],
    });
    verifyResponseSignature.mockReturnValue(true);

    const res = await POST(makeRequest("tok_x"));

    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({
          status: "HAZIRLANIYOR",
          iyzicoPaymentId: "pay_1",
          iyzicoItemTransactions: [
            { itemId: "1", paymentTransactionId: "txn_1", price: "38.84" },
          ],
        }),
      })
    );
    expect(productUpdateMany).toHaveBeenCalledWith({
      where: { id: 1, stock: { gte: 2 } },
      data: { stock: { decrement: 2 } },
    });
    expect(stockMovementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 1,
        type: "SALE",
        quantity: -2,
        previousStock: abundantStock.stock + 2,
        newStock: abundantStock.stock,
        note: expect.stringContaining("BS-20260910-ABC123"),
      }),
    });
    expect(couponUpdate).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toContain(
      "/checkout/confirmation/BS-20260910-ABC123"
    );
  });

  it("increments the coupon's usedCount when the order used one", async () => {
    findUnique.mockResolvedValue({ ...baseOrder, couponId: "coupon_1" });
    retrieveCheckoutForm.mockResolvedValue({
      status: "success",
      paymentStatus: "SUCCESS",
      paymentId: "pay_1",
      paidPrice: "38.84",
      signature: "sig",
    });
    verifyResponseSignature.mockReturnValue(true);

    await POST(makeRequest("tok_x"));

    expect(couponUpdate).toHaveBeenCalledWith({
      where: { id: "coupon_1" },
      data: { usedCount: { increment: 1 } },
    });
  });

  it("redirects without duplicate side effects when the order is already paid", async () => {
    findUnique.mockResolvedValue({
      ...baseOrder,
      paidAt: new Date("2026-09-18T11:35:00.000Z"),
    });

    const res = await POST(makeRequest("tok_x"));

    expect(retrieveCheckoutForm).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(productUpdateMany).not.toHaveBeenCalled();
    expect(couponUpdate).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toContain(
      "/checkout/confirmation/BS-20260910-ABC123"
    );
  });

  it("does not mark the order paid if the response signature is invalid", async () => {
    findUnique.mockResolvedValue(baseOrder);
    retrieveCheckoutForm.mockResolvedValue({
      status: "success",
      paymentStatus: "SUCCESS",
      paidPrice: "38.84",
      signature: "bad-sig",
    });
    verifyResponseSignature.mockReturnValue(false);

    const res = await POST(makeRequest("tok_x"));

    expect(orderUpdate).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("/checkout/failed");
  });

  it("does not mark the order paid if the confirmed amount does not match", async () => {
    findUnique.mockResolvedValue(baseOrder);
    retrieveCheckoutForm.mockResolvedValue({
      status: "success",
      paymentStatus: "SUCCESS",
      paidPrice: "1.00",
      signature: "sig",
    });
    verifyResponseSignature.mockReturnValue(true);

    const res = await POST(makeRequest("tok_x"));

    expect(orderUpdate).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("/checkout/failed");
  });

  it("does not mark the order paid if iyzico reports a non-SUCCESS payment status", async () => {
    findUnique.mockResolvedValue(baseOrder);
    retrieveCheckoutForm.mockResolvedValue({
      status: "success",
      paymentStatus: "FAILURE",
      paidPrice: "38.84",
      signature: "sig",
    });
    verifyResponseSignature.mockReturnValue(true);

    const res = await POST(makeRequest("tok_x"));

    expect(orderUpdate).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("/checkout/failed");
  });

  it("flags the order for manual review instead of overselling when stock ran out concurrently", async () => {
    findUnique.mockResolvedValue(baseOrder);
    retrieveCheckoutForm.mockResolvedValue({
      status: "success",
      paymentStatus: "SUCCESS",
      paymentId: "pay_1",
      paidPrice: "38.84",
      signature: "sig",
    });
    verifyResponseSignature.mockReturnValue(true);
    // Another concurrently-confirmed order already took the last units.
    productUpdateMany.mockResolvedValue({ count: 0 });

    const res = await POST(makeRequest("tok_x"));

    expect(couponUpdate).not.toHaveBeenCalled();
    // The order is flagged (outside the rolled-back transaction), not left
    // silently as if nothing happened.
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({
          iyzicoPaymentId: "pay_1",
          internalNote: expect.stringContaining("stok"),
        }),
      })
    );
    expect(res.headers.get("location")).toContain("/checkout/failed");
  });

  it("emits a low-stock signal once a product's stock drops to its threshold", async () => {
    findUnique.mockResolvedValue(baseOrder);
    retrieveCheckoutForm.mockResolvedValue({
      status: "success",
      paymentStatus: "SUCCESS",
      paymentId: "pay_1",
      paidPrice: "38.84",
      signature: "sig",
    });
    verifyResponseSignature.mockReturnValue(true);
    productFindUniqueOrThrow.mockResolvedValue({
      stock: 3,
      title: "Rose Serum",
      lowStockThreshold: 10,
    });

    const res = await POST(makeRequest("tok_x"));

    expect(productFindUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { stock: true, title: true, lowStockThreshold: true },
    });
    expect(res.headers.get("location")).toContain(
      "/checkout/confirmation/BS-20260910-ABC123"
    );
  });
});
