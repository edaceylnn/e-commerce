import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { OrderSummaryData } from "@/components/OrderSummary";
import { refundPayment, type IyzicoItemTransaction } from "@/lib/iyzico";
import { releaseReservation } from "@/lib/stock-reservation";
import {
  isOrderCancelable,
  isOrderRefundable,
  paymentStatusLabel,
  REFUNDABLE_STATUSES,
  RETURN_STATUSES,
} from "@/lib/order-status";

// Re-exported so existing server-side call sites (route handlers, other
// lib modules) can keep importing these from here — only client
// components need to reach past this file straight to @/lib/order-status
// (see the comment there for why).
export { isOrderCancelable, isOrderRefundable, paymentStatusLabel };

// Restores stock for one order line (variant-specific if the line has one,
// else product-level) and writes a matching StockMovement row in the same
// transaction — every stock change is expected to leave this kind of trail
// (see prisma/schema.prisma's StockMovement doc comment).
async function restockItem(
  tx: Prisma.TransactionClient,
  item: { productId: number; variantId: string | null; quantity: number },
  type: "RETURN" | "CANCELLATION",
  note: string
) {
  if (item.variantId) {
    const variant = await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        variantId: item.variantId,
        type,
        quantity: item.quantity,
        previousStock: variant.stock - item.quantity,
        newStock: variant.stock,
        note,
      },
    });
  } else {
    const product = await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        type,
        quantity: item.quantity,
        previousStock: product.stock - item.quantity,
        newStock: product.stock,
        note,
      },
    });
  }
}

// Every order status change is expected to leave one of these behind — it's
// what backs the Sipariş Timeline (Bölüm 19). actorUserId is omitted for
// system-triggered events (a payment webhook, not a person clicking a button).
async function logOrderEvent(
  tx: Prisma.TransactionClient,
  orderId: string,
  message: string,
  actorUserId?: string
) {
  await tx.orderEvent.create({
    data: { orderId, type: "STATUS_CHANGE", message, actorUserId },
  });
}

export type RefundOrderResult = { ok: true } | { ok: false; error: string };

// Issues a real money-back request to iyzico and, for orders returned after
// shipping, restores stock and moves the order to IADE. IADE is only ever
// reached through this function — never settable from the admin status
// dropdown — so it's a hard guarantee that an order marked IADE really was
// refunded, not just relabeled.
export async function refundOrder(
  orderId: string,
  { ip }: { ip: string },
  actorUserId?: string,
  reason?: string
): Promise<RefundOrderResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Sipariş bulunamadı." };
  if (!order.paidAt) {
    return { ok: false, error: "Bu sipariş için ödeme alınmamış, iade edilecek bir tutar yok." };
  }
  if (order.refundedAt) {
    return { ok: false, error: "Bu sipariş zaten iade edildi." };
  }
  if (!(REFUNDABLE_STATUSES as readonly string[]).includes(order.status)) {
    return { ok: false, error: "Bu sipariş durumu iadeye uygun değil." };
  }

  const transactions = order.iyzicoItemTransactions as
    | IyzicoItemTransaction[]
    | null;
  if (!transactions || transactions.length === 0) {
    return {
      ok: false,
      error:
        "Bu sipariş için iyzico işlem kaydı bulunamadı — iade iyzico panelinden manuel olarak yapılmalı.",
    };
  }

  const results = await Promise.all(
    transactions.map((t) =>
      refundPayment({
        paymentTransactionId: t.paymentTransactionId,
        price: t.price ?? "0",
        currency: "TRY",
        ip,
        conversationId: order.id,
      }).catch((err) => ({
        status: "failure" as const,
        errorMessage: err instanceof Error ? err.message : "Bilinmeyen hata",
      }))
    )
  );

  const failed = results.filter((r) => r.status !== "success");
  if (failed.length > 0) {
    // Some transactions may have actually succeeded at iyzico before one
    // failed — record exactly what happened rather than silently retrying
    // (which could double-refund the ones that already went through) or
    // silently declaring success.
    const note = `İade kısmen başarısız: ${failed.length}/${transactions.length} işlem başarısız oldu (${failed
      .map((f) => f.errorMessage ?? "bilinmeyen hata")
      .join("; ")}). Kalan işlemler iyzico panelinden manuel kontrol edilmeli.`;
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { internalNote: note } });
      await logOrderEvent(tx, order.id, note, actorUserId);
    });
    return {
      ok: false,
      error: "İade tamamlanamadı — bazı işlemler başarısız oldu, manuel inceleme gerekiyor.",
    };
  }

  const refundedAt = new Date();
  const isReturn = (RETURN_STATUSES as readonly string[]).includes(order.status);

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        refundedAt,
        internalNote: `İade tamamlandı (${transactions.length} işlem, ${refundedAt.toLocaleString("tr-TR")}).`,
        ...(isReturn ? { status: "IADE" } : {}),
      },
    });
    // Mirror the order-level refund down to every line so the İadeler
    // reporting page (which reads OrderItem.refundedAt) sees full-order
    // refunds the same way it sees partial ones from refundOrderItems().
    await tx.orderItem.updateMany({
      where: { orderId: order.id },
      data: { refundedAt, refundReason: reason },
    });
    await logOrderEvent(
      tx,
      order.id,
      `İade tamamlandı (${transactions.length} işlem)${isReturn ? " — sipariş İade Edildi olarak işaretlendi" : ""}.`,
      actorUserId
    );
    if (isReturn) {
      for (const item of order.items) {
        await restockItem(tx, item, "RETURN", `İade #${order.orderNumber}`);
      }
    }
  });

  return { ok: true };
}

