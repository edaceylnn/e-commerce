import Image from "next/image";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/admin/Card";
import { StatCard } from "@/components/admin/StatCard";
import { RevenueTrendChart, type RevenueTrendPoint } from "@/components/admin/RevenueTrendChart";
import { isVipCustomer } from "@/lib/customer-tiers";
import { getSettings } from "@/lib/settings";
import { HeartIcon } from "@/components/icons/HeartIcon";

type CategoryPerfRow = {
  id: string;
  label: string;
  units_sold: bigint;
  revenue: string;
};

type BrandPerfRow = {
  name: string;
  units_sold: bigint;
  revenue: string;
};

type SizeReturnRow = {
  label: string;
  units_sold: bigint;
  units_returned: bigint;
};

async function getAnalyticsData(vipSpendThreshold: number) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    recentOrders,
    categoryPerf,
    brandPerf,
    couponUsage,
    campaignUsage,
    orderCounts,
    customerUsers,
    totalOrders,
    cancelledOrders,
    wishlistGroups,
    sizeReturnRows,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { paidAt: { gte: thirtyDaysAgo } },
      select: { total: true, paidAt: true },
    }),
    prisma.$queryRaw<CategoryPerfRow[]>`
      SELECT c.id, c.label,
             SUM(oi.quantity)::bigint as units_sold,
             SUM(oi."unitPrice" * oi.quantity) as revenue
      FROM "OrderItem" oi
      JOIN "Product" p ON p.id = oi."productId"
      JOIN "Category" c ON c.id = p."categoryId"
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."paidAt" IS NOT NULL
      GROUP BY c.id, c.label
      ORDER BY revenue DESC
    `,
    prisma.$queryRaw<BrandPerfRow[]>`
      SELECT COALESCE(b.name, 'Markasız') as name,
             SUM(oi.quantity)::bigint as units_sold,
             SUM(oi."unitPrice" * oi.quantity) as revenue
      FROM "OrderItem" oi
      JOIN "Product" p ON p.id = oi."productId"
      LEFT JOIN "Brand" b ON b.id = p."brandId"
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."paidAt" IS NOT NULL
      GROUP BY COALESCE(b.name, 'Markasız')
      ORDER BY revenue DESC
      LIMIT 8
    `,
    prisma.order.groupBy({
      by: ["couponId"],
      where: { couponId: { not: null }, paidAt: { not: null } },
      _count: { _all: true },
      _sum: { discountTotal: true },
    }),
    prisma.order.groupBy({
      by: ["campaignId"],
      where: { campaignId: { not: null }, paidAt: { not: null } },
      _count: { _all: true },
      _sum: { discountTotal: true },
    }),
    prisma.order.groupBy({
      by: ["userId"],
      where: { paidAt: { not: null } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.user.findMany({ where: { role: "CUSTOMER" }, select: { id: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "IPTAL" } }),
    prisma.wishlistItem.groupBy({
      by: ["productId"],
      _count: { _all: true },
      orderBy: { _count: { productId: "desc" } },
      take: 5,
    }),
    prisma.$queryRaw<SizeReturnRow[]>`
      SELECT s.label,
             SUM(oi.quantity)::bigint as units_sold,
             SUM(CASE WHEN o.status = 'IADE' THEN oi.quantity ELSE 0 END)::bigint as units_returned
      FROM "OrderItem" oi
      JOIN "ProductVariant" pv ON pv.id = oi."variantId"
      JOIN "Size" s ON s.id = pv."sizeId"
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."paidAt" IS NOT NULL
      GROUP BY s.label, s.position
      ORDER BY s.position ASC
    `,
  ]);

  const dailyRevenue: RevenueTrendPoint[] = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(thirtyDaysAgo);
    day.setDate(day.getDate() + i);
    return { label: `${day.getDate()}/${day.getMonth() + 1}`, value: 0 };
  });
  for (const order of recentOrders) {
    if (!order.paidAt) continue;
    const diffDays = Math.floor(
      (order.paidAt.getTime() - thirtyDaysAgo.getTime()) / 86_400_000
    );
    if (diffDays >= 0 && diffDays < 30) {
      dailyRevenue[diffDays].value += Number(order.total);
    }
  }

  const [couponRows, campaignRows] = await Promise.all([
    prisma.coupon.findMany({
      where: { id: { in: couponUsage.map((c) => c.couponId!).filter(Boolean) } },
    }),
    prisma.campaign.findMany({
      where: { id: { in: campaignUsage.map((c) => c.campaignId!).filter(Boolean) } },
    }),
  ]);
  const couponMap = new Map(couponRows.map((c) => [c.id, c]));
  const campaignMap = new Map(campaignRows.map((c) => [c.id, c]));

  const couponPerformance = couponUsage
    .map((c) => ({
      label: couponMap.get(c.couponId!)?.code ?? "—",
      orders: c._count._all,
      discountGiven: Number(c._sum.discountTotal ?? 0),
    }))
    .sort((a, b) => b.discountGiven - a.discountGiven);

  const campaignPerformance = campaignUsage
    .map((c) => ({
      label: campaignMap.get(c.campaignId!)?.name ?? "—",
      orders: c._count._all,
      discountGiven: Number(c._sum.discountTotal ?? 0),
    }))
    .sort((a, b) => b.discountGiven - a.discountGiven);

  const customerIds = new Set(customerUsers.map((u) => u.id));
  const customerOrderStats = orderCounts.filter((o) => customerIds.has(o.userId));
  const customersWithOrders = customerOrderStats.length;
  const repeatCustomers = customerOrderStats.filter((o) => o._count._all > 1).length;
  const repeatRate = customersWithOrders
    ? (repeatCustomers / customersWithOrders) * 100
    : 0;
  const totalCustomerSpend = customerOrderStats.reduce(
    (sum, o) => sum + Number(o._sum.total ?? 0),
    0
  );
  const avgSpend = customersWithOrders ? totalCustomerSpend / customersWithOrders : 0;
  const vipCount = customerOrderStats.filter((o) =>
    isVipCustomer("CUSTOMER", Number(o._sum.total ?? 0), vipSpendThreshold)
  ).length;

  const cancellationRate = totalOrders ? (cancelledOrders / totalOrders) * 100 : 0;

  const wishlistProductIds = wishlistGroups.map((w) => w.productId);
  const wishlistProducts = await prisma.product.findMany({
    where: { id: { in: wishlistProductIds } },
  });
  const wishlistProductMap = new Map(wishlistProducts.map((p) => [p.id, p]));
  const topWishlisted = wishlistGroups.map((w) => ({
    id: w.productId,
    title: wishlistProductMap.get(w.productId)?.title ?? "—",
    thumbnail: wishlistProductMap.get(w.productId)?.thumbnail ?? "",
    count: w._count._all,
  }));

  const sizeReturnRates = sizeReturnRows.map((r) => ({
    label: r.label,
    unitsSold: Number(r.units_sold),
    unitsReturned: Number(r.units_returned),
    rate: Number(r.units_sold) > 0 ? (Number(r.units_returned) / Number(r.units_sold)) * 100 : 0,
  }));

  return {
    dailyRevenue,
    categoryPerf,
    brandPerf,
    sizeReturnRates,
    couponPerformance,
    campaignPerformance,
    customersWithOrders,
    repeatRate,
    avgSpend,
    vipCount,
    cancellationRate,
    cancelledOrders,
    totalOrders,
    topWishlisted,
  };
}

