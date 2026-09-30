import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  IYZICO_SANDBOX_IDENTITY_NUMBER,
  initializeCheckoutForm,
  verifyResponseSignature,
} from "@/lib/iyzico";
import { computeShippingCost, SHIPPING_TAX_RATE } from "@/lib/shipping";
import { computeCouponDiscount } from "@/lib/coupons";
import { computeCampaignDiscount, isCampaignEligible, type CampaignCartLine } from "@/lib/campaigns";
import { allocateDiscount, toKurus, toLira } from "@/lib/invoicing/tax";
import {
  InsufficientStockError,
  releaseExpiredReservations,
  releaseReservation,
  reservationDeadline,
  reserveStock,
} from "@/lib/stock-reservation";

const createSchema = z.object({
  shippingAddressId: z.string().min(1),
  billingAddressId: z.string().min(1),
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        quantity: z.number().int().positive(),
        variantId: z.string().optional(),
      })
    )
    .min(1, "Sepetiniz boş."),
  couponCode: z.string().trim().optional(),
});

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `BS-${y}${m}${d}-${suffix}`;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Giriş yapmalısınız." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Geçersiz istek." },
      { status: 400 }
    );
  }

  const [shippingAddress, billingAddress] = await Promise.all([
    prisma.address.findUnique({ where: { id: parsed.data.shippingAddressId } }),
    prisma.address.findUnique({ where: { id: parsed.data.billingAddressId } }),
  ]);
  if (
    !shippingAddress ||
    shippingAddress.userId !== session.userId ||
    !billingAddress ||
    billingAddress.userId !== session.userId
  ) {
    return NextResponse.json({ error: "Adres bulunamadı." }, { status: 404 });
  }

  // Abandoned payment pages give their stock back here, before this
  // checkout reads availability — no scheduler needed for that.
  await releaseExpiredReservations(prisma);

  // Recompute everything from the DB — client-sent prices/quantities are
  // never trusted for the order total.
  const productIds = parsed.data.items.map((item) => item.id);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: { include: { color: true, size: true } } },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const orderItemsData: {
    productId: number;
    variantId?: string;
    sku?: string;
    title: string;
    thumbnail: string;
    unitPrice: number;
    quantity: number;
    taxRate: number;
    discountAmount?: number;
  }[] = [];
  const campaignLines: CampaignCartLine[] = [];

  for (const item of parsed.data.items) {
    const product = productById.get(item.id);
    if (!product) {
      return NextResponse.json(
        { error: `Ürün bulunamadı: ${item.id}` },
        { status: 400 }
      );
    }

    const variant = item.variantId
      ? product.variants.find((v) => v.id === item.variantId)
      : undefined;
    if (item.variantId && !variant) {
      return NextResponse.json(
        { error: `Varyant bulunamadı: ${item.variantId}` },
        { status: 400 }
      );
    }

    const availableStock = variant ? variant.stock : product.stock;
    const variantLabel = variant ? `${variant.size.label} / ${variant.color.name}` : null;
    const label = variantLabel ? `${product.title} - ${variantLabel}` : product.title;
    if (item.quantity > availableStock) {
      return NextResponse.json(
        { error: `"${label}" için yeterli stok yok (kalan: ${availableStock}).` },
        { status: 400 }
      );
    }

    // A variant's own price (when set) is authoritative and doesn't stack
    // with the product's discountPercentage — matches how the product page
    // displays it (see ProductPurchasePanel).
    // Rounded to the kuruş here, before anything is summed: a sub-kuruş
    // unit price (999.99 × 85% = 849.9915) would otherwise make the charged
    // total and the invoice's line amounts disagree by a kuruş.
    const unitPrice = toLira(
      toKurus(
        variant
          ? Number(variant.priceOverride ?? product.price)
          : Number(product.price) * (1 - Number(product.discountPercentage) / 100)
      )
    );

    orderItemsData.push({
      productId: product.id,
      variantId: variant?.id,
      sku: variant?.sku,
      title: label,
      thumbnail: product.thumbnail,
      unitPrice,
      quantity: item.quantity,
      // Frozen for the invoice: the rate that applies at the time of sale.
      taxRate: Number(product.taxRate),
    });
    campaignLines.push({
      categoryId: product.categoryId,
      brandId: product.brandId,
      unitPrice,
      quantity: item.quantity,
    });
  }

  const subtotal = orderItemsData.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  // Re-validate the coupon server-side — never trust that a client-sent
  // code was actually checked, same reasoning as the price recompute above.
  let couponId: string | null = null;
  let couponDiscount = 0;
  if (parsed.data.couponCode) {
    const code = parsed.data.couponCode.trim().toUpperCase();
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    const valid =
      coupon &&
      coupon.active &&
      (!coupon.expiresAt || coupon.expiresAt >= new Date()) &&
      (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit);
    if (!valid) {
      return NextResponse.json(
        { error: "Kupon artık geçerli değil." },
        { status: 400 }
      );
    }
    couponId = coupon.id;
    couponDiscount = computeCouponDiscount(
      { type: coupon.type, value: Number(coupon.value) },
      subtotal
    );
  }

  // Campaigns are automatic (no code) and never stack with a coupon — of
  // whichever discount is larger, only that one is applied and recorded.
  const now = new Date();
  const activeCampaigns = await prisma.campaign.findMany({
    where: { active: true, startAt: { lte: now }, endAt: { gte: now } },
  });

  let bestCampaignId: string | null = null;
  let bestCampaignDiscount = 0;
  for (const campaign of activeCampaigns) {
    const discount = computeCampaignDiscount(
      {
        discountPercentage: Number(campaign.discountPercentage),
        categoryId: campaign.categoryId,
        brandId: campaign.brandId,
        minSpend: campaign.minSpend ? Number(campaign.minSpend) : null,
      },
      campaignLines
    );
    if (discount > bestCampaignDiscount) {
      bestCampaignDiscount = discount;
      bestCampaignId = campaign.id;
    }
  }

  let discountTotal = 0;
  let appliedCouponId: string | null = null;
  let appliedCampaignId: string | null = null;
  if (couponId && couponDiscount >= bestCampaignDiscount) {
    discountTotal = couponDiscount;
    appliedCouponId = couponId;
  } else if (bestCampaignId) {
    discountTotal = bestCampaignDiscount;
    appliedCampaignId = bestCampaignId;
  }

  // Money is settled in whole kuruş from here on (see src/lib/invoicing/tax.ts).
  discountTotal = toLira(toKurus(discountTotal));
  const shippingCost = computeShippingCost(subtotal);
  const total = toLira(toKurus(subtotal) + toKurus(shippingCost) - toKurus(discountTotal));

  // Each line's share of the discount, frozen for its invoice line: a
  // coupon covers the whole basket, a campaign only its category/brand.
  const appliedCampaign = activeCampaigns.find((c) => c.id === appliedCampaignId);
  const discountShares = allocateDiscount(
    orderItemsData.map((item, i) => ({
      gross: toKurus(item.unitPrice) * item.quantity,
      campaignEligible: appliedCampaign ? isCampaignEligible(appliedCampaign, campaignLines[i]) : false,
    })),
    toKurus(discountTotal),
    appliedCouponId ? "coupon" : appliedCampaign ? "campaign" : null
  );
  orderItemsData.forEach((item, i) => (item.discountAmount = toLira(discountShares[i])));

  // The stock check above gives a friendly message; the reservation below
  // is what actually guarantees the units — it takes them atomically, so of
  // two buyers racing for the last one, the second is refused here, before
  // reaching the payment page.
  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: session.userId,
          shippingAddressId: shippingAddress.id,
          billingAddressId: billingAddress.id,
          subtotal,
          shippingCost,
          discountTotal,
          couponId: appliedCouponId,
          campaignId: appliedCampaignId,
          total,
          shippingTaxRate: SHIPPING_TAX_RATE,
          reservedUntil: reservationDeadline(),
          items: { create: orderItemsData },
        },
        include: { items: true },
      });
      await reserveStock(tx, created, created.items);
      await tx.orderEvent.create({
        data: {
          orderId: created.id,
          type: "STATUS_CHANGE",
          message: "Sipariş oluşturuldu, stok ayrıldı, ödeme bekleniyor.",
          actorUserId: session.userId,
        },
      });
      return created;
    });
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      const item = orderItemsData.find(
        (i) => i.productId === err.line.productId && (i.variantId ?? null) === (err.line.variantId ?? null)
      );
      return NextResponse.json(
        { error: `"${item?.title ?? "Bir ürün"}" az önce tükendi — sepetinizi güncelleyip tekrar deneyin.` },
        { status: 409 }
      );
    }
    throw err;
  }

  const callbackUrl = new URL("/checkout/callback", request.nextUrl.origin).toString();

  const initResponse = await initializeCheckoutForm({
    locale: "tr",
    conversationId: order.id,
    price: subtotal.toFixed(2),
    paidPrice: total.toFixed(2),
    currency: "TRY",
    basketId: order.id,
    paymentGroup: "PRODUCT",
    callbackUrl,
    buyer: {
      id: session.userId,
      name: session.name,
      surname: "-",
      // Sandbox placeholder — see src/lib/iyzico.ts for why we don't collect
      // a real government identity number in this demo.
      identityNumber: IYZICO_SANDBOX_IDENTITY_NUMBER,
      email: session.email,
      gsmNumber: shippingAddress.phone,
      registrationAddress: shippingAddress.line1,
      city: shippingAddress.city,
      country: "Turkey",
      ip: request.headers.get("x-forwarded-for") ?? "127.0.0.1",
      zipCode: shippingAddress.postalCode,
    },
    shippingAddress: {
      address: `${shippingAddress.line1}${shippingAddress.line2 ? ", " + shippingAddress.line2 : ""}`,
      contactName: shippingAddress.fullName,
      city: shippingAddress.city,
      country: "Turkey",
      zipCode: shippingAddress.postalCode,
    },
    billingAddress: {
      address: `${billingAddress.line1}${billingAddress.line2 ? ", " + billingAddress.line2 : ""}`,
      contactName: billingAddress.fullName,
      city: billingAddress.city,
      country: "Turkey",
      zipCode: billingAddress.postalCode,
    },
    basketItems: orderItemsData.map((item) => ({
      id: String(item.productId),
      price: (item.unitPrice * item.quantity).toFixed(2),
      name: item.title,
      category1: "Kozmetik",
      itemType: "PHYSICAL",
    })),
  }).catch((err) => {
    console.error("iyzico initialize error", err);
    return null;
  });

  if (
    !initResponse ||
    initResponse.status !== "success" ||
    !initResponse.paymentPageUrl ||
    !initResponse.token ||
    !verifyResponseSignature(
      [initResponse.conversationId, initResponse.token],
      initResponse.signature
    )
  ) {
    // No iyzico token was ever issued for this order, so it can never be
    // paid or reach the callback route — give its stock back and delete it
    // instead of leaving a dangling PENDING_PAYMENT row behind.
    const unpayable = order;
    await prisma
      .$transaction(async (tx) => {
        await releaseReservation(tx, unpayable, "Ödeme başlatılamadı");
        await tx.order.delete({ where: { id: unpayable.id } });
      })
      .catch((err) => {
        console.error("Failed to clean up unpayable order", { orderId: unpayable.id, err });
      });
    return NextResponse.json(
      { error: "Ödeme başlatılamadı. Lütfen tekrar deneyin." },
      { status: 502 }
    );
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      iyzicoToken: initResponse.token,
      iyzicoConversationId: initResponse.conversationId,
      // Hold the stock for as long as iyzico keeps this payment page open.
      ...(initResponse.tokenExpireTime ? { reservedUntil: reservationDeadline(initResponse.tokenExpireTime) } : {}),
    },
  });

  return NextResponse.json({ paymentPageUrl: initResponse.paymentPageUrl });
}