// Refunds only a subset of an order's lines (Bölüm 28 — Kısmi İade).
// iyzico's refund API works per basket item, and checkout/create keys each
// basket item by productId (see that route) — so this refunds at product
// granularity: selecting one line pulls in every sibling line that shares
// its productId (they were sent to iyzico as one basket item and share one
// transaction, so they can't be split any finer). Once every line on the
// order has been refunded this way, the order itself flips to fully
// refunded exactly like refundOrder() does.
export async function refundOrderItems(
  orderId: string,
  orderItemIds: string[],
  { ip }: { ip: string },
  actorUserId?: string,
  reason?: string
): Promise<RefundOrderResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Sipariş bulunamadı." };
  if (!order.paidAt) {
    return { ok: false, error: "Bu sipariş için ödeme alınmamış, iade edilecek bir tutar yok." };
  }
  if (order.refundedAt) {
    return { ok: false, error: "Bu sipariş zaten tamamen iade edildi." };
  }
  if (!(REFUNDABLE_STATUSES as readonly string[]).includes(order.status)) {
    return { ok: false, error: "Bu sipariş durumu iadeye uygun değil." };
  }

  const selectedItems = order.items.filter((i) => orderItemIds.includes(i.id));
  if (selectedItems.length === 0) {
    return { ok: false, error: "İade edilecek ürün seçilmedi." };
  }
  if (selectedItems.some((i) => i.refundedAt)) {
    return { ok: false, error: "Seçilen ürünlerden bazıları zaten iade edilmiş." };
  }

  const productIds = new Set(selectedItems.map((i) => i.productId));
  const itemsToRefund = order.items.filter(
    (i) => productIds.has(i.productId) && !i.refundedAt
  );

  const transactions = order.iyzicoItemTransactions as
    | IyzicoItemTransaction[]
    | null;
  if (!transactions || transactions.length === 0) {
    return {
      ok: false,
      error:
        "Bu sipariş için iyzico işlem kaydı bulunamadı — iade iyzico panelinden manuel olarak yapılmalı.",
    };
  }

  const matchingTransactions = transactions.filter((t) =>
    productIds.has(Number(t.itemId))
  );
  if (matchingTransactions.length === 0) {
    return { ok: false, error: "Seçilen ürünler için iyzico işlem kaydı bulunamadı." };
  }

  const results = await Promise.all(
    matchingTransactions.map((t) =>
      refundPayment({
        paymentTransactionId: t.paymentTransactionId,
        price: t.price ?? "0",
        currency: "TRY",
        ip,
        conversationId: order.id,
      }).catch((err) => ({
        status: "failure" as const,
        errorMessage: err instanceof Error ? err.message : "Bilinmeyen hata",
      }))
    )
  );

  const failed = results.filter((r) => r.status !== "success");
  if (failed.length > 0) {
    const note = `Kısmi iade başarısız: ${failed.length}/${matchingTransactions.length} işlem başarısız oldu (${failed
      .map((f) => f.errorMessage ?? "bilinmeyen hata")
      .join("; ")}). Manuel inceleme gerekiyor.`;
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { internalNote: note } });
      await logOrderEvent(tx, order.id, note, actorUserId);
    });
    return {
      ok: false,
      error: "İade tamamlanamadı — bazı işlemler başarısız oldu, manuel inceleme gerekiyor.",
    };
  }

  const refundedAt = new Date();
  const isReturn = (RETURN_STATUSES as readonly string[]).includes(order.status);
  const productTitles = [...new Set(itemsToRefund.map((i) => i.title))].join(", ");

  await prisma.$transaction(async (tx) => {
    for (const item of itemsToRefund) {
      await tx.orderItem.update({ where: { id: item.id }, data: { refundedAt, refundReason: reason } });
      if (isReturn) {
        await restockItem(tx, item, "RETURN", `Kısmi iade #${order.orderNumber}`);
      }
    }

    const isFullyRefunded = order.items.every(
      (i) => itemsToRefund.some((r) => r.id === i.id) || i.refundedAt
    );

    await tx.order.update({
      where: { id: order.id },
      data: {
        internalNote: `Kısmi iade: ${productTitles} (${refundedAt.toLocaleString("tr-TR")}).`,
        ...(isFullyRefunded
          ? { refundedAt, ...(isReturn ? { status: "IADE" as const } : {}) }
          : {}),
      },
    });

    await logOrderEvent(
      tx,
      order.id,
      `Kısmi iade tamamlandı: ${productTitles}${
        isFullyRefunded
          ? " — tüm ürünler iade edildi, sipariş tamamen iade edildi olarak işaretlendi."
          : "."
      }`,
      actorUserId
    );
  });

  return { ok: true };
}

