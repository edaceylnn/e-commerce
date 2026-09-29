/**
 * @jest-environment node
 */
const findUnique = jest.fn();
const orderUpdate = jest.fn();
const productUpdate = jest.fn().mockResolvedValue({ stock: 0 });
const productVariantUpdate = jest.fn().mockResolvedValue({ stock: 0 });
const productVariantAggregate = jest.fn().mockResolvedValue({ _sum: { stock: 0 }, _count: 0 });
const stockMovementCreate = jest.fn();
const orderEventCreate = jest.fn();
const orderItemUpdateMany = jest.fn();
const mockTx = {
  order: { update: (...args: unknown[]) => orderUpdate(...args) },
  orderItem: { updateMany: (...args: unknown[]) => orderItemUpdateMany(...args) },
  product: { update: (...args: unknown[]) => productUpdate(...args) },
  productVariant: {
    update: (...args: unknown[]) => productVariantUpdate(...args),
    aggregate: (...args: unknown[]) => productVariantAggregate(...args),
  },
  stockMovement: { create: (...args: unknown[]) => stockMovementCreate(...args) },
  orderEvent: { create: (...args: unknown[]) => orderEventCreate(...args) },
};
// Supports both the array form (legacy call sites) and the interactive
// callback form `$transaction(async (tx) => {...})` used by refundOrder/
// cancelOrder — same spies either way, so assertions don't need to know
// which shape a given code path uses.
const transaction = jest.fn((arg: unknown) =>
  typeof arg === "function" ? arg(mockTx) : Promise.resolve(arg)
);

jest.mock("./db", () => ({
  prisma: {
    order: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => orderUpdate(...args),
    },
    product: {
      update: (...args: unknown[]) => productUpdate(...args),
    },
    productVariant: {
      update: (...args: unknown[]) => productVariantUpdate(...args),
    },
    $transaction: (arg: unknown) => transaction(arg),
  },
}));

const refundPayment = jest.fn();

jest.mock("./iyzico", () => ({
  refundPayment: (...args: unknown[]) => refundPayment(...args),
}));

import { refundOrder } from "./orders";

const baseOrder = {
  id: "order_1",
  orderNumber: "BS-20260910-ABC123",
  paidAt: new Date("2026-09-10T11:30:00.000Z"),
  refundedAt: null,
  status: "IPTAL",
  iyzicoItemTransactions: [
    { itemId: "1", paymentTransactionId: "txn_1", price: "19.42" },
    { itemId: "2", paymentTransactionId: "txn_2", price: "19.42" },
  ],
  items: [
    { productId: 1, variantId: null, quantity: 2 },
    { productId: 2, variantId: "variant_1", quantity: 1 },
  ],
};

beforeEach(() => {
  findUnique.mockReset();
  orderUpdate.mockReset();
  productUpdate.mockReset().mockResolvedValue({ stock: 0 });
  productVariantUpdate.mockReset().mockResolvedValue({ stock: 0 });
  productVariantAggregate.mockReset().mockResolvedValue({ _sum: { stock: 0 }, _count: 0 });
  stockMovementCreate.mockReset();
  orderEventCreate.mockReset();
  transaction.mockClear();
  refundPayment.mockReset().mockResolvedValue({ status: "success" });
});

describe("refundOrder", () => {
  it("refuses an order that was never paid", async () => {
    findUnique.mockResolvedValue({ ...baseOrder, paidAt: null });
    const result = await refundOrder("order_1", { ip: "127.0.0.1" });
    expect(result).toEqual({
      ok: false,
      error: "Bu sipariş için ödeme alınmamış, iade edilecek bir tutar yok.",
    });
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it("refuses an order that was already refunded", async () => {
    findUnique.mockResolvedValue({ ...baseOrder, refundedAt: new Date() });
    const result = await refundOrder("order_1", { ip: "127.0.0.1" });
    expect(result).toEqual({ ok: false, error: "Bu sipariş zaten iade edildi." });
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it("refuses an order whose status isn't refund-eligible", async () => {
    findUnique.mockResolvedValue({ ...baseOrder, status: "HAZIRLANIYOR" });
    const result = await refundOrder("order_1", { ip: "127.0.0.1" });
    expect(result).toEqual({ ok: false, error: "Bu sipariş durumu iadeye uygun değil." });
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it("refuses an order with no stored iyzico transactions", async () => {
    findUnique.mockResolvedValue({ ...baseOrder, iyzicoItemTransactions: null });
    const result = await refundOrder("order_1", { ip: "127.0.0.1" });
    expect(result.ok).toBe(false);
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it("refunds a cancelled (IPTAL) order without touching stock or status again", async () => {
    findUnique.mockResolvedValue(baseOrder);

    const result = await refundOrder("order_1", { ip: "127.0.0.1" });

    expect(result).toEqual({ ok: true });
    expect(refundPayment).toHaveBeenCalledTimes(2);
    expect(refundPayment).toHaveBeenCalledWith(
      expect.objectContaining({ paymentTransactionId: "txn_1", price: "19.42", ip: "127.0.0.1" })
    );
    // Stock was already restored by cancelOrder when this order became
    // IPTAL — refunding it a second time must not restore it again.
    expect(productUpdate).not.toHaveBeenCalled();
    expect(productVariantUpdate).not.toHaveBeenCalled();
    expect(stockMovementCreate).not.toHaveBeenCalled();
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({ refundedAt: expect.any(Date) }),
      })
    );
    const [updateCall] = orderUpdate.mock.calls[0];
    expect(updateCall.data.status).toBeUndefined();
  });

  it("refunds a shipped order, restores stock, and moves it to IADE", async () => {
    findUnique.mockResolvedValue({ ...baseOrder, status: "KARGOLANDI" });
    // Product 2's variants now total 12 after the restock.
    productVariantAggregate.mockResolvedValue({ _sum: { stock: 12 }, _count: 3 });

    const result = await refundOrder("order_1", { ip: "127.0.0.1" });

    expect(result).toEqual({ ok: true });
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({ status: "IADE", refundedAt: expect.any(Date) }),
      })
    );
    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { stock: { increment: 2 } },
    });
    expect(productVariantUpdate).toHaveBeenCalledWith({
      where: { id: "variant_1" },
      data: { stock: { increment: 1 } },
    });
    // The product total follows its variants, so the storefront sees it.
    expect(productUpdate).toHaveBeenCalledWith({ where: { id: 2 }, data: { stock: 12 } });
    expect(stockMovementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 1,
        type: "RETURN",
        quantity: 2,
        note: expect.stringContaining("BS-20260910-ABC123"),
      }),
    });
    expect(stockMovementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 2,
        variantId: "variant_1",
        type: "RETURN",
        quantity: 1,
      }),
    });
  });

  it("does not refund anything and records the failure when a transaction fails", async () => {
    findUnique.mockResolvedValue(baseOrder);
    refundPayment
      .mockResolvedValueOnce({ status: "success" })
      .mockResolvedValueOnce({ status: "failure", errorMessage: "insufficient funds" });

    const result = await refundOrder("order_1", { ip: "127.0.0.1" });

    expect(result.ok).toBe(false);
    // The success-path stock/status changes must never run — only the
    // internalNote update (plus its own timeline event) recording what
    // happened.
    expect(stockMovementCreate).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "IADE" }) })
    );
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order_1" },
        data: expect.objectContaining({
          internalNote: expect.stringContaining("insufficient funds"),
        }),
      })
    );
  });
});
