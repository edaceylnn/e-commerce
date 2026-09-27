"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore, selectCartTotal } from "@/lib/store/cart-store";
import { useHasMounted } from "@/lib/use-has-mounted";
import { formatDeliveryWindow } from "@/lib/format";
import { PillButton, PillLink, pillClassName } from "@/components/Pill";
import { FREE_SHIPPING_THRESHOLD, computeShippingCost } from "@/lib/shipping";
import { computeCouponDiscount } from "@/lib/coupons";
import { CartLineItem, type CartLineStock } from "@/components/CartLineItem";
import { CartOrderSummary } from "@/components/CartOrderSummary";
import { CartCrossSell } from "@/components/CartCrossSell";

type AppliedCoupon = { code: string; type: "PERCENTAGE" | "FIXED"; value: number };
type CampaignPreview = {
  name: string;
  discount: number;
  percentage?: number;
  /** Category or brand the campaign is limited to; null = whole cart. */
  scope?: string | null;
  /** Products in this cart the campaign actually applied to. */
  productIds?: number[];
};

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectCartTotal);
  const clear = useCartStore((s) => s.clear);
  const mounted = useHasMounted();

  const [stockByKey, setStockByKey] = useState<Record<string, CartLineStock>>({});
  const [campaign, setCampaign] = useState<CampaignPreview | null>(null);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const itemsKey = items
    .map((i) => `${i.id}:${i.variantId ?? ""}:${i.quantity}`)
    .join(",");

  // Live stock, batched for every line — the cart itself only persists what
  // was true at add-to-cart time, so this is what actually drives the
  // "Stokta / Son N ürün / Tükendi" badges.
  useEffect(() => {
    // Nothing to fetch for an empty cart — the empty-cart view below never
    // reads this state, so there's nothing to reset either.
    if (items.length === 0) return;
    let cancelled = false;
    fetch("/api/cart/lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ id: i.id, variantId: i.variantId })),
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setStockByKey(data?.lines ?? {});
      })
      .catch(() => {
        if (!cancelled) setStockByKey({});
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  // Campaigns are automatic (no code) — same preview call the checkout
  // review page makes, kept here too so the total shown already matches
  // what checkout will actually charge.
  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    fetch("/api/checkout/campaign-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          variantId: i.variantId,
        })),
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setCampaign(data?.discount > 0 ? data : null);
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
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl sm:text-5xl">Sepetiniz boş</h1>
        <div className="mt-8 flex justify-center">
          <PillLink href="/products">Alışverişe Başla</PillLink>
        </div>
      </div>
    );
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const shippingCost = computeShippingCost(subtotal);
  const couponDiscount = appliedCoupon ? computeCouponDiscount(appliedCoupon, subtotal) : 0;
  const campaignDiscount = campaign?.discount ?? 0;
  // Never stacked — whichever is larger wins, same precedence as /api/checkout/create.
  const campaignWins = campaignDiscount > couponDiscount;
  const discount = campaignWins ? campaignDiscount : couponDiscount;
  const total = subtotal + shippingCost - discount;

  // Names (live, like the rows show them) of the products the winning
  // campaign applied to, so the summary can say exactly what was discounted.
  const campaignProducts = (campaign?.productIds ?? []).flatMap((id) => {
    const item = items.find((i) => i.id === id);
    if (!item) return [];
    return [stockByKey[`${item.id}-${item.variantId ?? ""}`]?.title || item.title];
  });

  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

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

  function handleClear() {
    if (window.confirm("Sepetteki tüm ürünler kaldırılsın mı?")) {
      clear();
    }
  }

  const couponField = (
    <div>
      {appliedCoupon ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>
            Kupon uygulandı: <strong className="font-mono font-medium">{appliedCoupon.code}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              setAppliedCoupon(null);
              setCouponCode("");
            }}
            className="text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            Kaldır
          </button>
        </div>
      ) : couponOpen ? (
        <div className="flex gap-2">
          <input
            placeholder="Kupon kodu"
            aria-label="Kupon kodu"
            autoFocus
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            // Left empty → fold back to the "İndirim kodunuz var mı? +" row.
            onBlur={() => {
              if (!couponCode.trim() && !applyingCoupon) setCouponOpen(false);
            }}
            className="h-10 min-w-0 flex-1 border border-line-strong bg-background px-3 text-sm outline-none transition focus:border-ink"
          />
          <PillButton
            type="button"
            variant="outline"
            onClick={handleApplyCoupon}
            disabled={applyingCoupon || !couponCode.trim()}
            className="!h-10 !px-4 !py-0"
          >
            {applyingCoupon ? "Uygulanıyor…" : "Uygula"}
          </PillButton>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCouponOpen(true)}
          className="flex w-full items-center justify-between text-sm text-ink hover:text-accent"
        >
          İndirim kodunuz var mı?
          <span aria-hidden className="font-mono text-base leading-none">+</span>
        </button>
      )}
      {couponError && <p className="mt-2 text-xs text-danger">{couponError}</p>}
      {appliedCoupon && campaignWins && (
        <p className="mt-2 text-xs text-ink-soft">
          &quot;{campaign?.name}&quot; kampanyası kuponunuzdan daha yüksek indirim
          sağladığı için kuponunuz uygulanmadı.
        </p>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-12 sm:px-10">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-4xl sm:text-5xl">Sepetim</h1>
        <span className="font-mono text-caption uppercase tracking-eyebrow text-ink-soft">
          {itemCount} adet ürün
        </span>
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px] lg:items-start lg:gap-16">
        <div>
          <ul className="divide-y divide-line border-y border-line">
            {items.map((item) => (
              <CartLineItem
                key={`${item.id}-${item.variantId ?? ""}`}
                item={item}
                stockInfo={stockByKey[`${item.id}-${item.variantId ?? ""}`]}
              />
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between gap-4">
            <Link href="/products" className={pillClassName("ghost")}>
              ← Alışverişe devam et
            </Link>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline"
            >
              Sepeti boşalt
            </button>
          </div>
        </div>

        <div className="lg:sticky lg:top-24">
          <CartOrderSummary
            subtotal={subtotal}
            discount={discount}
            shippingCost={shippingCost}
            total={total}
            campaign={campaignWins && campaign ? { ...campaign, products: campaignProducts } : null}
            freeShippingRemaining={freeShippingRemaining}
            freeShippingProgress={freeShippingProgress}
            deliveryEstimate={formatDeliveryWindow(new Date(), 2, 4)}
            coupon={couponField}
          />
        </div>
      </div>

      <CartCrossSell cartProductIds={items.map((i) => i.id)} />
    </div>
  );
}
