import { getSession } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";
import { prisma } from "@/lib/db";
import { AccountClient } from "@/components/AccountClient";
import { DEMO_ACCOUNTS, isDemoMode } from "@/lib/demo";
import { AccountOverview } from "@/components/AccountOverview";

export default async function AccountPage() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="page-x pt-20 tab:pt-28 [&>*]:mx-auto [&>*]:max-w-[440px]">
        <span className="text-caption uppercase tracking-eyebrow text-text-3">Hesabım</span>
        <h1 className="headline mt-3 text-[clamp(28px,2.6vw,38px)] leading-[1.1]">Hoş geldin</h1>
        <p className="mt-3 text-body font-light text-ink-soft">
          Siparişlerini, adreslerini ve favorilerini görmek için giriş yap ya da hesap oluştur.
        </p>
        <AccountClient demo={isDemoMode() ? DEMO_ACCOUNTS.customer : undefined} />
      </div>
    );
  }

  const [orders, addressCount, wishlistCount] = await Promise.all([
    getOrdersForUser(session.userId),
    prisma.address.count({ where: { userId: session.userId } }),
    prisma.wishlistItem.count({ where: { userId: session.userId } }),
  ]);

  const activeOrderCount = orders.filter(
    (o) => o.status === "HAZIRLANIYOR" || o.status === "KARGOLANDI"
  ).length;

  return (
    <AccountOverview
      session={session}
      orders={orders}
      stats={{
        totalOrders: orders.length,
        addressCount,
        wishlistCount,
        activeOrderCount,
      }}
    />
  );
}
