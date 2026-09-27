import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { paymentStatusLabel, type OrderListItem } from "@/lib/orders";
import { OrderStatusText } from "@/components/account/OrderStatusText";
import { ReorderButton } from "@/components/ReorderButton";

// One order row — used on both the account overview and the full
// Siparişlerim list, so the two never drift. Hairline-separated by the list
// that renders it (no own frame). Actions are ranked: "Detayları gör" is the
// primary one; reorder/tracking are quiet secondary links. Cancelling lives
// on the order detail page, away from routine links.
export function OrderCard({ order }: { order: OrderListItem }) {
  const canTrack = !!order.trackingNumber && order.status !== "IPTAL";
  const detailHref = `/account/orders/${order.orderNumber}`;

  return (
    <div className="flex gap-4 py-5 sm:gap-5">
      <Link href={detailHref} className="flex shrink-0 gap-1.5" aria-hidden tabIndex={-1}>
        {order.thumbnails.slice(0, 2).map((src, i) => (
          <span key={i} className="relative aspect-[3/4] w-14 overflow-hidden bg-cream-deep sm:w-16">
            <Image src={src} alt="" fill sizes="64px" className="object-cover object-top" />
          </span>
        ))}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <OrderStatusText status={order.status} />
          <p className="font-mono text-sm">{formatPrice(order.total)}</p>
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          {order.orderNumber} ·{" "}
          {order.createdAt.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })} ·{" "}
          {order.itemCount} ürün · {paymentStatusLabel(order.paidAt, order.status)}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-3">
          <Link
            href={detailHref}
            className="text-xs font-semibold uppercase tracking-label text-ink underline underline-offset-4 hover:text-accent"
          >
            Detayları gör
          </Link>
          {canTrack && (
            <Link
              href={`${detailHref}#teslimat`}
              className="text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline"
            >
              Kargo takip
            </Link>
          )}
          {order.status !== "IPTAL" && <ReorderButton items={order.reorderItems} quiet />}
        </div>
      </div>
    </div>
  );
}
