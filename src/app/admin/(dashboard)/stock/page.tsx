import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/admin/Card";
import { KpiCard } from "@/components/admin/KpiCard";
import {
  Table,
  TableHeader,
  TableHeadRow,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmptyState,
} from "@/components/admin/Table";
import { StatusBadge, type StatusBadgeVariant } from "@/components/admin/StatusBadge";
import { WarningTriangleIcon } from "@/components/icons/AdminLuxeIcons";
import { PageTabs } from "@/components/admin/PageTabs";
import { AdminThresholdEditor } from "@/components/AdminThresholdEditor";
import { effectiveLowStockThreshold, isCriticalStock } from "@/lib/stock";

// A single implicit stock pool — this catalog has no multi-warehouse model
// (see AdminProductsTable's own note on the same gap). Shown as a constant
// "Ana Depo" per row rather than inventing a fake multi-location split, so
// the DEPO column the design deck's mockup shows still has real, honest
// content instead of being dropped.
const WAREHOUSE_LABEL = "Ana Depo";

function stockState(
  stock: number,
  threshold: number
): { variant: StatusBadgeVariant; label: string; fillPct: number } {
  if (stock === 0) return { variant: "danger", label: "Tükendi", fillPct: 0 };
  if (isCriticalStock(stock, threshold)) {
    return { variant: "warning", label: "Kritik", fillPct: threshold > 0 ? Math.min(100, (stock / threshold) * 100) : 20 };
  }
  return { variant: "success", label: "Yeterli", fillPct: 100 };
}

// Stock state filters — the critical / out-of-stock lists live here as
// tabs, not on a page of their own: one table, one place to act from.
const FILTERS = [
  { key: undefined, label: "Tümü" },
  { key: "kritik", label: "Kritik" },
  { key: "tukenen", label: "Tükenen" },
] as const;

