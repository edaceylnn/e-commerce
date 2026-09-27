import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { SessionPayload } from "@/lib/auth";
import type { OrderListItem } from "@/lib/orders";
import { formatPrice } from "@/lib/format";
import { OrderCard } from "@/components/OrderCard";
import { OrderStatusText } from "@/components/account/OrderStatusText";
import { OrderTimeline } from "@/components/OrderTimeline";
import { PillLink } from "@/components/Pill";

// Account home, ordered by what a shopper usually comes here for: the state
// of their latest order (with a direct way into it), then their other recent
// orders, then their account details and shortcuts. Sections are separated
// by hairlines instead of boxed cards; the sidebar already links every
// account page, so there are no duplicate "go to X" buttons here.
function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line pt-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-caption uppercase tracking-eyebrow text-ink-soft">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const QUIET_LINK = "text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline";

export function AccountOverview({
  session,
  orders,
  stats,
}: {
  session: SessionPayload;
  orders: OrderListItem[];
  stats: {
    totalOrders: number;
    addressCount: number;
    wishlistCount: number;
    activeOrderCount: number;
  };
}) {
  const firstName = session.name.trim().split(/\s+/)[0] ?? session.name;
  const [latest, ...rest] = orders;
  const otherOrders = rest.slice(0, 2);

  return (
    <div className="space-y-10">
      <p className="font-display text-3xl">Merhaba, {firstName}</p>

      <Section
        title="Son sipariş"
        action={
          orders.length > 1 ? (
            <Link href="/account/orders" className={QUIET_LINK}>
              Tüm siparişler ({stats.totalOrders})
            </Link>
          ) : undefined
        }
      >
        {latest ? (
          <div className="flex gap-4 sm:gap-8">
            <Link
              href={`/account/orders/${latest.orderNumber}`}
              className="relative aspect-[3/4] w-20 shrink-0 self-start overflow-hidden bg-cream-deep sm:w-28"
              aria-hidden
              tabIndex={-1}
            >
              {latest.thumbnails[0] && (
                <Image src={latest.thumbnails[0]} alt="" fill sizes="(max-width: 640px) 80px, 112px" className="object-cover object-top" />
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <OrderStatusText status={latest.status} className="text-base" />
              <p className="mt-1 text-xs text-ink-soft">
                {latest.orderNumber} ·{" "}
                {latest.createdAt.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}{" "}
                · {latest.itemCount} ürün · {formatPrice(latest.total)}
              </p>
              <div className="mt-5">
                <OrderTimeline status={latest.status} />
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                <PillLink href={`/account/orders/${latest.orderNumber}`} className="!px-6 !py-3">
                  Siparişi görüntüle
                </PillLink>
                {latest.trackingNumber && latest.status !== "IPTAL" && (
                  <Link href={`/account/orders/${latest.orderNumber}#teslimat`} className={QUIET_LINK}>
                    Kargo takip
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-ink-soft">Henüz bir siparişiniz bulunmuyor.</p>
            <PillLink href="/products" variant="outline" className="!px-6 !py-3">
              Alışverişe başla
            </PillLink>
          </div>
        )}
      </Section>

      {otherOrders.length > 0 && (
        <Section title="Önceki siparişler">
          <div className="divide-y divide-line border-y border-line">
            {otherOrders.map((order) => (
              <OrderCard key={order.orderNumber} order={order} />
            ))}
          </div>
        </Section>
      )}

      <Section
        title="Hesap"
        action={
          <Link href="/account/profil" className={QUIET_LINK}>
            Bilgileri düzenle
          </Link>
        }
      >
        <dl className="divide-y divide-line border-y border-line text-sm">
          <Row label="Ad soyad" value={session.name} />
          <Row label="E-posta" value={session.email} />
          <Row
            label="Adresler"
            value={stats.addressCount > 0 ? `${stats.addressCount} kayıtlı adres` : "Kayıtlı adres yok"}
            href="/account/adresler"
            linkLabel="Adreslerim"
          />
          <Row
            label="Favoriler"
            value={stats.wishlistCount > 0 ? `${stats.wishlistCount} ürün` : "Henüz favori yok"}
            href="/account/favoriler"
            linkLabel="Favorilerim"
          />
        </dl>
      </Section>
    </div>
  );
}

function Row({
  label,
  value,
  href,
  linkLabel,
}: {
  label: string;
  value: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-3">
      <dt className="w-24 shrink-0 text-ink-soft">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{value}</dd>
      {href && (
        <dd>
          <Link href={href} className={QUIET_LINK}>
            {linkLabel}
          </Link>
        </dd>
      )}
    </div>
  );
}
