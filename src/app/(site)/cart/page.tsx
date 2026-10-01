"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore, selectCartTotal } from "@/lib/store/cart-store";
import { useHasMounted } from "@/lib/use-has-mounted";
import { formatDeliveryWindow, formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD, computeShippingCost } from "@/lib/shipping";
import { computeCouponDiscount } from "@/lib/coupons";
import { CartLineItem, type CartLineStock } from "@/components/CartLineItem";
import { CartOrderSummary } from "@/components/CartOrderSummary";
import { CartCrossSell } from "@/components/CartCrossSell";

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
  const mounted = useHasMounted();

  const [stockByKey, setStockByKey] = useState<Record<string, CartLineStock>>({});
  const [campaign, setCampaign] = useState<CampaignPreview | null>(null);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  // Kept in the cart store so checkout gets the same coupon.
  const appliedCoupon = useCartStore((s) => s.coupon);
  const setAppliedCoupon = useCartStore((s) => s.setCoupon);
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
      <div className="page-x flex flex-col items-center gap-4 pt-28 text-center">
        <h1 className="headline text-display-md">Sepetin boş</h1>
        <p className="max-w-[40ch] text-body font-light text-ink-soft">
          Beğendiğin parçaları sepete ekle; ödeme adımına kadar burada seni bekler.
        </p>
        <Link
          href="/products"
          className="mt-4 flex h-[52px] items-center bg-ink px-12 text-nav uppercase tracking-[0.16em] text-background transition-colors hover:bg-ink-hover"
        >
          Alışverişe devam et
        </Link>
        <Link href="/products?filter=new" className="text-cta mt-3">
          Yeni gelenlere göz at
        </Link>
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

  const couponField = (
    <div>
      {appliedCoupon ? (
        <div className="flex items-baseline justify-between gap-3 text-card">
          <span>
            <span className="text-text-3">Kupon</span> {appliedCoupon.code}
          </span>
          <button
            type="button"
            onClick={() => {
              setAppliedCoupon(null);
              setCouponCode("");
            }}
            className="text-[12px] text-ink-soft underline decoration-disabled underline-offset-4 hover:text-ink"
          >
            Kaldır
          </button>
        </div>
      ) : couponOpen ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (couponCode.trim()) handleApplyCoupon();
          }}
          className="flex flex-col gap-2"
        >
          <label htmlFor="coupon" className="text-caption uppercase tracking-label text-text-3">
            İndirim kodu
          </label>
          <div className={`flex border-b ${couponError ? "border-sale" : "border-ink"}`}>
            <input
              id="coupon"
              placeholder="Örn. HOSGELDIN10"
              autoFocus
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value);
                setCouponError(null);
              }}
              // Left empty → fold back to the "İndirim kodun var mı?" link.
              onBlur={() => {
                if (!couponCode.trim() && !applyingCoupon) setCouponOpen(false);
              }}
              className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[14px] font-light uppercase text-ink outline-none placeholder:normal-case placeholder:text-text-4"
            />
            <button
              type="submit"
              disabled={applyingCoupon || !couponCode.trim()}
              className="pl-4 text-nav uppercase tracking-cta text-ink disabled:text-disabled"
            >
              {applyingCoupon ? "…" : "Uygula"}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCouponOpen(true)}
          className="text-card underline decoration-disabled underline-offset-4 hover:decoration-ink"
        >
          İndirim kodun var mı?
        </button>
      )}
      {couponError && <p className="mt-2 text-[12px] text-sale">{couponError}</p>}
      {appliedCoupon && campaignWins && (
        <p className="mt-2 text-[12px] text-text-3">
          &quot;{campaign?.name}&quot; kampanyası kuponundan daha yüksek indirim sağladığı için
          kupon uygulanmadı.
        </p>
      )}
    </div>
  );

  return (
    // Bottom padding on mobile clears the fixed total/checkout bar.
    <div className="page-x pb-24 pt-12 tab:pb-0">
      <div className="grid grid-cols-12 items-start gap-x-2 gap-y-16">
        <div className="col-span-12 tab:col-span-7">
          {/* Same height as the order summary's heading from tablet up, so
              the two rules beneath them line up. */}
          <div className="border-b border-line-strong pb-6 tab:flex tab:h-24 tab:flex-col tab:justify-end">
            <div className="flex items-baseline gap-3.5">
              <h1 className="headline text-[clamp(28px,2.6vw,38px)] leading-[1.1]">Sepetim</h1>
              <span className="text-body-sm text-text-3">{itemCount} ürün</span>
            </div>
            <p className="mt-2.5 text-[12px] text-text-4">
              Sepetteki ürünler ödeme adımına kadar rezerve edilmez.
            </p>
          </div>
          <ul>
            {items.map((item) => (
              <CartLineItem
                key={`${item.id}-${item.variantId ?? ""}`}
                item={item}
                stockInfo={stockByKey[`${item.id}-${item.variantId ?? ""}`]}
              />
            ))}
          </ul>
        </div>

        <div className="col-span-12 tab:sticky tab:top-[132px] tab:col-start-8 tab:col-span-5 tab:pl-6 desk:col-start-9 desk:col-span-4 desk:pl-0 hdr:top-[88px]">
          <CartOrderSummary
            subtotal={subtotal}
            discount={discount}
            shippingCost={shippingCost}
            total={total}
            campaign={campaignWins && campaign ? { ...campaign, products: campaignProducts } : null}
            freeShippingRemaining={freeShippingRemaining}
            deliveryEstimate={formatDeliveryWindow(new Date(), 2, 4)}
            coupon={couponField}
          />
        </div>
      </div>

      <CartCrossSell cartProductIds={items.map((i) => i.id)} />

      {/* Mobile: fixed bottom bar with the total and checkout. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 border-t border-line bg-background px-5 py-2.5 tab:hidden">
        <div className="flex flex-col">
          <span className="text-caption uppercase tracking-label text-text-3">Toplam</span>
          <span className="text-base font-medium">{formatPrice(total)}</span>
        </div>
        <Link
          href="/checkout"
          className="flex h-[52px] flex-1 items-center justify-center bg-ink text-nav uppercase tracking-[0.14em] text-background"
        >
          Ödemeye geç
        </Link>
      </div>
    </div>
  );
}
