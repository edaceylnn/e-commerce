import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export type OrderSummaryData = {
  orderNumber: string;
  status: string;
  trackingNumber: string | null;
  subtotal: number;
  shippingCost: number;
  discountTotal: number;
  total: number;
  createdAt: Date;
  items: {
    id: string;
    title: string;
    thumbnail: string;
    unitPrice: number;
    quantity: number;
  }[];
  shippingAddress: {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    district: string;
  };
  billingAddress: {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    district: string;
  };
  sameAddress: boolean;
};

export function OrderSummary({ order }: { order: OrderSummaryData }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Sipariş No
          </p>
          <p className="font-display text-xl">{order.orderNumber}</p>
          {order.trackingNumber && (
            <p className="mt-1 text-xs text-ink-soft">
              Kargo Takip No: <span className="font-semibold">{order.trackingNumber}</span>
            </p>
          )}
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <ul className="divide-y divide-line">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden bg-cream-deep">
              <Image
                src={item.thumbnail}
                alt={item.title}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-semibold">{item.title}</p>
              <p className="text-ink-soft">
                {item.quantity} × {formatPrice(item.unitPrice)}
              </p>
            </div>
            <p className="text-sm font-semibold">
              {formatPrice(item.unitPrice * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <div className="space-y-1 border-t border-line pt-4 text-sm">
        <div className="flex justify-between text-ink-soft">
          <span>Ara toplam</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
        {order.discountTotal > 0 && (
          <div className="flex justify-between text-ink-soft">
            <span>İndirim</span>
            <span>-{formatPrice(order.discountTotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-ink-soft">
          <span>Kargo</span>
          <span>
            {order.shippingCost === 0 ? "Ücretsiz" : formatPrice(order.shippingCost)}
          </span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>Toplam</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border border-line p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {order.sameAddress ? "Teslimat & Fatura Adresi" : "Teslimat Adresi"}
          </p>
          <p className="mt-1 font-semibold">{order.shippingAddress.fullName}</p>
          <p className="text-ink-soft">
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""} —{" "}
            {order.shippingAddress.district}/{order.shippingAddress.city}
          </p>
        </div>

        {!order.sameAddress && (
          <div className="border border-line p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Fatura Adresi
            </p>
            <p className="mt-1 font-semibold">{order.billingAddress.fullName}</p>
            <p className="text-ink-soft">
              {order.billingAddress.line1}
              {order.billingAddress.line2 ? `, ${order.billingAddress.line2}` : ""} —{" "}
              {order.billingAddress.district}/{order.billingAddress.city}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
