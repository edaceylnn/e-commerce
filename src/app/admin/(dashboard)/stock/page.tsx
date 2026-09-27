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

export default async function AdminStockPage() {
  const [variants, reservedRows] = await Promise.all([
    prisma.productVariant.findMany({
      include: { product: { select: { title: true, price: true, lowStockThreshold: true } }, color: true, size: true },
      orderBy: { stock: "asc" },
    }),
    // "Rezerve" — units already committed to a paid order that's being
    // prepared but hasn't shipped yet. A real, computable stand-in for the
    // deck's REZERVE column (this catalog has no separate reservation
    // ledger, so it's derived from order state instead of stored).
    prisma.orderItem.groupBy({
      by: ["variantId"],
      where: { variantId: { not: null }, order: { status: "HAZIRLANIYOR" } },
      _sum: { quantity: true },
    }),
  ]);

  const reservedMap = new Map(reservedRows.map((r) => [r.variantId, r._sum.quantity ?? 0]));

  const rows = variants.map((v) => {
    const threshold = effectiveLowStockThreshold(v.product.lowStockThreshold, v.lowStockThreshold);
    const state = stockState(v.stock, threshold);
    return {
      id: v.id,
      productId: v.productId,
      title: v.product.title,
      variantLabel: `${v.color.name} · ${v.size.label}`,
      sku: v.sku,
      stock: v.stock,
      reserved: reservedMap.get(v.id) ?? 0,
      threshold,
      price: Number(v.product.price),
      ...state,
    };
  });

  const totalVariants = rows.length;
  const criticalRows = rows.filter((r) => r.label === "Kritik");
  const outOfStockRows = rows.filter((r) => r.label === "Tükendi");
  const stockValue = rows.reduce((sum, r) => sum + r.price * r.stock, 0);
  const alertRows = [...criticalRows, ...outOfStockRows];

  return (
    <div>
      <PageHeader
        eyebrow="Envanter"
        title="Stok"
        meta={`1 depo · ${totalVariants.toLocaleString("tr-TR")} varyant izleniyor`}
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
        <KpiCard label="Toplam varyant" value={totalVariants.toLocaleString("tr-TR")} />
        <KpiCard label="Kritik stok" value={String(criticalRows.length)} />
        <KpiCard label="Tükenen" value={String(outOfStockRows.length)} />
        <KpiCard label="Stok değeri" value={formatPrice(stockValue)} />
      </div>

      <Card padding="sm">
        <Table minWidth="900px" embedded>
          <TableHeader>
            <TableHeadRow>
              <TableHead>Varyant</TableHead>
              <TableHead>Depo</TableHead>
              <TableHead align="right">Mevcut</TableHead>
              <TableHead align="right">Rezerve</TableHead>
              <TableHead align="right">Eşik</TableHead>
              <TableHead>Doluluk</TableHead>
              <TableHead />
            </TableHeadRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <p className="text-[13px] font-semibold text-adm-text">{row.title}</p>
                  <p className="text-xs text-adm-text-tertiary">
                    {row.variantLabel} · {row.sku}
                  </p>
                </TableCell>
                <TableCell className="text-adm-text-secondary">{WAREHOUSE_LABEL}</TableCell>
                <TableCell align="right" className="font-semibold text-adm-text">
                  {row.stock}
                </TableCell>
                <TableCell align="right" className="text-adm-text-secondary">
                  {row.reserved}
                </TableCell>
                <TableCell align="right" className="text-adm-text-secondary">
                  {row.threshold}
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
            {rows.length === 0 && <TableEmptyState colSpan={7}>Henüz varyant yok.</TableEmptyState>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