// A payment arrived for an order we can't ship — its stock sold out after
// the reservation expired, or the order was cancelled while the buyer was
// still on the payment page. The money goes straight back instead of
// waiting for someone to notice. When iyzico refuses any part of it, the
// order keeps its payment details and a visible "manuel iade" note; it is
// never deleted by the pending-order cleanup (see that script).
export async function refundUnfulfillablePayment(
  order: { id: string; orderNumber: string },
  payment: { paymentId?: string; itemTransactions: IyzicoItemTransaction[] },
  reason: string,
  { ip }: { ip: string }
): Promise<{ refunded: boolean }> {
  const results = await Promise.all(
    payment.itemTransactions.map((t) =>
      refundPayment({
        paymentTransactionId: t.paymentTransactionId,
        price: t.price ?? "0",
        currency: "TRY",
        ip,
        conversationId: order.id,
        reason: "other",
      }).catch((err) => ({
        status: "failure" as const,
        errorMessage: err instanceof Error ? err.message : "Bilinmeyen hata",
      }))
    )
  );
  const failed = results.filter((r) => r.status !== "success");
  const refunded = payment.itemTransactions.length > 0 && failed.length === 0;
  const now = new Date();

  const note = refunded
    ? `Ödeme alındı ancak ${reason}; tutarın tamamı otomatik olarak iade edildi (${payment.itemTransactions.length} işlem).`
    : `Ödeme alındı (paymentId: ${payment.paymentId ?? "?"}) ancak ${reason}. Otomatik iade tamamlanamadı${
        failed.length ? ` (${failed.map((f) => f.errorMessage ?? "bilinmeyen hata").join("; ")})` : ""
      } — iyzico panelinden manuel iade gerekiyor.`;

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        iyzicoPaymentId: payment.paymentId,
        iyzicoItemTransactions: payment.itemTransactions,
        internalNote: note,
        ...(refunded ? { status: "IPTAL", refundedAt: now } : {}),
      },
    });
    await logOrderEvent(tx, order.id, note);
  });
  return { refunded };
}

export type CancelOrderResult = { ok: true } | { ok: false; error: string };

