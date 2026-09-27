import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  computeCampaignDiscount,
  isCampaignEligible,
  type CampaignCartLine,
} from "@/lib/campaigns";

const schema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        quantity: z.number().int().positive(),
        variantId: z.string().optional(),
      })
    )
    .min(1)
    .max(100),
});

// Campaigns are automatic (no code to enter), so the cart and review pages
// need their own preview call to show whether one currently applies — it is
// re-validated for real in /api/checkout/create. Deliberately open to guests:
// it only reads public data (active campaigns and catalog prices) and nothing
// about the caller, so a signed-out shopper sees the same total as a
// signed-in one. The item cap bounds the product lookup per request.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const productIds = parsed.data.items.map((item) => item.id);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const cartLines: CampaignCartLine[] = [];
  const lineProductIds: number[] = [];
  for (const item of parsed.data.items) {
    const product = productById.get(item.id);
    if (!product) continue;
    const variant = item.variantId
      ? product.variants.find((v) => v.id === item.variantId)
      : undefined;
    const unitPrice = variant
      ? Number(variant.priceOverride ?? product.price)
      : Number(product.price) * (1 - Number(product.discountPercentage) / 100);
    cartLines.push({
      categoryId: product.categoryId,
      brandId: product.brandId,
      unitPrice,
      quantity: item.quantity,
    });
    lineProductIds.push(item.id);
  }

  const now = new Date();
  const activeCampaigns = await prisma.campaign.findMany({
    where: { active: true, startAt: { lte: now }, endAt: { gte: now } },
    include: {
      category: { select: { label: true } },
      brand: { select: { name: true } },
    },
  });

  // Besides the amount, the winning campaign's rate, scope and the products it
  // actually applied to are returned, so the cart can say exactly what was
  // discounted ("Uzun Kollu Ev Takımı · %15 indirim").
  let best: {
    name: string;
    discount: number;
    percentage: number;
    scope: string | null;
    productIds: number[];
  } | null = null;
  for (const campaign of activeCampaigns) {
    const discount = computeCampaignDiscount(
      {
        discountPercentage: Number(campaign.discountPercentage),
        categoryId: campaign.categoryId,
        brandId: campaign.brandId,
        minSpend: campaign.minSpend ? Number(campaign.minSpend) : null,
      },
      cartLines
    );
    if (discount > 0 && (!best || discount > best.discount)) {
      best = {
        name: campaign.name,
        discount,
        percentage: Number(campaign.discountPercentage),
        scope: campaign.category?.label ?? campaign.brand?.name ?? null,
        productIds: [
          ...new Set(
            lineProductIds.filter((_, i) => isCampaignEligible(campaign, cartLines[i]))
          ),
        ],
      };
    }
  }

  return NextResponse.json(best ?? { name: null, discount: 0 });
}
