import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/admin/Card";
import { KpiCard } from "@/components/admin/KpiCard";
import { RevenueBarChart } from "@/components/admin/RevenueBarChart";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { isVipCustomer } from "@/lib/customer-tiers";
import { getSettings } from "@/lib/settings";
import { getSession } from "@/lib/auth";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/order-status";
import { getRangeConfig, bucketRevenue, percentChange, DATE_RANGE_OPTIONS, type RangeKey } from "@/lib/date-ranges";
import { WarningTriangleIcon } from "@/components/icons/AdminLuxeIcons";

type TopProductRow = {
  id: number;
  title: string;
  thumbnail: string;
  category_slug: string;
  units_sold: bigint;
  revenue: string;
};

type CategoryPerfRow = { label: string; revenue: string };

// Cycled per category bar — same four-color chart sequence the design deck
// uses for its channel-split bars (ink, blue, orange, pink).
const CATEGORY_CHART_COLORS = [
  "var(--adm-chart-ink)",
  "var(--adm-chart-blue)",
  "var(--adm-chart-orange)",
  "var(--adm-chart-pink)",
];

function isRangeKey(value: string | undefined): value is RangeKey {
  return !!value && DATE_RANGE_OPTIONS.some((o) => o.value === value);
}

async function getDashboardData(range: RangeKey, vipSpendThreshold: number) {
  const now = new Date();
  const config = getRangeConfig(range, now);
  const { start, end, previousStart, previousEnd, buckets } = config;
  const durationMs = end.getTime() - start.getTime();

  const [
    currentPeriodOrders,
    previousPeriodOrders,
    currentOrderCount,
    previousOrderCount,
    customerCount,
    lowStockProducts,
    lowStockCount,
    activeCampaignCount,
    statusCounts,
    topProducts,
    categoryPerf,
    recentOrders,
    allTimeOrderStats,
    customerUsers,
  ] = await Promise.all([
    prisma.order.findMany({ where: { paidAt: { gte: start, lt: end } }, select: { total: true, paidAt: true } }),
    prisma.order.findMany({ where: { paidAt: { gte: previousStart, lt: previousEnd } }, select: { total: true, paidAt: true } }),
    prisma.order.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.order.count({ where: { createdAt: { gte: previousStart, lt: previousEnd } } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.product.findMany({ where: { stock: { lt: 10 } }, orderBy: { stock: "asc" }, take: 4 }),
    prisma.product.count({ where: { stock: { lt: 10 } } }),
    prisma.campaign.count({ where: { active: true, startAt: { lte: now }, endAt: { gte: now } } }),
    prisma.order.groupBy({ by: ["status"], where: { createdAt: { gte: start, lt: end } }, _count: { _all: true } }),
    prisma.$queryRaw<TopProductRow[]>`
      SELECT p.id, p.title, p.thumbnail, c.slug as category_slug,
             SUM(oi.quantity)::bigint as units_sold,
             SUM(oi."unitPrice" * oi.quantity) as revenue
      FROM "OrderItem" oi
      JOIN "Product" p ON p.id = oi."productId"
      JOIN "Category" c ON c.id = p."categoryId"
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."paidAt" IS NOT NULL
      GROUP BY p.id, c.slug
      ORDER BY revenue DESC
      LIMIT 4
    `,
    prisma.$queryRaw<CategoryPerfRow[]>`
      SELECT c.label,
             SUM(oi."unitPrice" * oi.quantity) as revenue
      FROM "OrderItem" oi
      JOIN "Product" p ON p.id = oi."productId"
      JOIN "Category" c ON c.id = p."categoryId"
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."paidAt" IS NOT NULL
      GROUP BY c.label
      ORDER BY revenue DESC
      LIMIT 4
    `,
    prisma.order.findMany({ include: { user: true, items: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.order.groupBy({ by: ["userId"], where: { paidAt: { not: null } }, _count: { _all: true }, _sum: { total: true } }),
    prisma.user.findMany({ where: { role: "CUSTOMER" }, select: { id: true } }),
  ]);

  const currentRevenue = currentPeriodOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const previousRevenue = previousPeriodOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const revenueTrend = percentChange(currentRevenue, previousRevenue);
  const orderTrend = percentChange(currentOrderCount, previousOrderCount);
  const aov = currentPeriodOrders.length ? currentRevenue / currentPeriodOrders.length : 0;

  const revenueChartData = bucketRevenue(
    currentPeriodOrders.map((o) => ({ total: Number(o.total), paidAt: o.paidAt })),
    buckets
  );
  const previousBuckets = buckets.map((b) => ({
    start: new Date(b.start.getTime() - durationMs),
    end: new Date(b.end.getTime() - durationMs),
    label: b.label,
  }));
  const compareChartData = bucketRevenue(
    previousPeriodOrders.map((o) => ({ total: Number(o.total), paidAt: o.paidAt })),
    previousBuckets
  );

  const customerIds = new Set(customerUsers.map((u) => u.id));
  const customerOrderStats = allTimeOrderStats.filter((o) => customerIds.has(o.userId));
  const customersWithOrders = customerOrderStats.length;
  const repeatCustomers = customerOrderStats.filter((o) => o._count._all > 1).length;
  const repeatRate = customersWithOrders ? (repeatCustomers / customersWithOrders) * 100 : 0;
  const vipCount = customerOrderStats.filter((o) =>
    isVipCustomer("CUSTOMER", Number(o._sum.total ?? 0), vipSpendThreshold)
  ).length;

  const statusCountMap = new Map(statusCounts.map((s) => [s.status, s._count._all]));
  const pendingPaymentCount = statusCountMap.get("PENDING_PAYMENT") ?? 0;

  return {
    chartSubtitle: config.chartSubtitle,
    currentRevenue,
    revenueTrend,
    currentOrderCount,
    orderTrend,
    aov,
    customerCount,
    repeatRate,
    vipCount,
    lowStockCount,
    lowStockProducts,
    activeCampaignCount,
    statusCountMap,
    pendingPaymentCount,
    revenueChartData,
    compareChartData,
    topProducts,
    categoryPerf,
    recentOrders,
  };
}

function trendDirection(value: number): "up" | "down" | "flat" {
  if (value > 0.05) return "up";
  if (value < -0.05) return "down";
  return "flat";
}

function trendLabel(value: number): string {
  return `%${Math.abs(value).toFixed(1).replace(".", ",")}`;
}

function greeting(hour: number): string {
  if (hour < 6) return "İyi geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; globalSearch?: string }>;
}) {
  const { range: rawRange, globalSearch } = await searchParams;
  const range: RangeKey = isRangeKey(rawRange) ? rawRange : "7d";
  const settings = await getSettings();
  const session = await getSession();
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }) : null;
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const data = await getDashboardData(range, Number(settings.vipSpendThreshold));
  const categoryTotal = Math.max(
    1,
    data.categoryPerf.reduce((sum, c) => sum + Number(c.revenue), 0)
  );
  const revTrendDir = trendDirection(data.revenueTrend);
  const orderTrendDir = trendDirection(data.orderTrend);
  const performanceNote =
    revTrendDir === "up"
      ? `Mağazanız bu dönemde ${trendLabel(data.revenueTrend)} daha iyi gidiyor.`
      : revTrendDir === "down"
        ? `Mağazanız bu dönemde ${trendLabel(data.revenueTrend)} geriledi.`
        : "Mağazanız bu dönemde önceki döneme yakın performans gösteriyor.";
  const alerts = [
    ...(data.lowStockCount > 0
      ? [{ label: `${data.lowStockCount} ürün kritik stok seviyesinde`, href: "/admin/stock?durum=kritik" }]
      : []),
    ...(data.pendingPaymentCount > 0
      ? [{ label: `${data.pendingPaymentCount} sipariş ödeme bekliyor`, href: "/admin/orders?status=PENDING_PAYMENT" }]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title={firstName ? `${greeting(new Date().getHours())}, ${firstName}` : "Genel Bakış"}
        description={performanceNote}
        actions={<DateRangeFilter value={range} />}
      />

      {globalSearch?.trim() && (
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3 border border-adm-border bg-adm-surface-card px-4 py-3">
          <p className="text-sm text-adm-text-secondary">
            <span className="font-medium text-adm-text">“{globalSearch.trim()}”</span> için panel araması
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/products?q=${encodeURIComponent(globalSearch.trim())}`}
              className="border border-adm-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-adm-text-secondary transition hover:border-adm-primary hover:text-adm-text"
            >
              Ürünlerde Ara
            </Link>
            <Link
              href={`/admin/orders?q=${encodeURIComponent(globalSearch.trim())}`}
              className="border border-adm-border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-adm-text-secondary transition hover:border-adm-primary hover:text-adm-text"
            >
              Siparişlerde Ara
            </Link>
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-4">
          {alerts.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex items-center gap-1.5 text-xs font-medium text-adm-danger"
            >
              <WarningTriangleIcon className="h-3.5 w-3.5" />
              {a.label}
            </Link>
          ))}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Ciro"
          value={formatPrice(data.currentRevenue)}
          trend={revTrendDir === "flat" ? undefined : { direction: revTrendDir, text: trendLabel(data.revenueTrend) }}
          note="önceki döneme göre"
        />
        <KpiCard
          label="Sipariş"
          value={String(data.currentOrderCount)}
          trend={orderTrendDir === "flat" ? undefined : { direction: orderTrendDir, text: trendLabel(data.orderTrend) }}
          note="önceki döneme göre"
        />
        <KpiCard label="Ort. sepet" value={formatPrice(data.aov)} note="sipariş başına" />
        <KpiCard
          label="Tekrar alım"
          value={`%${data.repeatRate.toFixed(0)}`}
          note={`${data.vipCount} VIP müşteri`}
        />
      </div>

      {/* Ciro chart (paired bars, this vs. previous period) + top sellers /
          category split alongside it — same asymmetric two-column hero as
          the design deck's Genel Bakış screen. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Ciro" description={data.chartSubtitle}>
          {[...data.revenueChartData, ...data.compareChartData].every((point) => point.value === 0) ? (
            // An all-zero chart reads as "broken"; say what it means instead.
            <p className="flex h-56 items-center justify-center rounded-xl bg-adm-surface-secondary text-sm text-adm-text-tertiary">
              Bu dönemde ve bir önceki dönemde ödenmiş sipariş yok.
            </p>
          ) : (
            <RevenueBarChart data={data.revenueChartData} compareData={data.compareChartData} />
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="En çok satanlar">
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-adm-text-tertiary">Henüz satış verisi yok.</p>
            ) : (
              <div className="divide-y divide-adm-border">
                {data.topProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-adm-surface-secondary">
                      <Image src={product.thumbnail} alt="" fill sizes="36px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-adm-text">{product.title}</p>
                      <p className="text-xs text-adm-text-tertiary">{product.units_sold.toString()} adet</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-adm-text">
                      {formatPrice(Number(product.revenue))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Kategori dağılımı">
            {data.categoryPerf.length === 0 ? (
              <p className="text-sm text-adm-text-tertiary">Henüz satış verisi yok.</p>
            ) : (
              <div className="space-y-4">
                {data.categoryPerf.map((c, i) => {
                  const pct = (Number(c.revenue) / categoryTotal) * 100;
                  const barColor = CATEGORY_CHART_COLORS[i % CATEGORY_CHART_COLORS.length];
                  return (
                    <div key={c.label}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="text-adm-text-secondary">{c.label}</span>
                        <span className="font-semibold text-adm-text">%{pct.toFixed(0)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-adm-chart-track">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: barColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Secondary detail: status breakdown + low stock alerts, kept from
          the previous dashboard — real operational data the deck's
          single-channel Genel Bakış slide doesn't show but this back
          office needs. */}
      <div className="my-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Sipariş Durumları">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {ORDER_STATUSES.map((status) => (
              <div key={status} className="flex items-center gap-2">
                <span className="text-lg font-semibold text-adm-text">{data.statusCountMap.get(status) ?? 0}</span>
                <span className="text-xs text-adm-text-tertiary">{ORDER_STATUS_LABELS[status]}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Kritik Stok">
          <div className="space-y-4">
            {data.lowStockProducts.length === 0 && (
              <p className="text-sm text-adm-text-tertiary">Kritik seviyede stok yok.</p>
            )}
            {data.lowStockProducts.map((product) => (
              <div key={product.id} className="flex items-center gap-3 border-l-2 border-adm-danger pl-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-adm-surface-secondary">
                  <Image src={product.thumbnail} alt="" fill sizes="40px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-adm-text">{product.title}</p>
                  <p className="text-xs text-adm-text-tertiary">{product.stock} adet kaldı</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/admin/stock" className="mt-5 inline-block text-sm font-medium text-adm-primary hover:underline">
            Tüm stokları görüntüle →
          </Link>
        </Card>
      </div>

      {/* Recent orders — refined table */}
      <div className="mb-6">
      <Card title="Son Siparişler">
        <div className="-mt-2 mb-4 flex justify-end">
          <Link href="/admin/orders" className="text-sm font-medium text-adm-primary hover:underline">
            Tümünü Gör →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="adm-table adm-table-flush min-w-[640px]">
            <thead>
              <tr>
                <th>Sipariş</th>
                <th>Müşteri</th>
                <th>Ürün</th>
                <th>Tutar</th>
                <th>Durum</th>
                <th className="text-right">Tarih</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="font-semibold text-adm-primary">
                    <Link href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link>
                  </td>
                  <td className="text-adm-text">{order.user.name}</td>
                  <td>
                    <div className="flex -space-x-2">
                      {order.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-adm-bg bg-adm-surface-secondary">
                          <Image src={item.thumbnail} alt="" fill sizes="32px" className="object-cover" />
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="font-semibold text-adm-text">{formatPrice(Number(order.total))}</td>
                  <td>
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="text-right text-adm-text-tertiary">
                    {order.createdAt.toLocaleDateString("tr-TR")}
                  </td>
                </tr>
              ))}
              {data.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-adm-text-tertiary">
                    Henüz sipariş yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      </div>

      <Card title="Müşteri İçgörüleri">
        <div className="grid grid-cols-3 divide-x divide-adm-border">
          <div className="pr-4">
            <p className="font-adm-headline text-2xl font-semibold text-adm-text">{data.customerCount}</p>
            <p className="mt-1 text-xs text-adm-text-tertiary">Kayıtlı müşteri</p>
          </div>
          <div className="px-4">
            <p className="font-adm-headline text-2xl font-semibold text-adm-text">{data.vipCount}</p>
            <p className="mt-1 text-xs text-adm-text-tertiary">VIP müşteri</p>
          </div>
          <div className="pl-4">
            <p className="font-adm-headline text-2xl font-semibold text-adm-text">{data.activeCampaignCount}</p>
            <p className="mt-1 text-xs text-adm-text-tertiary">Aktif kampanya</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
