import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminTable, AdminTableEmpty } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminNewStockMovementButton } from "@/components/AdminNewStockMovementButton";
import { AdminButton } from "@/components/admin/Button";
import { FilterSelect } from "@/components/admin/FilterSelect";
import { SearchInput } from "@/components/admin/SearchInput";
import { getRangeConfig, type RangeKey } from "@/lib/date-ranges";
import { STOCK_MOVEMENT_TYPE_LABELS } from "@/lib/stockMovements";
import type { Prisma, StockMovementType } from "@/generated/prisma/client";

const ALL_TYPES = Object.keys(STOCK_MOVEMENT_TYPE_LABELS) as StockMovementType[];
const RANGE_OPTIONS: { value: RangeKey | ""; label: string }[] = [
  { value: "", label: "Tüm zamanlar" },
  { value: "today", label: "Bugün" },
  { value: "7d", label: "Son 7 Gün" },
  { value: "30d", label: "Son 30 Gün" },
  { value: "year", label: "Bu Yıl" },
];

function isStockMovementType(value: string): value is StockMovementType {
  return (ALL_TYPES as string[]).includes(value);
}

export default async function AdminStockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; range?: string }>;
}) {
  const { q, type, range } = await searchParams;
  const typeFilter = type && isStockMovementType(type) ? type : undefined;
  const rangeFilter = range && ["today", "7d", "30d", "year"].includes(range) ? (range as RangeKey) : undefined;

  const where: Prisma.StockMovementWhereInput = {};
  if (typeFilter) where.type = typeFilter;
  if (rangeFilter) where.createdAt = { gte: getRangeConfig(rangeFilter).start };
  if (q?.trim()) {
    where.OR = [
      { product: { title: { contains: q.trim(), mode: "insensitive" } } },
      { variant: { sku: { contains: q.trim(), mode: "insensitive" } } },
    ];
  }

  const [movements, products] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, title: true } },
        variant: { include: { color: true, size: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.product.findMany({
      select: {
        id: true,
        title: true,
        variants: {
          select: { id: true, sku: true, color: { select: { name: true } }, size: { select: { label: true } } },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Stok Hareketleri"
          description="Her stok değişikliğinin nedenini ve izini tutan hareket defteri."
        />
        <AdminNewStockMovementButton
          products={products.map((p) => ({
            id: p.id,
            title: p.title,
            variants: p.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              label: `${v.size.label} / ${v.color.name}`,
            })),
          }))}
        />
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-center gap-3">
        <SearchInput
          name="q"
          defaultValue={q ?? ""}
          placeholder="Ürün adı veya SKU ara…"
          containerClassName="min-w-64 flex-1"
        />
        <FilterSelect name="type" defaultValue={typeFilter ?? ""}>
          <option value="">Tüm işlem tipleri</option>
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>
              {STOCK_MOVEMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect name="range" defaultValue={rangeFilter ?? ""}>
          {RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </FilterSelect>
        <AdminButton type="submit" size="sm">
          Filtrele
        </AdminButton>
      </form>

      <AdminTable>
        <thead>
          <tr className="border-b border-adm-border/30 text-xs font-medium uppercase tracking-wider text-adm-text-tertiary">
            <th className="px-4 py-3">Tarih/Saat</th>
            <th className="px-4 py-3">Ürün</th>
            <th className="px-4 py-3">Varyant / SKU</th>
            <th className="px-4 py-3">İşlem Tipi</th>
            <th className="px-4 py-3">Miktar</th>
            <th className="px-4 py-3">Önceki → Yeni</th>
            <th className="px-4 py-3">Kullanıcı</th>
            <th className="px-4 py-3">Açıklama</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-adm-border/15">
          {movements.map((m) => (
            <tr key={m.id} className="transition-colors hover:bg-adm-surface-secondary">
              <td className="px-4 py-3 text-sm text-adm-text-secondary">
                {m.createdAt.toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-adm-text">{m.product.title}</td>
              <td className="px-4 py-3 text-sm text-adm-text-secondary">
                {m.variant ? `${m.variant.size.label} / ${m.variant.color.name} — ${m.variant.sku}` : "—"}
              </td>
              <td className="px-4 py-3">
                <StatusBadge variant={m.quantity < 0 ? "danger" : "success"} size="sm">
                  {STOCK_MOVEMENT_TYPE_LABELS[m.type]}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 text-sm font-medium text-adm-text">
                {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
              </td>
              <td className="px-4 py-3 text-sm text-adm-text-secondary">
                {m.previousStock} → {m.newStock}
              </td>
              <td className="px-4 py-3 text-sm text-adm-text-secondary">{m.user?.name ?? "Sistem"}</td>
              <td className="px-4 py-3 text-sm text-adm-text-secondary">{m.note ?? "—"}</td>
            </tr>
          ))}
          {movements.length === 0 && <AdminTableEmpty colSpan={8}>Kayıtlı stok hareketi yok.</AdminTableEmpty>}
        </tbody>
      </AdminTable>
    </div>
  );
}
