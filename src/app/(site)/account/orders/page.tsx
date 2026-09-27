import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/order-status";
import { OrderCard } from "@/components/OrderCard";
import { AccountCard } from "@/components/account/AccountCard";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryLink } from "@/components/account/AccountButtons";
import { PackageIcon } from "@/components/icons/AccountIcons";

const PAGE_SIZE = 6;

const PERIODS = [
  { value: "", label: "Tüm zamanlar", days: null },
  { value: "30", label: "Son 30 gün", days: 30 },
  { value: "90", label: "Son 3 ay", days: 90 },
  { value: "365", label: "Son 1 yıl", days: 365 },
] as const;

export default async function AccountOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; period?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/account");
  }

  const { status, period, page: pageParam } = await searchParams;
  const allOrders = await getOrdersForUser(session.userId);

  let filtered = allOrders;
  if (status && ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
    filtered = filtered.filter((o) => o.status === status);
  }
  const periodDef = PERIODS.find((p) => p.value === period);
  if (periodDef?.days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDef.days);
    filtered = filtered.filter((o) => o.createdAt >= cutoff);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function buildHref(overrides: { status?: string; period?: string; page?: number }) {
    const params = new URLSearchParams();
    const nextStatus = overrides.status !== undefined ? overrides.status : status;
    const nextPeriod = overrides.period !== undefined ? overrides.period : period;
    if (nextStatus) params.set("status", nextStatus);
    if (nextPeriod) params.set("period", nextPeriod);
    const nextPage = overrides.page ?? currentPage;
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return `/account/orders${qs ? `?${qs}` : ""}`;
  }

  return (
    <AccountCard>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl">Siparişlerim</h2>
        {allOrders.length > 0 && (
          <form action="/account/orders" className="flex flex-wrap gap-2">
            <select
              name="status"
              defaultValue={status ?? ""}
              className="border border-line bg-background px-3 py-2 text-xs font-medium outline-none focus:border-ink"
            >
              <option value="">Tüm durumlar</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              name="period"
              defaultValue={period ?? ""}
              className="border border-line bg-background px-3 py-2 text-xs font-medium outline-none focus:border-ink"
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="border border-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-ink hover:text-background"
            >
              Filtrele
            </button>
          </form>
        )}
      </div>

      {allOrders.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="Henüz bir siparişiniz bulunmuyor."
          description="Alışverişe başladığınızda siparişleriniz burada listelenecek."
          action={<PrimaryLink href="/products">Alışverişe Başla</PrimaryLink>}
        />
      ) : paginated.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="Bu filtrelere uyan sipariş bulunamadı."
          action={
            <Link
              href="/account/orders"
              className="text-sm font-semibold text-primary underline underline-offset-4"
            >
              Filtreleri temizle
            </Link>
          }
        />
      ) : (
        <>
          <div className="mt-6 divide-y divide-line border-y border-line">
            {paginated.map((order) => (
              <OrderCard key={order.orderNumber} order={order} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={buildHref({ page: p })}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                    p === currentPage
                      ? "bg-primary text-cream"
                      : "border border-line hover:border-primary"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </nav>
          )}
        </>
      )}
    </AccountCard>
  );
}
