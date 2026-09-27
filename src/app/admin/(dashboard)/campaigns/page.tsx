import { prisma } from "@/lib/db";
import { AdminCouponsPanel } from "@/components/AdminCouponsPanel";
import { AdminCampaignsPanel } from "@/components/AdminCampaignsPanel";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatPrice } from "@/lib/format";

export default async function AdminCampaignsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [coupons, campaigns, categories, brands, campaignStats, monthRevenue] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.campaign.findMany({
      include: { category: true, brand: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { label: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.order.groupBy({
      by: ["campaignId"],
      where: { campaignId: { not: null }, paidAt: { not: null } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: { campaignId: { not: null }, paidAt: { gte: monthStart } },
      _sum: { total: true },
    }),
  ]);

  const statsByCampaign = new Map(
    campaignStats.map((s) => [s.campaignId as string, { usage: s._count._all, revenue: Number(s._sum.total ?? 0) }])
  );
  const activeCampaignCount = campaigns.filter(
    (c) => c.active && c.startAt <= now && c.endAt >= now
  ).length;

  const couponRows = coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: Number(coupon.value),
    expiresAt: coupon.expiresAt
      ? coupon.expiresAt.toISOString().slice(0, 10)
      : null,
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    active: coupon.active,
  }));

  const campaignRows = campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    discountPercentage: Number(campaign.discountPercentage),
    categoryLabel: campaign.category?.label ?? null,
    brandName: campaign.brand?.name ?? null,
    minSpend: campaign.minSpend ? Number(campaign.minSpend) : null,
    startAt: campaign.startAt.toISOString().slice(0, 10),
    endAt: campaign.endAt.toISOString().slice(0, 10),
    active: campaign.active,
    usage: statsByCampaign.get(campaign.id)?.usage ?? 0,
    revenue: statsByCampaign.get(campaign.id)?.revenue ?? 0,
  }));

  return (
    <div className="space-y-12">
      <div>
        <PageHeader
          title="Kampanyalar"
          description="Kategori veya marka bazlı otomatik indirimler — sepette kupon ile üst üste binmez, ikisinden yüksek olan uygulanır."
          meta={`${activeCampaignCount} aktif kampanya · bu ay ${formatPrice(Number(monthRevenue._sum.total ?? 0))} kampanyalı ciro`}
        />
        <AdminCampaignsPanel
          campaigns={campaignRows}
          categories={categories.map((c) => ({ id: c.id, label: c.label }))}
          brands={brands.map((b) => ({ id: b.id, name: b.name }))}
        />
      </div>

      <div>
        <PageHeader title="Kuponlar" />
        <AdminCouponsPanel coupons={couponRows} />
      </div>
    </div>
  );
}
