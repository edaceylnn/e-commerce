import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import type { OrderDetail } from "@/lib/orders";
import { paymentStatusLabel, isOrderCancelable } from "@/lib/orders";
import { formatDeliveryWindow, formatPrice } from "@/lib/format";
import { OrderStatusText } from "@/components/account/OrderStatusText";
import { OrderTimeline } from "@/components/OrderTimeline";
import { ReorderButton } from "@/components/ReorderButton";
import { CancelOrderButton } from "@/components/CancelOrderButton";
import { ShipmentTracking } from "@/components/ShipmentTracking";

// Order detail, top to bottom in the order a shopper reads it: status and
// date, progress, the items, the amount, then delivery and payment. Sections
// are separated by hairlines rather than boxed cards. Cancelling is kept
// apart at the very bottom so it never sits among routine actions.
function Section({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-6">
      <h2 className="mb-4 text-caption uppercase tracking-eyebrow text-ink-soft">{title}</h2>
      {children}
    </section>
  );
}

function Line({ label, value, strong = false }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={strong ? "font-medium" : ""}>{value}</dd>
    </div>
  );
}

export function OrderDetailView({ order }: { order: OrderDetail }) {
  // Only a rough estimate for orders still in flight — once delivered or
  // cancelled, showing a computed "ETA" would be misleading, not helpful.
  const showEstimate = order.status === "HAZIRLANIYOR" || order.status === "KARGOLANDI";
  const date = order.createdAt.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-10">
      <header>
        <Link href="/account/orders" className="text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline">
          ← Siparişlerim
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 className="font-light tracking-title text-3xl">{order.orderNumber}</h2>
            <p className="mt-1 text-sm text-ink-soft">{date}</p>
          </div>
          <OrderStatusText status={order.status} className="text-base" />
        </div>
        <div className="mt-8">
          <OrderTimeline status={order.status} />
        </div>
      </header>

      <Section title={`Ürünler (${order.items.reduce((n, i) => n + i.quantity, 0)})`}>
        <ul className="divide-y divide-line border-y border-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-4">
              <Link
                href={`/products/${item.productId}`}
                className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden bg-cream-deep"
              >
                <Image src={item.thumbnail} alt={item.title} fill sizes="64px" className="object-cover object-top" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-wrap justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <Link href={`/products/${item.productId}`} className="text-sm font-medium hover:underline hover:underline-offset-4">
                    {item.title}
                  </Link>
                  {(item.variantLabel || item.sku) && (
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {item.variantLabel}
                      {item.variantLabel && item.sku ? " · " : ""}
                      {item.sku}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {item.quantity} × {formatPrice(item.unitPrice)}
                  </p>
                </div>
                <p className="text-sm">{formatPrice(item.unitPrice * item.quantity)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tutar">
        <dl className="space-y-2 text-sm sm:max-w-sm sm:ml-auto">
          <Line label="Ara toplam" value={formatPrice(order.subtotal)} />
          {order.discountTotal > 0 && <Line label="İndirim" value={`−${formatPrice(order.discountTotal)}`} />}
          <Line label="Kargo" value={order.shippingCost === 0 ? "Ücretsiz" : formatPrice(order.shippingCost)} />
          <div className="flex items-baseline justify-between border-t border-ink pt-3">
            <dt className="font-medium">Genel toplam</dt>
            <dd className="font-light tracking-title text-3xl leading-none">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </Section>

      {order.shipment && (
        <Section title="Kargo takibi" id="kargo">
          <ShipmentTracking shipment={order.shipment} />
        </Section>
      )}

      <div className="grid gap-10 sm:grid-cols-2 sm:gap-8">
        <Section title="Teslimat" id="teslimat">
          <p className="text-sm font-medium">{order.shippingAddress.fullName}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}
            <br />
            {order.shippingAddress.district}/{order.shippingAddress.city}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{order.shippingAddress.phone}</p>
          <dl className="mt-4 space-y-1.5 text-sm">
            {showEstimate && (
              <Line label="Tahmini teslimat" value={formatDeliveryWindow(order.createdAt, 3, 6)} strong />
            )}
          </dl>
        </Section>

        <Section title="Fatura ve ödeme">
          {order.sameAddress ? (
            <p className="text-sm text-ink-soft">Fatura adresi teslimat adresiyle aynı.</p>
          ) : (
            <>
              <p className="text-sm font-medium">{order.billingAddress.fullName}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {order.billingAddress.line1}
                {order.billingAddress.line2 ? `, ${order.billingAddress.line2}` : ""}
                <br />
                {order.billingAddress.district}/{order.billingAddress.city}
              </p>
            </>
          )}
          <dl className="mt-4 space-y-1.5 text-sm">
            <Line label="Ödeme yöntemi" value="Kredi/Banka Kartı" strong />
            <Line label="Ödeme durumu" value={paymentStatusLabel(order.paidAt, order.status)} strong />
          </dl>
          {order.invoices.length > 0 && (
            <ul className="mt-4 space-y-1.5 text-sm">
              {order.invoices.map((inv) => (
                <li key={inv.id}>
                  <a
                    href={`/fatura/${inv.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4 hover:text-ink-soft"
                  >
                    {inv.type === "SALE" ? "Faturayı görüntüle" : "İade faturası"} ({inv.number})
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-6">
        {order.status !== "IPTAL" && (
          <ReorderButton
            items={order.items.map((i) => ({
              id: i.productId,
              variantId: i.variantId,
              title: i.title,
              thumbnail: i.thumbnail,
              price: i.unitPrice,
              quantity: i.quantity,
            }))}
          />
        )}
        <Link href="/iletisim" className="text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline">
          Bu siparişle ilgili destek al
        </Link>
      </div>

      {isOrderCancelable(order.status) && (
        <section className="border-t border-line pt-6">
          <h2 className="text-caption uppercase tracking-eyebrow text-ink-soft">Siparişi iptal et</h2>
          <p className="mt-2 max-w-md text-sm text-ink-soft">
            Siparişiniz kargoya verilmeden önce iptal edebilirsiniz. Bu işlem geri alınamaz.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CancelOrderButton orderNumber={order.orderNumber} />
          </div>
        </section>
      )}
    </div>
  );
}
