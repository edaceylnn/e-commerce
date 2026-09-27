import Link from "next/link";
import { prisma } from "@/lib/db";
import { ALL_ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/order-status";
import { PageHeader } from "@/components/admin/PageHeader";
import { PageTabs } from "@/components/admin/PageTabs";
import { FilterToolbar } from "@/components/admin/FilterToolbar";
import { FilterSelect } from "@/components/admin/FilterSelect";
import { Input } from "@/components/admin/Input";
import { SearchInput } from "@/components/admin/SearchInput";
import { KpiCard } from "@/components/admin/KpiCard";
import { AdminButton, AdminButtonLink } from "@/components/admin/Button";
import { AdminOrdersTable } from "@/components/AdminOrdersTable";
import { formatPrice } from "@/lib/format";
import { DownloadIcon } from "@/components/icons/AdminLuxeIcons";
import type { Prisma } from "@/generated/prisma/client";

const PAGE_SIZE = 25;

function isOrderStatus(value: string): value is (typeof ALL_ORDER_STATUSES)[number] {
  return (ALL_ORDER_STATUSES as readonly string[]).includes(value);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    payment?: string;
    q?: string;
    dateFrom?: string;
    dateTo?: string;
    minTotal?: string;
    maxTotal?: string;
    page?: string;
  }>;
}) {
  const { status, payment, q, dateFrom, dateTo, minTotal, maxTotal, page: pageParam } =
    await searchParams;
  const statusFilter = status && isOrderStatus(status) ? status : undefined;
  const paymentFilter = payment === "paid" || payment === "unpaid" ? payment : undefined;

  const baseWhere: Prisma.OrderWhereInput = {};
  if (paymentFilter === "paid") baseWhere.paidAt = { not: null };
  if (paymentFilter === "unpaid") baseWhere.paidAt = null;
  if (q?.trim()) {
    baseWhere.OR = [
      { orderNumber: { contains: q.trim(), mode: "insensitive" } },
      { user: { name: { contains: q.trim(), mode: "insensitive" } } },
    ];
  }
  if (dateFrom || dateTo) {
    baseWhere.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999`) } : {}),
    };
  }
  if (minTotal || maxTotal) {
    baseWhere.total = {
      ...(minTotal ? { gte: Number(minTotal) } : {}),
      ...(maxTotal ? { lte: Number(maxTotal) } : {}),
    };
  }
  const where: Prisma.OrderWhereInput = {
    ...baseWhere,
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const [
    matchingCount,
    baseCount,
    statusCounts,
    totalCount,
    preparingCount,
    pendingPaymentCount,
    shippedCount,
    paidAggregate,
  ] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.count({ where: baseWhere }),
    prisma.order.groupBy({ by: ["status"], where: baseWhere, _count: { _all: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "HAZIRLANIYOR" } }),
    prisma.order.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.order.count({ where: { status: "KARGOLANDI" } }),
    prisma.order.aggregate({
      where: { paidAt: { not: null } },
      _sum: { total: true },
      _avg: { total: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(matchingCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);

  const orders = await prisma.order.findMany({
    where,
    include: { user: true, items: true },
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  function viewHref(nextStatus?: string) {
    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);
    if (paymentFilter) params.set("payment", paymentFilter);
    if (q) params.set("q", q);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (minTotal) params.set("minTotal", minTotal);
    if (maxTotal) params.set("maxTotal", maxTotal);
    const qs = params.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  }

  function pageHref(page: number) {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (paymentFilter) params.set("payment", paymentFilter);
    if (q) params.set("q", q);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (minTotal) params.set("minTotal", minTotal);
    if (maxTotal) params.set("maxTotal", maxTotal);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  }

  const hasToolbarFilters = Boolean(q || paymentFilter || dateFrom || dateTo || minTotal || maxTotal);
  const clearFiltersHref = statusFilter ? `/admin/orders?status=${statusFilter}` : "/admin/orders";
  const statusCountMap = new Map(statusCounts.map((s) => [s.status, s._count._all]));

  const exportParams = new URLSearchParams();
  if (statusFilter) exportParams.set("status", statusFilter);
  if (paymentFilter) exportParams.set("payment", paymentFilter);
  if (q) exportParams.set("q", q);
  if (dateFrom) exportParams.set("dateFrom", dateFrom);
  if (dateTo) exportParams.set("dateTo", dateTo);
  if (minTotal) exportParams.set("minTotal", minTotal);
  if (maxTotal) exportParams.set("maxTotal", maxTotal);

  return (
    <div>
      <PageHeader
        eyebrow="Satış"
        title="Siparişler"
        meta={new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
        actions={
          <AdminButtonLink variant="secondary" href={`/api/admin/orders/export?${exportParams.toString()}`}>
            <DownloadIcon className="h-4 w-4" />
            Dışa Aktar
          </AdminButtonLink>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Toplam sipariş" value={totalCount.toLocaleString("tr-TR")} />
        <KpiCard
          label="Hazırlanıyor"
          value={preparingCount.toLocaleString("tr-TR")}
          note={`${pendingPaymentCount} ödeme bekliyor`}
        />
        <KpiCard label="Kargoda" value={shippedCount.toLocaleString("tr-TR")} />
        <KpiCard label="Ciro" value={formatPrice(Number(paidAggregate._sum.total ?? 0))} note="ödenen siparişler" />
        <KpiCard
          label="Ort. sepet"
          value={formatPrice(Number(paidAggregate._avg.total ?? 0))}
        />
      </div>

      <PageTabs
        tabs={[
          { href: viewHref(undefined), label: "Tümü", count: baseCount, active: !statusFilter },
          ...ALL_ORDER_STATUSES.map((s) => ({
            href: viewHref(s),
            label: ORDER_STATUS_LABELS[s],
            count: statusCountMap.get(s) ?? 0,
            active: statusFilter === s,
          })),
        ]}
      />

      <form method="get" className="mb-6 flex flex-wrap items-center gap-3">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <FilterToolbar
          className="mb-0 w-full"
          resultLabel={
            <>
              <strong className="font-semibold text-adm-text">{matchingCount}</strong> sipariş gösteriliyor
            </>
          }
        >
        <SearchInput
          name="q"
          defaultValue={q ?? ""}
          placeholder="Sipariş ara"
          containerClassName="min-w-64 flex-1"
        />
        <FilterSelect name="payment" defaultValue={paymentFilter ?? ""}>
          <option value="">Tüm ödemeler</option>
          <option value="paid">Ödendi</option>
          <option value="unpaid">Ödeme bekliyor</option>
        </FilterSelect>
        <Input type="date" name="dateFrom" defaultValue={dateFrom ?? ""} aria-label="Başlangıç tarihi" />
        <Input type="date" name="dateTo" defaultValue={dateTo ?? ""} aria-label="Bitiş tarihi" />
        <Input
          type="number"
          name="minTotal"
          defaultValue={minTotal ?? ""}
          placeholder="Min tutar"
          containerClassName="w-28"
        />
        <Input
          type="number"
          name="maxTotal"
          defaultValue={maxTotal ?? ""}
          placeholder="Max tutar"
          containerClassName="w-28"
        />
        <AdminButton type="submit" size="sm">
          Filtrele
        </AdminButton>
        {hasToolbarFilters && (
          <Link
            href={clearFiltersHref}
            className="text-sm font-medium text-adm-text-secondary underline-offset-2 transition hover:text-adm-text hover:underline"
          >
            Filtreleri Temizle
          </Link>
        )}
        </FilterToolbar>
      </form>

      <AdminOrdersTable
        orders={orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.user.name,
          thumbnails: order.items
            .slice(0, 4)
            .map((item) => ({ id: item.id, url: item.thumbnail, title: item.title })),
          extraItemCount: Math.max(0, order.items.length - 4),
          createdAtLabel: order.createdAt.toLocaleDateString("tr-TR"),
          paidAt: order.paidAt,
          status: order.status,
          refundedAt: order.refundedAt,
          total: Number(order.total),
        }))}
      />

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={pageHref(p)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                p === currentPage
                  ? "bg-adm-primary text-white"
                  : "border border-adm-border text-adm-text-secondary hover:border-adm-primary"
              }`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