function RankedBar({
  label,
  units,
  revenue,
  maxRevenue,
}: {
  label: string;
  units: bigint;
  revenue: number;
  maxRevenue: number;
}) {
  const widthPct = maxRevenue > 0 ? Math.max(4, (revenue / maxRevenue) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-adm-text">{label}</span>
        <span className="text-adm-text-secondary">
          {units.toString()} adet · {formatPrice(revenue)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-adm-surface-secondary">
        <div
          className="h-full rounded-full bg-adm-primary"
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const settings = await getSettings();
  const vipSpendThreshold = Number(settings.vipSpendThreshold);
  const data = await getAnalyticsData(vipSpendThreshold);
  const maxCategoryRevenue = Math.max(
    1,
    ...data.categoryPerf.map((c) => Number(c.revenue))
  );
  const maxBrandRevenue = Math.max(1, ...data.brandPerf.map((b) => Number(b.revenue)));

  return (
    <div>
      <PageHeader
        title="Raporlar"
        description="Gerçek sipariş, kampanya ve favori verilerinden hesaplanır."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="VIP Müşteriler"
          value={data.vipCount}
          href="/admin/users?segment=vip"
          note={`₺${vipSpendThreshold.toLocaleString("tr-TR")}+ harcama`}
        />
        <StatCard
          label="Ort. Müşteri Harcaması"
          value={formatPrice(data.avgSpend)}
          href="/admin/users"
        />
        <StatCard
          label="Tekrar Alım Oranı"
          value={`%${data.repeatRate.toFixed(0)}`}
          href="/admin/users"
          note={`${data.customersWithOrders} sipariş veren müşteriden`}
        />
        <StatCard
          label="İptal Oranı"
          value={`%${data.cancellationRate.toFixed(0)}`}
          href="/admin/orders"
          note={`${data.cancelledOrders} / ${data.totalOrders} sipariş`}
          accent={data.cancellationRate > 10 ? "danger" : "primary"}
        />
      </div>

      <Card padding="lg" className="mb-8">
        <div className="mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-adm-text-secondary">
            30 Günlük Ciro Trendi
          </h2>
          <p className="mt-1 text-xs text-adm-text-tertiary">Ödemesi tamamlanan siparişler baz alınır.</p>
        </div>
        <RevenueTrendChart data={data.dailyRevenue} />
      </Card>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card padding="lg">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-adm-text-secondary">
            Kategori Performansı
          </h2>
          <div className="space-y-4">
            {data.categoryPerf.length === 0 && (
              <p className="mt-1 text-xs text-adm-text-tertiary">Henüz satış verisi yok.</p>
            )}
            {data.categoryPerf.map((c) => (
              <RankedBar
                key={c.id}
                label={c.label}
                units={c.units_sold}
                revenue={Number(c.revenue)}
                maxRevenue={maxCategoryRevenue}
              />
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-adm-text-secondary">
            Marka Performansı
          </h2>
          <div className="space-y-4">
            {data.brandPerf.length === 0 && (
              <p className="mt-1 text-xs text-adm-text-tertiary">Henüz satış verisi yok.</p>
            )}
            {data.brandPerf.map((b) => (
              <RankedBar
                key={b.name}
                label={b.name}
                units={b.units_sold}
                revenue={Number(b.revenue)}
                maxRevenue={maxBrandRevenue}
              />
            ))}
          </div>
        </Card>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card padding="lg">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-adm-text-secondary">
            Kupon Performansı
          </h2>
          {data.couponPerformance.length === 0 ? (
            <p className="mt-1 text-xs text-adm-text-tertiary">Henüz kullanılan kupon yok.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-adm-text-tertiary">
                  <th className="pb-2">Kod</th>
                  <th className="pb-2">Sipariş</th>
                  <th className="pb-2 text-right">Verilen İndirim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-adm-border/10">
                {data.couponPerformance.map((c) => (
                  <tr key={c.label}>
                    <td className="py-2 font-semibold text-adm-text">{c.label}</td>
                    <td className="py-2 text-adm-text-secondary">{c.orders}</td>
                    <td className="py-2 text-right text-adm-text-secondary">
                      {formatPrice(c.discountGiven)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card padding="lg">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-adm-text-secondary">
            Kampanya Performansı
          </h2>
          {data.campaignPerformance.length === 0 ? (
            <p className="mt-1 text-xs text-adm-text-tertiary">Henüz kullanılan kampanya yok.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-adm-text-tertiary">
                  <th className="pb-2">Kampanya</th>
                  <th className="pb-2">Sipariş</th>
                  <th className="pb-2 text-right">Verilen İndirim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-adm-border/10">
                {data.campaignPerformance.map((c) => (
                  <tr key={c.label}>
                    <td className="py-2 font-semibold text-adm-text">{c.label}</td>
                    <td className="py-2 text-adm-text-secondary">{c.orders}</td>
                    <td className="py-2 text-right text-adm-text-secondary">
                      {formatPrice(c.discountGiven)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card padding="lg" className="mb-8">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-adm-text-secondary">
          En Çok Favorilenen Ürünler
        </h2>
        {data.topWishlisted.length === 0 ? (
          <p className="mt-1 text-xs text-adm-text-tertiary">Henüz favori eklenmemiş.</p>
        ) : (
          <div className="space-y-3">
            {data.topWishlisted.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 border border-adm-border bg-adm-surface-card p-3 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden bg-adm-surface-secondary">
                    {p.thumbnail && (
                      <Image src={p.thumbnail} alt="" fill sizes="40px" className="object-cover" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-adm-text">{p.title}</span>
                </div>
                <span className="flex items-center gap-1 text-sm text-adm-text-secondary">
                  <HeartIcon filled className="h-4 w-4" /> {p.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding="lg" className="mb-8">
        <div className="mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-adm-text-secondary">
            Beden Bazlı İade Oranı
          </h2>
          <p className="mt-1 text-xs text-adm-text-tertiary">
            Tekstile özel KPI — hangi bedenlerin orantısız yüksek iade aldığını gösterir
            (beden tablosu/kalıp sorunlarına işaret edebilir).
          </p>
        </div>
        {data.sizeReturnRates.length === 0 ? (
          <p className="mt-1 text-xs text-adm-text-tertiary">Henüz satış verisi yok.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-adm-text-tertiary">
                <th className="pb-2">Beden</th>
                <th className="pb-2 text-right">Satılan</th>
                <th className="pb-2 text-right">İade Edilen</th>
                <th className="pb-2 text-right">İade Oranı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-border/10">
              {data.sizeReturnRates.map((r) => (
                <tr key={r.label}>
                  <td className="py-2 font-semibold text-adm-text">{r.label}</td>
                  <td className="py-2 text-right text-adm-text-secondary">{r.unitsSold}</td>
                  <td className="py-2 text-right text-adm-text-secondary">{r.unitsReturned}</td>
                  <td
                    className={`py-2 text-right font-medium ${r.rate > 15 ? "text-adm-danger" : "text-adm-text"}`}
                  >
                    %{r.rate.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <p className="text-xs text-adm-text-tertiary">
        Not: Sepeti terk etme oranı, dönüşüm oranı ve en çok görüntülenen ürünler
        gibi metrikler bu panelde yer almıyor — projede sayfa görüntülenme/etkileşim
        takibi altyapısı bulunmadığından bu veriler uydurulmamıştır. &quot;İptal
        Oranı&quot;, sadece kargoya verilmeden önceki iptalleri (IPTAL durumu)
        yansıtır — kargo sonrası iadeler (IADE durumu) ayrı tutulur ve bu orana
        dahil edilmez.
      </p>
    </div>
  );
}