// Shared by the customer-facing cancel action and the admin status-change
// route, so "cancel" always means the same thing regardless of who does it:
// flip to IPTAL and give back whatever stock the order was holding — the
// sold units of a paid order, or the reservation of one still awaiting
// payment (see src/lib/stock-reservation.ts).
export async function cancelOrder(
  orderId: string,
  actorUserId?: string
): Promise<CancelOrderResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Sipariş bulunamadı." };
  if (order.status === "IPTAL") return { ok: true };
  if (!isOrderCancelable(order.status)) {
    return { ok: false, error: "Bu sipariş artık iptal edilemez." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "IPTAL" } });
    await logOrderEvent(tx, orderId, "Sipariş iptal edildi.", actorUserId);
    if (order.paidAt) {
      for (const item of order.items) {
        await restockItem(tx, item, "CANCELLATION", `İptal #${order.orderNumber}`);
      }
    } else {
      await releaseReservation(tx, order, "Ödeme öncesi iptal");
    }
  });

  return { ok: true };
}

function toAddressSummary(address: {
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  district: string;
}) {
  return {
    fullName: address.fullName,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    district: address.district,
  };
}

export async function getOrderForUser(
  orderNumber: string,
  userId: string
): Promise<OrderSummaryData | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true, shippingAddress: true, billingAddress: true },
  });
  if (!order || order.userId !== userId) return null;

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    trackingNumber: order.trackingNumber,
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    discountTotal: Number(order.discountTotal),
    total: Number(order.total),
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      title: item.title,
      thumbnail: item.thumbnail,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
    })),
    shippingAddress: toAddressSummary(order.shippingAddress),
    billingAddress: toAddressSummary(order.billingAddress),
    sameAddress: order.shippingAddressId === order.billingAddressId,
  };
}

export type ReorderLine = {
  id: number;
  variantId?: string;
  title: string;
  thumbnail: string;
  price: number;
  quantity: number;
};

export type OrderListItem = {
  orderNumber: string;
  status: string;
  total: number;
  createdAt: Date;
  paidAt: Date | null;
  trackingNumber: string | null;
  itemCount: number;
  thumbnails: string[];
  reorderItems: ReorderLine[];
};

export async function getOrdersForUser(userId: string): Promise<OrderListItem[]> {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        select: {
          productId: true,
          variantId: true,
          title: true,
          thumbnail: true,
          unitPrice: true,
          quantity: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return orders.map((order) => ({
    orderNumber: order.orderNumber,
    status: order.status,
    total: Number(order.total),
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    trackingNumber: order.trackingNumber,
    itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
    thumbnails: order.items.slice(0, 4).map((i) => i.thumbnail),
    reorderItems: order.items.map((i) => ({
      id: i.productId,
      variantId: i.variantId ?? undefined,
      title: i.title,
      thumbnail: i.thumbnail,
      price: Number(i.unitPrice),
      quantity: i.quantity,
    })),
  }));
}


export type OrderDetailItem = {
  id: string;
  productId: number;
  variantId?: string;
  title: string;
  thumbnail: string;
  variantLabel: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
};

export type OrderDetail = {
  orderNumber: string;
  status: string;
  paidAt: Date | null;
  createdAt: Date;
  trackingNumber: string | null;
  subtotal: number;
  discountTotal: number;
  shippingCost: number;
  total: number;
  items: OrderDetailItem[];
  shippingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    district: string;
  };
  billingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    district: string;
  };
  sameAddress: boolean;
};

// Richer than getOrderForUser (which only feeds the OrderSummary shared with
// checkout/confirmation) — this backs the account order-detail page's
// timeline, per-item variant info, and "Ürüne Git"/"Tekrar Satın Al" actions.
export async function getOrderDetailForUser(
  orderNumber: string,
  userId: string
): Promise<OrderDetail | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: { include: { variant: { include: { color: true, size: true } } } },
      shippingAddress: true,
      billingAddress: true,
    },
  });
  if (!order || order.userId !== userId) return null;

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    trackingNumber: order.trackingNumber,
    subtotal: Number(order.subtotal),
    discountTotal: Number(order.discountTotal),
    shippingCost: Number(order.shippingCost),
    total: Number(order.total),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId ?? undefined,
      title: item.title,
      thumbnail: item.thumbnail,
      variantLabel: item.variant
        ? `${item.variant.size.label} / ${item.variant.color.name}`
        : null,
      sku: item.sku,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity,
    })),
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    sameAddress: order.shippingAddressId === order.billingAddressId,
  };
}
