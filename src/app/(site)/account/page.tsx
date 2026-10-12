import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getOrdersForUser } from "@/lib/orders";
import { prisma } from "@/lib/db";
import { AccountClient } from "@/components/AccountClient";
import { DEMO_ACCOUNTS, isDemoMode } from "@/lib/demo";
import { isPaymentSimulated } from "@/lib/iyzico";
import { AccountOverview } from "@/components/AccountOverview";

// Only same-site paths: "//evil.com" or "/\\evil.com" would leave the site.
function safeNext(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return undefined;
  }
  return value;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const session = await getSession();
  const next = safeNext((await searchParams).next);

  if (session && next) redirect(next);

  if (!session) {
    return (
      <div className="page-x pt-20 tab:pt-28 [&>*]:mx-auto [&>*]:max-w-[440px]">
        <span className="block text-caption uppercase tracking-eyebrow text-text-3">Hesabım</span>
        <h1 className="headline mt-3 text-[clamp(28px,2.6vw,38px)] leading-[1.1]">Hoş geldin</h1>
        <p className="mt-3 text-body font-light text-ink-soft">
          {next === "/checkout"
            ? "Siparişini tamamlamak için giriş yap ya da hesap oluştur. Sepetin seni bekliyor."
            : "Siparişlerini, adreslerini ve favorilerini görmek için giriş yap ya da hesap oluştur."}
        </p>
        <AccountClient next={next} demo={isDemoMode() ? DEMO_ACCOUNTS.customer : undefined} paymentSimulated={isPaymentSimulated()} />
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
