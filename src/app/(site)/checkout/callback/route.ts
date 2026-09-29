import { after, NextRequest, NextResponse } from "next/server";
import {
  emitLowStockAutomationEvent,
  emitOrderCreatedAutomationEvent,
  type LowStockAutomationEvent,
} from "@/lib/automation";
import { prisma } from "@/lib/db";
import { syncProductStockFromVariants } from "@/lib/product-stock";
import { retrieveCheckoutForm, verifyResponseSignature } from "@/lib/iyzico";

// Thrown inside the payment-confirmation transaction when an item's stock
// can't cover the order any more (two concurrent payments racing for the
// last unit). Rolls the whole transaction back — the order is left
// PENDING_PAYMENT rather than silently oversold.
class InsufficientStockError extends Error {}

// iyzico's hosted payment page redirects the buyer's browser here with a
// POST (form-encoded `token`) once they finish the payment attempt. We never
// trust that redirect by itself — we always call CF-Retrieve ourselves,
// server-to-server, with our own signed request, before treating an order
// as paid.
export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const token = formData?.get("token")?.toString();

  if (!token) {
    return NextResponse.redirect(new URL("/checkout/failed", request.url), 303);
  }

  const order = await prisma.order.findUnique({
    where: { iyzicoToken: token },
    include: { items: true, user: true },
  });
  if (!order) {
    return NextResponse.redirect(new URL("/checkout/failed", request.url), 303);
  }
  if (order.paidAt) {
    return NextResponse.redirect(
      new URL(`/checkout/confirmation/${order.orderNumber}`, request.url),
      303
    );
  }

  const result = await retrieveCheckoutForm({
    token,
    conversationId: order.iyzicoConversationId ?? undefined,
  }).catch((err) => {
    console.error("iyzico retrieve error", err);
    return null;
  });

  const signatureOk =
    !!result &&
    verifyResponseSignature(
      [
        result.paymentStatus,
        result.paymentId,
        result.currency,
        result.basketId,
        result.conversationId,
        result.paidPrice,
        result.price,
        result.token,
      ],
      result.signature
    );

  // The amount iyzico confirms as paid must match what we asked for —
  // guards against a tampered/stale token being replayed.
  const amountOk =
    !!result?.paidPrice &&
    Math.abs(Number(result.paidPrice) - Number(order.total)) < 0.01;

  const failUrl = new URL(`/checkout/failed?order=${order.orderNumber}`, request.url);

  if (!result || result.status !== "success" || !signatureOk || !amountOk) {
    return NextResponse.redirect(failUrl, 303);
  }

  if (result.paymentStatus !== "SUCCESS") {
    return NextResponse.redirect(failUrl, 303);
  }

  const paidAt = new Date();
  const lowStockEvents: LowStockAutomationEvent[] = [];

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "HAZIRLANIYOR",
          paidAt,
          iyzicoPaymentId: result.paymentId,
          // A refund is issued per item transaction, not against the
          // top-level payment — save these now, since CF-Retrieve is the
          // only place they're ever returned to us.
          iyzicoItemTransactions: result.itemTransactions
            ? result.itemTransactions.map((t) => ({
                itemId: t.itemId,
                paymentTransactionId: t.paymentTransactionId,
                price: t.price,
              }))
            : undefined,
        },
      });
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          type: "STATUS_CHANGE",
          message: "Ödeme onaylandı, sipariş hazırlanıyor.",
        },
      });

      // Stock is only decremented once payment is actually confirmed — an
      // abandoned checkout never touches inventory. A line tied to a variant
      // decrements that variant's own stock instead of the product's.
      //
      // The decrement is conditioned on the row still having enough stock
      // (`stock: { gte: quantity }`) so two payments confirmed concurrently
      // for the last unit(s) can't both succeed and drive stock negative —
      // whichever transaction commits second sees `count: 0` and aborts.
      for (const item of order.items) {
        if (item.variantId) {
          const updated = await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (updated.count === 0) {
            throw new InsufficientStockError(
              `Variant ${item.variantId} no longer has enough stock`
            );
          }
          const currentVariant = await tx.productVariant.findUniqueOrThrow({
            where: { id: item.variantId },
            select: { stock: true },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              type: "SALE",
              quantity: -item.quantity,
              previousStock: currentVariant.stock + item.quantity,
              newStock: currentVariant.stock,
              note: `Sipariş #${order.orderNumber}`,
            },
          });
          await syncProductStockFromVariants(tx, item.productId);
          continue;
        }

        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new InsufficientStockError(
            `Product ${item.productId} no longer has enough stock`
          );
        }

        // Only plain (non-variant) stock carries a configured threshold. Re-read
        // the row inside the same transaction rather than computing from the
        // pre-transaction snapshot fetched above — that snapshot can be stale
        // if another order decremented this product's stock in between, and
        // this read always sees our own just-committed decrement.
        const current = await tx.product.findUniqueOrThrow({
          where: { id: item.productId },
          select: { stock: true, title: true, lowStockThreshold: true },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "SALE",
            quantity: -item.quantity,
            previousStock: current.stock + item.quantity,
            newStock: current.stock,
            note: `Sipariş #${order.orderNumber}`,
          },
        });
        if (current.stock <= current.lowStockThreshold) {
          lowStockEvents.push({
            event: "product.low_stock",
            eventVersion: "1.0",
            requestId: `product.low_stock.${item.productId}.${order.id}`,
            product: {
              id: item.productId,
              title: current.title,
              remainingStock: current.stock,
              threshold: current.lowStockThreshold,
            },
            detectedAt: paidAt.toISOString(),
          });
        }
      }

      // Usage is only counted once payment is actually confirmed — an
      // abandoned checkout never consumes the coupon's usage limit.
      if (order.couponId) {
        await tx.coupon.update({
          where: { id: order.couponId },
          data: { usedCount: { increment: 1 } },
        });
      }
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      // The payment itself already succeeded at iyzico — this is a genuine
      // oversell edge case, not a payment failure. We don't have an
      // automated refund flow yet, so leave the order visibly flagged for
      // manual handling instead of silently failing it.
      console.error("Order oversold after payment capture", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentId: result.paymentId,
        error: err.message,
      });
      const oversellNote = `Ödeme alındı (paymentId: ${result.paymentId}) ancak stok tükendiği için sipariş işlenemedi — manuel inceleme ve iade gerekiyor.`;
      await prisma.order.update({
        where: { id: order.id },
        data: {
          iyzicoPaymentId: result.paymentId,
          internalNote: oversellNote,
        },
      });
      await prisma.orderEvent.create({
        data: { orderId: order.id, type: "NOTE", message: oversellNote },
      });
      return NextResponse.redirect(failUrl, 303);
    }
    throw err;
  }

  for (const event of lowStockEvents) {
    after(() => emitLowStockAutomationEvent(event));
  }

  const automationPayload = {
    event: "order.created" as const,
    eventVersion: "1.0" as const,
    requestId: `order.created.${order.id}`,
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: "HAZIRLANIYOR",
      total: Number(order.total),
      currency: "TRY" as const,
      createdAt: order.createdAt.toISOString(),
      paidAt: paidAt.toISOString(),
    },
    customer: {
      id: order.user.id,
      name: order.user.name,
      email: order.user.email,
    },
    items: order.items.map((item) => ({
      productId: String(item.productId),
      variantId: item.variantId,
      sku: item.sku,
      name: item.title,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
  };

  after(() => emitOrderCreatedAutomationEvent(automationPayload));

  return NextResponse.redirect(
    new URL(`/checkout/confirmation/${order.orderNumber}`, request.url),
    303
  );
}
