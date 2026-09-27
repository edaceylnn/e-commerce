import { getSession } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";
import { prisma } from "@/lib/db";
import { AccountClient } from "@/components/AccountClient";
import { AccountOverview } from "@/components/AccountOverview";

export default async function AccountPage() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-4xl">
          Hesabım
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Hesabınıza giriş yapın veya yeni bir hesap oluşturun.
        </p>
        <AccountClient />
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
