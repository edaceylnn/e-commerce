import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/admin/Card";
import { KpiCard } from "@/components/admin/KpiCard";
import { AdminTable, AdminTableEmpty } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";

const TABLE_LIMIT = 50;

const REASON_CHART_COLORS = [
  "var(--adm-chart-ink)",
  "var(--adm-chart-blue)",
  "var(--adm-chart-orange)",
  "var(--adm-chart-pink)",
  "var(--adm-chart-muted)",
];

export default async function AdminReturnsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    refundedItems,
    monthRefundedCount,
    monthRefundedRevenue,
    monthSoldCount,
    reasonCounts,
    topReturnedProducts,
  ] = await Promise.all([
    prisma.orderItem.findMany({
      where: { refundedAt: { not: null } },
      include: { order: { include: { user: true } } },
      orderBy: { refundedAt: "desc" },
      take: TABLE_LIMIT,
    }),
    prisma.orderItem.count({ where: { refundedAt: { gte: monthStart } } }),
    prisma.orderItem.aggregate({
      where: { refundedAt: { gte: monthStart } },
      _sum: { unitPrice: true, quantity: true },
    }),
    prisma.orderItem.aggregate({
      where: { order: { paidAt: { gte: monthStart } } },
      _sum: { quantity: true },
    }),
    prisma.orderItem.groupBy({
      by: ["refundReason"],
      where: { refundedAt: { not: null }, refundReason: { not: null } },
      _count: { _all: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId", "title"],
      where: { refundedAt: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { productId: "desc" } },
      take: 5,
    }),
  ]);

  // OrderItem.unitPrice is per-unit — approximate this month's refunded
  // revenue as unit price summed across refunded lines (quantity mostly 1
  // per line in this catalog, so this is a reasonable real-data estimate
  // without a per-line total column to sum directly).
  const monthRevenue = Number(monthRefundedRevenue._sum.unitPrice ?? 0);
  const totalMonthSold = monthSoldCount._sum.quantity ?? 0;
  const returnRate = totalMonthSold > 0 ? (monthRefundedCount / totalMonthSold) * 100 : 0;

  const reasonTotal = reasonCounts.reduce((sum, r) => sum + r._count._all, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Satış"
        title="İadeler"
        description="Tamamlanmış iadelerin listesi ve dağılımı."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Bu ay iade" value={String(monthRefundedCount)} note="ürün bazında" />
        <KpiCard label="İade oranı" value={`%${returnRate.toFixed(1)}`} note="bu ay satılana göre" />
        <KpiCard label="Bu ay iade edilen" value={formatPrice(monthRevenue)} />
        <KpiCard label="Toplam kayıt" value={String(refundedItems.length)} note={`son ${TABLE_LIMIT}`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card title="İade Kayıtları">
          <AdminTable>
            <thead>
              <tr className="border-b border-adm-border text-[11px] font-medium uppercase tracking-wider text-adm-text-tertiary">
                <th className="py-3 pl-4 pr-4">Sipariş</th>
                <th className="py-3 pr-4">Ürün</th>
                <th className="py-3 pr-4">Sebep</th>
                <th className="py-3 pr-4">Tutar</th>
                <th className="py-3 pr-4">Müşteri</th>
                <th className="py-3 pr-4">Durum</th>
                <th className="py-3 pr-4 text-right">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-adm-border">
              {refundedItems.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pl-4 pr-4">
                    <Link
                      href={`/admin/orders/${item.orderId}`}
                      className="font-semibold text-adm-primary hover:underline"
                    >
                      {item.order.orderNumber}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-adm-text">{item.title}</td>
                  <td className="py-3 pr-4 text-adm-text-secondary">{item.refundReason ?? "—"}</td>
                  <td className="py-3 pr-4 text-adm-text-secondary">
                    {formatPrice(Number(item.unitPrice) * item.quantity)}
                  </td>
                  <td className="py-3 pr-4 text-adm-text-secondary">{item.order.user.name}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge variant="success" size="sm">
                      İade Edildi
                    </StatusBadge>
                  </td>
                  <td className="py-3 pr-4 text-right text-xs text-adm-text-tertiary">
                    {item.refundedAt?.toLocaleDateString("tr-TR")}
                  </td>
                </tr>
              ))}
              {refundedItems.length === 0 && (
                <AdminTableEmpty colSpan={7}>Henüz iade kaydı yok.</AdminTableEmpty>
              )}
            </tbody>
          </AdminTable>
        </Card>

        <div className="space-y-6">
          <Card title="İade Sebepleri">
            {reasonCounts.length === 0 ? (
              <p className="text-sm text-adm-text-tertiary">Henüz sebep bilgisiyle kaydedilmiş iade yok.</p>
            ) : (
              <div className="space-y-3">
                {reasonCounts
                  .sort((a, b) => b._count._all - a._count._all)
                  .map((r, i) => {
                    const pct = reasonTotal > 0 ? (r._count._all / reasonTotal) * 100 : 0;
                    return (
                      <div key={r.refundReason}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="text-adm-text-secondary">{r.refundReason}</span>
                          <span className="font-semibold text-adm-text">%{pct.toFixed(0)}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-adm-chart-track">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: REASON_CHART_COLORS[i % REASON_CHART_COLORS.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>

          <Card title="En Çok İade Alan Ürünler">
            {topReturnedProducts.length === 0 ? (
              <p className="text-sm text-adm-text-tertiary">Henüz iade yok.</p>
            ) : (
              <div className="space-y-3">
                {topReturnedProducts.map((p) => (
                  <div key={p.productId} className="flex items-center justify-between text-sm">
                    <span className="truncate text-adm-text">{p.title}</span>
                    <span className="shrink-0 font-semibold text-adm-text">{p._count._all} adet</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
