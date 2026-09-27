// Pure math, no DB access — same reasoning as src/lib/coupons.ts. A campaign
// is a category/brand-scoped (or store-wide, when neither is set) automatic
// discount with an optional cart-wide spend threshold. It is never combined
// with a coupon — checkout picks whichever of the two discounts is larger
// (see src/app/api/checkout/create/route.ts).
export type CampaignCartLine = {
  categoryId: string;
  brandId: string | null;
  unitPrice: number;
  quantity: number;
};

type CampaignScope = { categoryId: string | null; brandId: string | null };

// Whether a cart line falls inside the campaign's category/brand scope
// (a campaign with neither set covers every line).
export function isCampaignEligible(
  campaign: CampaignScope,
  line: Pick<CampaignCartLine, "categoryId" | "brandId">
): boolean {
  if (campaign.categoryId && line.categoryId !== campaign.categoryId) return false;
  if (campaign.brandId && line.brandId !== campaign.brandId) return false;
  return true;
}

export function computeCampaignDiscount(
  campaign: {
    discountPercentage: number;
    categoryId: string | null;
    brandId: string | null;
    minSpend: number | null;
  },
  cartLines: CampaignCartLine[]
): number {
  const cartSubtotal = cartLines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  );
  if (campaign.minSpend && cartSubtotal < campaign.minSpend) {
    return 0;
  }

  const eligibleLines = cartLines.filter((line) => isCampaignEligible(campaign, line));
  if (eligibleLines.length === 0) {
    return 0;
  }

  const eligibleSubtotal = eligibleLines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  );
  return eligibleSubtotal * (campaign.discountPercentage / 100);
}
