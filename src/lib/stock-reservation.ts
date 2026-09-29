import type { Prisma, PrismaClient, StockMovementType } from "@/generated/prisma/client";

// Stock reservation — how an order holds its stock between "Ödemeyi Başlat"
// and the payment result.
//
//   checkout/create   reserveStock()        stock taken now, atomically; a
//                                           second buyer for the last unit is
//                                           refused before paying anything
//   payment succeeds  markOrderPaid()       the hold simply becomes the sale
//   payment fails /   releaseReservation()  stock given back at once
//   order cancelled
//   hold expires      releaseExpiredReservations()  run lazily at checkout
//                                           and by scripts/cleanup-pending-orders
//
// Stock is decremented in place (not tracked in a side table), so every
// reader — storefront "Tükendi", admin lists, the Product.stock trigger —
// sees the reserved units as gone without any change.

// Used until iyzico tells us its payment page lifetime (tokenExpireTime).
export const DEFAULT_RESERVATION_SECONDS = 30 * 60;
// Held a little past the payment page's own lifetime, so a payment finished
// in its last seconds still finds the stock reserved.
export const RESERVATION_GRACE_SECONDS = 5 * 60;

export function reservationDeadline(pageLifetimeSeconds = DEFAULT_RESERVATION_SECONDS, now = new Date()) {
  return new Date(now.getTime() + (pageLifetimeSeconds + RESERVATION_GRACE_SECONDS) * 1000);
}

export type StockLine = { productId: number; variantId?: string | null; quantity: number };

export class InsufficientStockError extends Error {
  constructor(readonly line: StockLine) {
    super(`Not enough stock for product ${line.productId}${line.variantId ? ` / variant ${line.variantId}` : ""}`);
  }
}

// The order can no longer be paid for (cancelled, or already settled by a
// concurrent callback) — a payment that arrives anyway must be refunded.
export class OrderNotPayableError extends Error {}

type Movement = { type: StockMovementType; orderId: string; note: string };

// Takes stock only if enough is left — the `gte` condition makes two
// concurrent buyers of the last unit impossible to both succeed.
async function takeStock(tx: Prisma.TransactionClient, line: StockLine, movement: Movement) {
  const updated = line.variantId
    ? await tx.productVariant.updateMany({
        where: { id: line.variantId, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      })
    : await tx.product.updateMany({
        where: { id: line.productId, stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
  if (updated.count === 0) throw new InsufficientStockError(line);
  await logMovement(tx, line, -line.quantity, movement);
}

async function giveBackStock(tx: Prisma.TransactionClient, line: StockLine, movement: Movement) {
  if (line.variantId) {
    await tx.productVariant.update({
      where: { id: line.variantId },
      data: { stock: { increment: line.quantity } },
    });
  } else {
    await tx.product.update({ where: { id: line.productId }, data: { stock: { increment: line.quantity } } });
  }
  await logMovement(tx, line, line.quantity, movement);
}

async function logMovement(tx: Prisma.TransactionClient, line: StockLine, quantity: number, movement: Movement) {
  const { stock } = line.variantId
    ? await tx.productVariant.findUniqueOrThrow({ where: { id: line.variantId }, select: { stock: true } })
    : await tx.product.findUniqueOrThrow({ where: { id: line.productId }, select: { stock: true } });
  await tx.stockMovement.create({
    data: {
      productId: line.productId,
      variantId: line.variantId ?? null,
      orderId: movement.orderId,
      type: movement.type,
      quantity,
      previousStock: stock - quantity,
      newStock: stock,
      note: movement.note,
    },
  });
}

// Reserves every line or none: run inside the transaction that creates the
// order, so an InsufficientStockError rolls the order back too.
export async function reserveStock(
  tx: Prisma.TransactionClient,
  order: { id: string; orderNumber: string },
  lines: StockLine[]
) {
  for (const line of lines) {
    await takeStock(tx, line, {
      type: "RESERVATION",
      orderId: order.id,
      note: `Sipariş #${order.orderNumber} — ödeme bekleniyor`,
    });
  }
}

// Gives a held reservation back. Claiming the order row first (only one
// caller can flip stockReleasedAt from null) makes this safe to call from
// the payment callback, a cancellation and the expiry sweep at the same
// time — stock is returned exactly once. Returns whether this call did it.
export async function releaseReservation(
  tx: Prisma.TransactionClient,
  order: { id: string; orderNumber: string; items: StockLine[] },
  reason: string
) {
  const claimed = await tx.order.updateMany({
    where: { id: order.id, paidAt: null, stockReleasedAt: null, reservedUntil: { not: null } },
    data: { stockReleasedAt: new Date() },
  });
  if (claimed.count === 0) return false;
  for (const line of order.items) {
    await giveBackStock(tx, line, {
      type: "RESERVATION_RELEASE",
      orderId: order.id,
      note: `${reason} — Sipariş #${order.orderNumber}`,
    });
  }
  return true;
}

// Payment confirmed. If the order still holds its reservation, that hold
// becomes the sale (its RESERVATION movements are relabelled SALE). If not
// — the hold expired and was released, or the order predates reservations —
// stock is taken again now, which can fail with InsufficientStockError when
// someone else bought it in the meantime. Throws OrderNotPayableError when
// the order was cancelled or already paid.
export async function markOrderPaid(
  tx: Prisma.TransactionClient,
  order: { id: string; orderNumber: string; items: StockLine[] },
  paid: Prisma.OrderUpdateManyMutationInput & { paidAt: Date }
) {
  const note = `Sipariş #${order.orderNumber}`;
  const held = await tx.order.updateMany({
    where: {
      id: order.id,
      status: "PENDING_PAYMENT",
      paidAt: null,
      stockReleasedAt: null,
      reservedUntil: { not: null },
    },
    data: paid,
  });
  if (held.count === 1) {
    await tx.stockMovement.updateMany({
      where: { orderId: order.id, type: "RESERVATION" },
      data: { type: "SALE", note },
    });
    return;
  }

  const payable = await tx.order.updateMany({
    where: { id: order.id, status: "PENDING_PAYMENT", paidAt: null },
    data: paid,
  });
  if (payable.count === 0) throw new OrderNotPayableError();
  for (const line of order.items) {
    await takeStock(tx, line, { type: "SALE", orderId: order.id, note });
  }
}

// Releases every hold whose time is up. Cheap enough to run at the start of
// each checkout, which keeps abandoned payment pages from locking stock even
// without a scheduler; scripts/cleanup-pending-orders runs it too.
export async function releaseExpiredReservations(db: PrismaClient, now = new Date()) {
  const expired = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", paidAt: null, stockReleasedAt: null, reservedUntil: { lt: now } },
    include: { items: true },
    take: 100,
  });
  let released = 0;
  for (const order of expired) {
    const done = await db.$transaction((tx) => releaseReservation(tx, order, "Süresi dolan rezervasyon"));
    if (done) released++;
  }
  return released;
}
