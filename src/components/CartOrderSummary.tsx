import Link from "next/link";
import type { ReactNode } from "react";
import { formatPrice } from "@/lib/format";
import { PillLink } from "@/components/Pill";

// Compact order summary: quiet line items, then the two things that should
// win the eye — the total and the checkout button. Campaign and free-shipping
// status are small inline notes, not boxes. The coupon field is passed in by
// the cart page (it owns that state) and sits right above the total. Trust
// info lives outside the card as a single line, keeping the card short.
export function CartOrderSummary({
  subtotal,
  discount,
  shippingCost,
  total,
  campaign,
  freeShippingRemaining,
  freeShippingProgress,
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
  /** 0–100; only drawn while the threshold isn't reached yet. */
  freeShippingProgress: number;
  deliveryEstimate: string;
  coupon: ReactNode;
}) {
  return (
    <div>
      <section aria-labelledby="order-summary-title" className="border border-line bg-ivory p-6">
        <h2
          id="order-summary-title"
          className="font-mono text-caption uppercase tracking-eyebrow text-ink-soft"
        >
          Sipariş Özeti
        </h2>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Ara toplam</dt>
            <dd className="font-mono">{formatPrice(subtotal)}</dd>
          </div>

          {discount > 0 && (
            <div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">İndirim</dt>
                <dd className="font-mono text-accent">−{formatPrice(discount)}</dd>
              </div>
              {campaign && (
                <p className="mt-0.5 text-xs text-accent">
                  {campaign.name}
                  {campaign.percentage && campaign.products?.length ? (
                    campaign.products.map((title) => (
                      <span key={title} className="block text-ink-soft">
                        {title} · %{campaign.percentage!.toLocaleString("tr-TR")} indirim
                      </span>
                    ))
                  ) : campaign.percentage ? (
                    <span className="block text-ink-soft">
                      {campaign.scope ? `${campaign.scope} ürünlerinde` : "Tüm sepette"} %
                      {campaign.percentage.toLocaleString("tr-TR")}
                    </span>
                  ) : (
                    " uygulandı"
                  )}
                </p>
              )}
            </div>
          )}

          <div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Kargo</dt>
              <dd className="font-mono">{shippingCost === 0 ? "Ücretsiz" : formatPrice(shippingCost)}</dd>
            </div>
            {/* Only while the threshold isn't met — once it is, the "Ücretsiz"
                value above already says it. */}
            {freeShippingRemaining > 0 && (
              <div className="mt-1">
                <p className="text-xs text-ink-soft">
                  Ücretsiz kargoya <span className="font-medium text-ink">{formatPrice(freeShippingRemaining)}</span> kaldı
                </p>
                <div
                  className="mt-1.5 h-0.5 w-full bg-line"
                  role="progressbar"
                  aria-label="Ücretsiz kargo eşiği"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(freeShippingProgress)}
                >
                  <div className="h-full bg-ink" style={{ width: `${freeShippingProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        </dl>

        <div className="mt-4">{coupon}</div>

        <div className="mt-4 flex items-baseline justify-between border-t border-ink pt-4">
          <span className="text-sm font-medium">Toplam</span>
          <span className="font-display text-4xl leading-none">{formatPrice(total)}</span>
        </div>

        <PillLink href="/checkout/address" className="mt-4 w-full">
          Ödemeye Geç
        </PillLink>

        <p className="mt-2.5 text-center text-xs text-ink-soft">Tahmini teslimat: {deliveryEstimate}</p>
      </section>

      <p className="mt-3 text-center text-xs text-ink-soft">
        Güvenli ödeme · 14 gün iade ·{" "}
        <Link href="/iletisim" className="underline underline-offset-2 hover:text-ink">
          Yardım
        </Link>
      </p>
    </div>
  );
}
