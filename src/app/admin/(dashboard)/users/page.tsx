import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminUsersTable } from "@/components/AdminUsersTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { KpiCard } from "@/components/admin/KpiCard";
import { PageTabs } from "@/components/admin/PageTabs";
import { isVipCustomer } from "@/lib/customer-tiers";
import { getSettings } from "@/lib/settings";
import type { CustomerSegment } from "@/components/AdminUsersTable";

// A customer counts as churn-risk once they've ordered before but nothing
// in the last 90 days — the same lookback window used for the storefront's
// "win back" marketing segment, kept here as the one definition of "at
// risk" rather than inventing a second threshold for this screen only.
const CHURN_RISK_DAYS = 90;

function daysSince(date: Date): number {
  return (Date.now() - date.getTime()) / 86_400_000;
}

export function customerSegment(row: {
  isVip: boolean;
  orderCount: number;
  isNewThisMonth: boolean;
  lastOrderAt: Date | null;
}): CustomerSegment {
  if (row.isVip) return "VIP";
  if (row.orderCount > 0 && row.lastOrderAt && daysSince(row.lastOrderAt) > CHURN_RISK_DAYS) return "Riskli";
  if (row.isNewThisMonth) return "Yeni";
  if (row.orderCount >= 2) return "Sadık";
  return "Standart";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ segment?: string }>;
}) {
  const session = await requireAdmin();
  const { segment } = await searchParams;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [users, orderCounts, spendSums, lastOrderRows, refundedItems, settings] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.order.groupBy({ by: ["userId"], _count: { _all: true } }),
    prisma.order.groupBy({
      by: ["userId"],
      _sum: { total: true },
      where: { paidAt: { not: null } },
    }),
    prisma.order.groupBy({ by: ["userId"], _max: { createdAt: true } }),
    prisma.orderItem.findMany({
      where: { refundedAt: { not: null } },
      select: { order: { select: { userId: true } } },
    }),
    getSettings(),
  ]);

  const vipSpendThreshold = Number(settings.vipSpendThreshold);
  const countMap = new Map(orderCounts.map((o) => [o.userId, o._count._all]));
  const spendMap = new Map(spendSums.map((s) => [s.userId, Number(s._sum.total ?? 0)]));
  const lastOrderMap = new Map(lastOrderRows.map((r) => [r.userId, r._max.createdAt]));
  const returnCountMap = new Map<string, number>();
  for (const item of refundedItems) {
    const uid = item.order.userId;
    returnCountMap.set(uid, (returnCountMap.get(uid) ?? 0) + 1);
  }

  const allRows = users.map((user) => {
    const orderCount = countMap.get(user.id) ?? 0;
    const totalSpent = spendMap.get(user.id) ?? 0;
    const isVip = isVipCustomer(user.role, totalSpent, vipSpendThreshold);
    const isNewThisMonth = user.createdAt >= monthStart;
    const lastOrderAt = lastOrderMap.get(user.id) ?? null;
    const row = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAtLabel: user.createdAt.toLocaleDateString("tr-TR"),
      orderCount,
      returnCount: returnCountMap.get(user.id) ?? 0,
      totalSpent,
      isVip,
      isNewThisMonth,
      lastOrderAt,
      lastOrderLabel: lastOrderAt ? lastOrderAt.toLocaleDateString("tr-TR") : "—",
    };
    return { ...row, segment: customerSegment(row) };
  });

  const customerRows = allRows.filter((r) => r.role === "CUSTOMER");
  const spendingCustomers = customerRows.filter((r) => r.totalSpent > 0);
  const repeatCustomers = customerRows.filter((r) => r.orderCount > 1);
  const repeatRate = spendingCustomers.length ? (repeatCustomers.length / spendingCustomers.length) * 100 : 0;
  const lifetimeValue =
    spendingCustomers.reduce((sum, r) => sum + r.totalSpent, 0) / (spendingCustomers.length || 1);
  const churnRiskCount = customerRows.filter((r) => r.segment === "Riskli").length;

  const SEGMENT_FILTERS: { key?: string; label: string }[] = [
    { key: undefined, label: "Tüm Müşteriler" },
    { key: "vip", label: "VIP" },
    { key: "sadik", label: "Sadık" },
    { key: "yeni", label: "Yeni" },
    { key: "riskli", label: "Riskli" },
  ];
  const SEGMENT_KEY: Record<string, CustomerSegment> = {
    vip: "VIP",
    sadik: "Sadık",
    yeni: "Yeni",
    riskli: "Riskli",
  };

  const filteredRows = allRows.filter((r) => {
    if (segment && SEGMENT_KEY[segment]) return r.segment === SEGMENT_KEY[segment];
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Müşteriler"
        meta={`${customerRows.length.toLocaleString("tr-TR")} kayıtlı müşteri · %${repeatRate.toFixed(0)} tekrar eden alıcı`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Toplam müşteri" value={customerRows.length.toLocaleString("tr-TR")} />
        <KpiCard label="Tekrar eden" value={`%${repeatRate.toFixed(0)}`} />
        <KpiCard label="Yaşam boyu değer" value={new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(lifetimeValue)} />
        <KpiCard label="Churn riski" value={String(churnRiskCount)} note={`${CHURN_RISK_DAYS} gündür sipariş yok`} />
      </div>

      <PageTabs
        tabs={SEGMENT_FILTERS.map(({ key, label }) => ({
          href: key ? `/admin/users?segment=${key}` : "/admin/users",
          label,
          count: key ? allRows.filter((r) => r.segment === SEGMENT_KEY[key]).length : allRows.length,
          active: key ? segment === key : !segment || !SEGMENT_KEY[segment],
        }))}
      />

      <AdminUsersTable users={filteredRows} currentUserId={session!.userId} />
    </div>
  );
}
