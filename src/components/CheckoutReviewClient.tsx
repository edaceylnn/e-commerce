"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore, selectCartTotal } from "@/lib/store/cart-store";
import { useHasMounted } from "@/lib/use-has-mounted";
import { formatPrice } from "@/lib/format";
import { computeShippingCost } from "@/lib/shipping";
import { computeCouponDiscount } from "@/lib/coupons";
import { PillButton } from "@/components/Pill";

type AppliedCoupon = {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
};

type CampaignPreview = {
  name: string;
  discount: number;
};

export function CheckoutReviewClient({
  shippingAddressId,
  billingAddressId,
}: {
  shippingAddressId: string;
  billingAddressId: string;
}) {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectCartTotal);
  const mounted = useHasMounted();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Campaigns are automatic (no code to enter) — this fetches whichever one
  // currently applies to the cart, purely for display; /api/checkout/create
  // decides for real which of coupon vs. campaign actually wins.
  const [campaign, setCampaign] = useState<CampaignPreview | null>(null);
  const itemsKey = items
    .map((i) => `${i.id}:${i.variantId ?? ""}:${i.quantity}`)
    .join(",");

  useEffect(() => {
    // Nothing to preview for an empty cart — the empty-cart message below
    // never reads `campaign`, so there's nothing to reset either.
    if (items.length === 0) return;
    let cancelled = false;
    fetch("/api/checkout/campaign-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          variantId: item.variantId,
        })),
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setCampaign(data?.discount > 0 ? data : null);
      })
      .catch(() => {
        if (!cancelled) setCampaign(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Sepetiniz boş.{" "}
        <Link href="/products" className="text-primary underline underline-offset-4">
          Alışverişe devam edin
        </Link>
        .
      </p>
    );
  }

  const shippingCost = computeShippingCost(subtotal);
  const couponDiscount = appliedCoupon
    ? computeCouponDiscount(appliedCoupon, subtotal)
    : 0;
  const campaignDiscount = campaign?.discount ?? 0;
  // Never stacked — whichever is larger is the one actually applied,
  // matching /api/checkout/create's own precedence rule.
  const campaignWins = campaignDiscount > couponDiscount;
  const discount = campaignWins ? campaignDiscount : couponDiscount;
  const total = subtotal + shippingCost - discount;

  async function handleApplyCoupon() {
    setCouponError(null);
    setApplyingCoupon(true);
    const res = await fetch("/api/checkout/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponCode }),
    });
    const data = await res.json();
    setApplyingCoupon(false);

    if (!res.ok) {
      setAppliedCoupon(null);
      setCouponError(data.error ?? "Kupon uygulanamadı.");
      return;
    }
    setAppliedCoupon(data);
  }

  async function handlePay() {
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/checkout/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shippingAddressId,
        billingAddressId,
        items: items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          variantId: item.variantId,
        })),
        couponCode: appliedCoupon?.code,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setSubmitting(false);
      setError(data.error ?? "Ödeme başlatılamadı.");
      return;
    }

    window.location.href = data.paymentPageUrl;
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li
            key={`${item.id}-${item.variantId ?? ""}`}
            className="flex items-center justify-between gap-4 py-4 text-sm"
          >
            <span>
              {item.title} × {item.quantity}
            </span>
            <span className="font-semibold">
              {formatPrice(item.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      {campaign && (
        <div className="border border-accent/30 bg-accent-soft px-3 py-2 text-sm text-accent-dark">
          Kampanya uygulandı: <strong>{campaign.name}</strong>
        </div>
      )}

      <div>
        {appliedCoupon ? (
          <div className="flex items-center justify-between border border-line px-3 py-2 text-sm">
            <span>
              Kupon uygulandı: <strong>{appliedCoupon.code}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setAppliedCoupon(null);
                setCouponCode("");
              }}
              className="text-xs font-semibold uppercase tracking-wide text-ink-soft hover:text-ink"
            >
              Kaldır
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              placeholder="Kupon kodu"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              className="flex-1 border border-line px-3 py-2 text-sm outline-none focus:border-ink"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={applyingCoupon || !couponCode.trim()}
              className="border border-ink px-4 text-xs font-semibold uppercase tracking-wide hover:bg-ink hover:text-background disabled:opacity-50"
            >
              {applyingCoupon ? "Uygulanıyor…" : "Uygula"}
            </button>
          </div>
        )}
        {couponError && <p className="mt-2 text-xs text-danger">{couponError}</p>}
        {appliedCoupon && campaignWins && (
          <p className="mt-2 text-xs text-ink-soft">
            &quot;{campaign?.name}&quot; kampanyası kuponunuzdan daha yüksek
            indirim sağladığı için kuponunuz uygulanmadı.
          </p>
        )}
      </div>

      <div className="space-y-1 border-t border-line pt-4 text-sm">
        <div className="flex justify-between text-ink-soft">
          <span>Ara toplam</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-ink-soft">
            <span>İndirim</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-ink-soft">
          <span>Kargo</span>
          <span>{shippingCost === 0 ? "Ücretsiz" : formatPrice(shippingCost)}</span>
        </div>
        <div className="flex justify-between text-base font-bold">
          <span>Toplam</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <PillButton onClick={handlePay} disabled={submitting} className="w-full">
        {submitting ? "Yönlendiriliyor…" : "Ödemeyi Başlat"}
      </PillButton>
    </div>
  );
}
