import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { AdminTable, AdminTableEmpty } from "@/components/admin/AdminTable";
import { AdminThresholdEditor } from "@/components/AdminThresholdEditor";
import { effectiveLowStockThreshold, isCriticalStock } from "@/lib/stock";

type Row = {
  key: string;
  productId: number;
  productTitle: string;
  variantLabel: string | null;
  stock: number;
  threshold: number;
  thresholdRaw: number | null;
  thresholdEndpoint: string;
  thresholdNullable: boolean;
  suggestedQty: number;
};

export default async function AdminCriticalStockPage() {
  const [products, salesRows] = await Promise.all([
    prisma.product.findMany({
      include: { variants: { include: { color: true, size: true } } },
      orderBy: { title: "asc" },
    }),
    // Last 30 days of sales velocity per line item — the input to the
    // "basit tahmin" (simple estimate) reorder suggestion below.
    prisma.$queryRaw<{ productId: number; variantId: string | null; units_sold: bigint }[]>`
      SELECT oi."productId", oi."variantId", SUM(oi.quantity)::bigint as units_sold
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."paidAt" >= NOW() - INTERVAL '30 days'
      GROUP BY oi."productId", oi."variantId"
    `,
  ]);

  const salesMap = new Map<string, number>();
  for (const row of salesRows) {
    salesMap.set(row.variantId ?? `product-${row.productId}`, Number(row.units_sold));
  }

  // Suggested reorder quantity = enough to climb back over the threshold,
  // plus two more weeks of expected sales at the last 30 days' daily rate.
  function suggestReorder(stock: number, threshold: number, unitsSoldLast30Days: number) {
    const dailyVelocity = unitsSoldLast30Days / 30;
    return Math.max(threshold - stock, 0) + Math.ceil(dailyVelocity * 14);
  }

  const rows: Row[] = [];
  for (const product of products) {
    if (product.variants.length > 0) {
      for (const v of product.variants) {
        const threshold = effectiveLowStockThreshold(product.lowStockThreshold, v.lowStockThreshold);
        if (!isCriticalStock(v.stock, threshold)) continue;
        rows.push({
          key: v.id,
          productId: product.id,
          productTitle: product.title,
          variantLabel: `${v.size.label} / ${v.color.name} — ${v.sku}`,
          stock: v.stock,
          threshold,
          thresholdRaw: v.lowStockThreshold,
          thresholdEndpoint: `/api/admin/product-variants/${v.id}`,
          thresholdNullable: true,
          suggestedQty: suggestReorder(v.stock, threshold, salesMap.get(v.id) ?? 0),
        });
      }
    } else if (isCriticalStock(product.stock, product.lowStockThreshold)) {
      rows.push({
        key: `product-${product.id}`,
        productId: product.id,
        productTitle: product.title,
        variantLabel: null,
        stock: product.stock,
        threshold: product.lowStockThreshold,
        thresholdRaw: product.lowStockThreshold,
        thresholdEndpoint: `/api/admin/products/${product.id}/threshold`,
        thresholdNullable: false,
        suggestedQty: suggestReorder(
          product.stock,
          product.lowStockThreshold,
          salesMap.get(`product-${product.id}`) ?? 0
        ),
      });
    }
  }
  rows.sort((a, b) => a.stock - b.stock);

  const affectedProducts = new Set(rows.map((r) => r.productId)).size;

  return (
    <div>
      <PageHeader
        title="Kritik Stok"
        description="Kritik eşiğin altına düşen ürün ve varyantlar — stok tükenmeden müdahale edin."
      />

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard label="Kritik Kalem" value={rows.length} href="/admin/stock/critical" accent="warning" />
        <StatCard label="Etkilenen Ürün" value={affectedProducts} href="/admin/products?stock=critical" />
      </div>

      <AdminTable>
        <thead>
          <tr className="border-b border-adm-border/30 text-xs font-medium uppercase tracking-wider text-adm-text-tertiary">
            <th className="px-4 py-3">Ürün</th>
            <th className="px-4 py-3">Varyant</th>
            <th className="px-4 py-3">Mevcut Stok</th>
            <th className="px-4 py-3">Kritik Eşik</th>
            <th className="px-4 py-3">Önerilen Sipariş</th>
            <th className="px-4 py-3 text-right">İşlem</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-adm-border/15">
          {rows.map((r) => (
            <tr key={r.key} className="transition-colors hover:bg-adm-surface-secondary">
              <td className="px-4 py-3 text-sm font-medium text-adm-text">{r.productTitle}</td>
              <td className="px-4 py-3 text-sm text-adm-text-secondary">{r.variantLabel ?? "—"}</td>
              <td className="px-4 py-3 text-sm font-medium text-adm-danger">{r.stock}</td>
              <td className="px-4 py-3">
                <AdminThresholdEditor
                  endpoint={r.thresholdEndpoint}
                  value={r.thresholdRaw}
                  effectiveValue={r.threshold}
                  nullable={r.thresholdNullable}
                />
              </td>
              <td className="px-4 py-3 text-sm text-adm-text-secondary">+{r.suggestedQty} adet</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/products/${r.productId}/edit`}
                  className="border border-adm-border bg-adm-surface-secondary px-3 py-1.5 text-sm font-medium text-adm-text transition hover:bg-adm-surface-secondary rounded-xl"
                >
                  Ürünü Düzenle
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <AdminTableEmpty colSpan={6}>Kritik seviyede stok yok — her şey yolunda.</AdminTableEmpty>
          )}
        </tbody>
      </AdminTable>
    </div>
  );
}