// Suggested reorder = enough to climb back over the threshold, plus two
// more weeks of expected sales at the last 30 days' daily rate.
function suggestReorder(stock: number, threshold: number, unitsSoldLast30Days: number) {
  return Math.max(threshold - stock, 0) + Math.ceil((unitsSoldLast30Days / 30) * 14);
}

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const { durum } = await searchParams;
  const [variants, simpleProducts, reservedRows, salesRows] = await Promise.all([
    prisma.productVariant.findMany({
      include: { product: { select: { title: true, price: true, lowStockThreshold: true } }, color: true, size: true },
      orderBy: { stock: "asc" },
    }),
    // "Rezerve" — units already committed to a paid order that's being
    // prepared but hasn't shipped yet. A real, computable stand-in for the
    // deck's REZERVE column (this catalog has no separate reservation
    // ledger, so it's derived from order state instead of stored).
    // Products sold without variants keep their stock on the product row.
    prisma.product.findMany({
      where: { variants: { none: {} } },
      select: { id: true, title: true, price: true, stock: true, lowStockThreshold: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId", "variantId"],
      where: { order: { status: "HAZIRLANIYOR" } },
      _sum: { quantity: true },
    }),
    // Last 30 days of sales per line — the input to the reorder suggestion.
    prisma.$queryRaw<{ productId: number; variantId: string | null; units: bigint }[]>`
      SELECT oi."productId", oi."variantId", SUM(oi.quantity)::bigint AS units
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."paidAt" >= NOW() - INTERVAL '30 days'
      GROUP BY oi."productId", oi."variantId"
    `,
  ]);

  const lineKey = (productId: number, variantId: string | null) => variantId ?? `product-${productId}`;
  const reservedMap = new Map(reservedRows.map((r) => [lineKey(r.productId, r.variantId), r._sum.quantity ?? 0]));
  const salesMap = new Map(salesRows.map((r) => [lineKey(r.productId, r.variantId), Number(r.units)]));

  const rows = [
    ...variants.map((v) => {
      const threshold = effectiveLowStockThreshold(v.product.lowStockThreshold, v.lowStockThreshold);
      return {
        id: v.id,
        productId: v.productId,
        title: v.product.title,
        variantLabel: `${v.color.name} · ${v.size.label} · ${v.sku}`,
        stock: v.stock,
        threshold,
        // Variant thresholds can be cleared back to "inherit the product's".
        thresholdRaw: v.lowStockThreshold,
        thresholdEndpoint: `/api/admin/product-variants/${v.id}`,
        thresholdNullable: true,
        price: Number(v.product.price),
      };
    }),
    ...simpleProducts.map((p) => ({
      id: `product-${p.id}`,
      productId: p.id,
      title: p.title,
      variantLabel: "Varyantsız ürün",
      stock: p.stock,
      threshold: p.lowStockThreshold,
      thresholdRaw: p.lowStockThreshold as number | null,
      thresholdEndpoint: `/api/admin/products/${p.id}/threshold`,
      thresholdNullable: false,
      price: Number(p.price),
    })),
  ]
    .map((r) => ({
      ...r,
      ...stockState(r.stock, r.threshold),
      reserved: reservedMap.get(r.id) ?? 0,
      suggestedQty: suggestReorder(r.stock, r.threshold, salesMap.get(r.id) ?? 0),
    }))
    .sort((a, b) => a.stock - b.stock);

  const totalVariants = rows.length;
  const criticalRows = rows.filter((r) => r.label === "Kritik");
  const outOfStockRows = rows.filter((r) => r.label === "Tükendi");
  const stockValue = rows.reduce((sum, r) => sum + r.price * r.stock, 0);
  const alertRows = [...criticalRows, ...outOfStockRows];
  const visibleRows =
    durum === "kritik" ? criticalRows : durum === "tukenen" ? outOfStockRows : rows;
  const activeFilter = durum === "kritik" || durum === "tukenen" ? durum : undefined;

  return (
    <div>
      <PageHeader
        title="Stok Durumu"
        meta={`1 depo · ${totalVariants.toLocaleString("tr-TR")} kalem izleniyor`}
      />

      {alertRows.length > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-adm-border bg-adm-warning-soft/60 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-adm-warning text-white">
            <WarningTriangleIcon className="h-4 w-4" />
          </span>
          <p className="text-sm text-adm-text">
            <strong className="font-semibold">{criticalRows.length} varyant</strong> kritik stok seviyesinde
            {outOfStockRows.length > 0 && (
              <>
                {" "}
                · <strong className="font-semibold">{outOfStockRows.length} varyant</strong> tükendi
              </>
            )}
            . Stoklar tükenmeden tedarik planlayın.
          </p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Toplam kalem" value={totalVariants.toLocaleString("tr-TR")} />
        <KpiCard label="Kritik stok" value={String(criticalRows.length)} />
        <KpiCard label="Tükenen" value={String(outOfStockRows.length)} />
        <KpiCard label="Stok değeri" value={formatPrice(stockValue)} />
      </div>

      <PageTabs
        tabs={FILTERS.map(({ key, label }) => ({
          href: key ? `/admin/stock?durum=${key}` : "/admin/stock",
          label,
          count: key === "kritik" ? criticalRows.length : key === "tukenen" ? outOfStockRows.length : rows.length,
          active: activeFilter === key,
        }))}
      />

      <Card padding="sm">
        <Table minWidth="1000px" embedded>
          <TableHeader>
            <TableHeadRow>
              <TableHead>Varyant</TableHead>
              <TableHead>Depo</TableHead>
              <TableHead align="right">Mevcut</TableHead>
              <TableHead align="right">Rezerve</TableHead>
              <TableHead>Eşik</TableHead>
              <TableHead>Doluluk</TableHead>
              <TableHead align="right">Önerilen Sipariş</TableHead>
              <TableHead />
            </TableHeadRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="text-[13px] font-semibold text-adm-text">{row.title}</p>
                  <p className="text-xs text-adm-text-tertiary">{row.variantLabel}</p>
                </TableCell>
                <TableCell className="text-adm-text-secondary">{WAREHOUSE_LABEL}</TableCell>
                <TableCell align="right" className="font-semibold text-adm-text">
                  {row.stock}
                </TableCell>
                <TableCell align="right" className="text-adm-text-secondary">
                  {row.reserved}
                </TableCell>
                <TableCell>
                  <AdminThresholdEditor
                    endpoint={row.thresholdEndpoint}
                    value={row.thresholdRaw}
                    effectiveValue={row.threshold}
                    nullable={row.thresholdNullable}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-adm-chart-track">
                      <div
                        className={`h-full rounded-full ${
                          row.variant === "danger"
                            ? "bg-adm-danger"
                            : row.variant === "warning"
                              ? "bg-adm-warning"
                              : "bg-adm-success"
                        }`}
                        style={{ width: `${row.fillPct}%` }}
                      />
                    </div>
                    <StatusBadge variant={row.variant} size="sm" showDot={false}>
                      {row.label}
                    </StatusBadge>
                  </div>
                </TableCell>
                <TableCell align="right" className="text-adm-text-secondary">
                  {row.label === "Yeterli" ? "—" : `+${row.suggestedQty} adet`}
                </TableCell>
                <TableCell align="right">
                  <Link
                    href={`/admin/products/${row.productId}/edit`}
                    className="text-xs font-semibold text-adm-primary hover:underline"
                  >
                    Stok Güncelle
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {visibleRows.length === 0 && (
              <TableEmptyState colSpan={8}>
                {activeFilter ? "Bu durumda stok yok — her şey yolunda." : "Henüz ürün yok."}
              </TableEmptyState>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
