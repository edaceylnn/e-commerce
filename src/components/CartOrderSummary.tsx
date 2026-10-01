import Link from "next/link";
import type { ReactNode } from "react";
import { formatPrice } from "@/lib/format";
import { ArrowUUpLeftIcon, LockSimpleIcon, TruckIcon } from "@/components/icons/Ph";

// Design handoff → bag summary: small-caps title over a hairline, quiet
// rows, the free-shipping note, the promo field (owned by the cart page),
// then the estimated total, a 56px checkout button and reassurance lines.
// No box, no fill — it sits straight on the page.
export function CartOrderSummary({
  subtotal,
  discount,
  shippingCost,
  total,
  campaign,
  freeShippingRemaining,
  deliveryEstimate,
  coupon,
}: {
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  campaign?: {
    name: string;
    percentage?: number;
    scope?: string | null;
    /** Names of the cart products the campaign applied to. */
    products?: string[];
  } | null;
  freeShippingRemaining: number;
  deliveryEstimate: string;
  coupon: ReactNode;
}) {
  return (
    <section aria-labelledby="order-summary-title">
      {/* tab:h-24 matches the cart heading block beside it (see cart page). */}
      <h2
        id="order-summary-title"
        className="border-b border-line-strong pb-5 text-body-sm uppercase tracking-eyebrow tab:flex tab:h-24 tab:items-end"
      >
        Sipariş Özeti
      </h2>

      <dl className="flex flex-col gap-3 py-6 text-card">
        <div className="flex justify-between">
          <dt>Ara toplam</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        {discount > 0 && (
          <div>
            <div className="flex justify-between">
              <dt>İndirim</dt>
              <dd className="text-sale">−{formatPrice(discount)}</dd>
            </div>
            {campaign && (
              <p className="mt-1 text-[12px] text-text-3">
                {campaign.name}
                {campaign.percentage && campaign.products?.length
                  ? campaign.products.map((title) => (
                      <span key={title} className="block">
                        {title} · %{campaign.percentage!.toLocaleString("tr-TR")} indirim
                      </span>
                    ))
                  : campaign.percentage
                    ? ` — ${campaign.scope ? `${campaign.scope} ürünlerinde` : "tüm sepette"} %${campaign.percentage.toLocaleString("tr-TR")}`
                    : " uygulandı"}
              </p>
            )}
          </div>
        )}
        <div className="flex justify-between">
          <dt>Kargo</dt>
          <dd>{shippingCost === 0 ? "Ücretsiz" : formatPrice(shippingCost)}</dd>
        </div>
        <p className="text-[12px] text-text-3">
          {freeShippingRemaining > 0
            ? `Ücretsiz kargo için ${formatPrice(freeShippingRemaining)} daha ekle.`
            : "Ücretsiz kargo uygulandı."}
        </p>
      </dl>

      <div className="border-y border-line py-5">{coupon}</div>

      <div className="flex items-baseline justify-between pt-6">
        <span className="text-[14px]">Tahmini toplam</span>
        <span className="text-xl font-medium">{formatPrice(total)}</span>
      </div>
      <p className="mt-1 text-caption text-text-4">KDV dahil · Tahmini teslimat {deliveryEstimate}</p>

      <Link
        href="/checkout"
        className="mt-6 flex h-14 items-center justify-center bg-ink text-nav uppercase tracking-[0.16em] text-background transition-colors hover:bg-ink-hover"
      >
        Ödemeye geç
      </Link>
      <Link href="/products" className="text-cta mx-auto mt-5 block w-fit">
        Alışverişe devam et
      </Link>

      <div className="mt-8 flex flex-col gap-2.5 text-card text-ink-soft">
        <span className="flex items-center gap-3">
          <LockSimpleIcon size={17} className="flex-none text-text-3" />
          iyzico ile güvenli ödeme
        </span>
        <span className="flex items-center gap-3">
          <ArrowUUpLeftIcon size={17} className="flex-none text-text-3" />
          14 gün içinde kolay iade
        </span>
        <span className="flex items-center gap-3">
          <TruckIcon size={17} className="flex-none text-text-3" />
          1-5 iş gününde teslimat
        </span>
      </div>
    </section>
  );
}
