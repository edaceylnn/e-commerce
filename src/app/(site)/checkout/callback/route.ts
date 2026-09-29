import { after, NextRequest, NextResponse } from "next/server";
import {
  emitLowStockAutomationEvent,
  emitOrderCreatedAutomationEvent,
  type LowStockAutomationEvent,
} from "@/lib/automation";
import { prisma } from "@/lib/db";
import { retrieveCheckoutForm, verifyResponseSignature } from "@/lib/iyzico";
import { refundUnfulfillablePayment } from "@/lib/orders";
import {
  InsufficientStockError,
  markOrderPaid,
  OrderNotPayableError,
  releaseReservation,
} from "@/lib/stock-reservation";

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

  const refundedUrl = new URL(`/checkout/failed?order=${order.orderNumber}&refund=done`, request.url);
  const manualRefundUrl = new URL(`/checkout/failed?order=${order.orderNumber}&refund=manual`, request.url);
  // A payment for this order was already refunded or flagged for a manual
  // refund — e.g. the browser re-posted the callback. Never refund twice.
  if (order.refundedAt) return NextResponse.redirect(refundedUrl, 303);
  if (order.iyzicoPaymentId) return NextResponse.redirect(manualRefundUrl, 303);

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

  // Unverified answer (network error, bad signature, wrong amount): we
  // can't tell whether money moved, so the stock stays reserved and the
  // expiry sweep releases it later if nothing else happens.
  if (!result || result.status !== "success" || !signatureOk || !amountOk) {
    return NextResponse.redirect(failUrl, 303);
  }

  // iyzico confirmed the payment failed: give the reservation back now
  // rather than making other buyers wait for it to expire.
  if (result.paymentStatus !== "SUCCESS") {
    await prisma.$transaction((tx) => releaseReservation(tx, order, "Ödeme başarısız"));
    return NextResponse.redirect(failUrl, 303);
  }

  const paidAt = new Date();
  // A refund is issued per item transaction, not against the top-level
  // payment — save these now, since CF-Retrieve is the only place they're
  // ever returned to us.
  const itemTransactions = (result.itemTransactions ?? []).map((t) => ({
    itemId: t.itemId,
    paymentTransactionId: t.paymentTransactionId,
    price: t.price,
  }));

  try {
    await prisma.$transaction(async (tx) => {
      // Turns the reservation into the sale — or, if the reservation had
      // already lapsed, takes the stock again (see stock-reservation.ts).
      await markOrderPaid(tx, order, {
        status: "HAZIRLANIYOR",
        paidAt,
        iyzicoPaymentId: result.paymentId,
        iyzicoItemTransactions: itemTransactions.length ? itemTransactions : undefined,
      });
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          type: "STATUS_CHANGE",
          message: "Ödeme onaylandı, sipariş hazırlanıyor.",
        },
      });

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
    if (err instanceof InsufficientStockError || err instanceof OrderNotPayableError) {
      // The money has already been taken, but the order can't be shipped:
      // its stock sold out after the reservation lapsed, or it was cancelled
      // while the buyer was still paying. Refund it right away.
      const reason =
        err instanceof InsufficientStockError
          ? "ürün, rezervasyon süresi dolduktan sonra tükendi"
          : "sipariş ödeme tamamlanmadan iptal edilmişti";
      console.error("Paid order can't be fulfilled, refunding", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentId: result.paymentId,
        reason,
      });
      const { refunded } = await refundUnfulfillablePayment(
        order,
        { paymentId: result.paymentId, itemTransactions },
        reason,
        { ip: request.headers.get("x-forwarded-for") ?? "127.0.0.1" }
      );
      return NextResponse.redirect(refunded ? refundedUrl : manualRefundUrl, 303);
    }
    throw err;
  }

  // Only plain (non-variant) stock carries a configured threshold. Read after
  // the payment committed so it reflects this sale.
  const lowStockEvents: LowStockAutomationEvent[] = [];
  const plainProductIds = [...new Set(order.items.filter((i) => !i.variantId).map((i) => i.productId))];
  if (plainProductIds.length) {
    const products = await prisma.product.findMany({
      where: { id: { in: plainProductIds } },
      select: { id: true, stock: true, title: true, lowStockThreshold: true },
    });
    for (const product of products) {
      if (product.stock <= product.lowStockThreshold) {
        lowStockEvents.push({
          event: "product.low_stock",
          eventVersion: "1.0",
          requestId: `product.low_stock.${product.id}.${order.id}`,
          product: {
            id: product.id,
            title: product.title,
            remainingStock: product.stock,
            threshold: product.lowStockThreshold,
          },
          detectedAt: paidAt.toISOString(),
        });
      }
    }
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
