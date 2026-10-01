"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore, selectCartTotal } from "@/lib/store/cart-store";
import { useHasMounted } from "@/lib/use-has-mounted";
import { formatPrice } from "@/lib/format";
import { computeShippingCost } from "@/lib/shipping";
import { computeCouponDiscount } from "@/lib/coupons";
import { AddressPicker, type SavedAddress } from "@/components/AddressPicker";
import { LockSimpleIcon } from "@/components/icons/Ph";

type CampaignPreview = { name: string; discount: number };

const sectionTitle = "text-caption uppercase tracking-eyebrow text-text-3";

// One-page checkout: addresses on the left, the order and the pay button on
// the right — same grid as the cart. The coupon applied in the cart comes
// along (cart store); /api/checkout/create re-prices everything server-side
// and decides coupon vs. campaign for real.
export function CheckoutClient({
  savedAddresses,
  paymentSimulated,
}: {
  savedAddresses: SavedAddress[];
  // No iyzico keys: the next step is the payment simulator.
  paymentSimulated: boolean;
}) {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectCartTotal);
  const coupon = useCartStore((s) => s.coupon);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const mounted = useHasMounted();

  const [addresses, setAddresses] = useState(savedAddresses);
  const [shippingId, setShippingId] = useState<string | null>(
    savedAddresses.find((a) => a.type === "SHIPPING")?.id ?? savedAddresses[0]?.id ?? null
  );
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [billingId, setBillingId] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [campaign, setCampaign] = useState<CampaignPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const itemsKey = items.map((i) => `${i.id}:${i.variantId ?? ""}:${i.quantity}`).join(",");
  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    fetch("/api/checkout/campaign-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.map((i) => ({ id: i.id, quantity: i.quantity, variantId: i.variantId })) }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => !cancelled && setCampaign(data?.discount > 0 ? data : null))
      .catch(() => !cancelled && setCampaign(null));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-center">
        <h1 className="headline text-display-md">Sepetin boş</h1>
        <p className="text-body font-light text-ink-soft">Ödeme için önce sepete ürün ekle.</p>
        <Link href="/products" className="text-cta mt-3">
          Alışverişe devam et
        </Link>
      </div>
    );
  }

  const billingAddressId = sameAsShipping ? shippingId : billingId;
  const shippingCost = computeShippingCost(subtotal);
  const couponDiscount = coupon ? computeCouponDiscount(coupon, subtotal) : 0;
  const campaignDiscount = campaign?.discount ?? 0;
  // Never stacked — whichever is larger is applied, as /api/checkout/create does.
  const campaignWins = campaignDiscount > couponDiscount;
  const discount = campaignWins ? campaignDiscount : couponDiscount;
  const total = subtotal + shippingCost - discount;
  const missing = !shippingId
    ? "Teslimat adresini seç ya da ekle."
    : !billingAddressId
      ? "Fatura adresini seç ya da ekle."
      : null;

  async function applyCoupon(e: FormEvent) {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponError(null);
    setApplyingCoupon(true);
    const res = await fetch("/api/checkout/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponCode }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setApplyingCoupon(false);
    if (!res?.ok) {
      setCouponError(data?.error ?? "Kupon uygulanamadı.");
      return;
    }
    setCoupon(data);
    setCouponCode("");
  }

  async function pay() {
    if (missing) return;
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/checkout/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shippingAddressId: shippingId,
        billingAddressId,
        items: items.map((i) => ({ id: i.id, quantity: i.quantity, variantId: i.variantId })),
        couponCode: coupon?.code,
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data?.paymentPageUrl) {
      setSubmitting(false);
      setError(data?.error ?? "Ödeme başlatılamadı.");
      return;
    }
    window.location.href = data.paymentPageUrl;
  }

  const addAddress = (address: SavedAddress) => setAddresses((prev) => [address, ...prev]);

  return (
    <div className="grid grid-cols-12 items-start gap-x-2 gap-y-16">
      <div className="col-span-12 tab:col-span-7">
        {/* Same height as the summary heading beside it (tab:h-24), so the
            rules under both line up — as on the cart page. */}
        <div className="border-b border-line-strong pb-6 tab:flex tab:h-24 tab:flex-col tab:justify-end">
          <h1 className="headline text-[clamp(28px,2.6vw,38px)] leading-[1.1]">Ödeme</h1>
          <p className="mt-2.5 text-[12px] text-text-4">Adresini seç, siparişini kontrol et ve güvenli ödemeye geç.</p>
        </div>

        <section aria-labelledby="shipping-title" className="border-b border-line py-8">
          <h2 id="shipping-title" className={`${sectionTitle} mb-4`}>
            1 · Teslimat adresi
          </h2>
          <AddressPicker
            addresses={addresses}
            selectedId={shippingId}
            onSelect={setShippingId}
            onCreated={addAddress}
            defaultType="SHIPPING"
          />
        </section>

        <section aria-labelledby="billing-title" className="border-b border-line py-8">
          <h2 id="billing-title" className={`${sectionTitle} mb-4`}>
            2 · Fatura adresi
          </h2>
          <label className="flex items-center gap-2.5 text-card">
            <input type="checkbox" checked={sameAsShipping} onChange={(e) => setSameAsShipping(e.target.checked)} />
            Fatura adresim teslimat adresimle aynı
          </label>
          {!sameAsShipping && (
            <div className="mt-5">
              <AddressPicker
                addresses={addresses}
                selectedId={billingId}
                onSelect={setBillingId}
                onCreated={addAddress}
                defaultType="BILLING"
              />
            </div>
          )}
        </section>

        <section aria-labelledby="payment-title" className="py-8">
          <h2 id="payment-title" className={`${sectionTitle} mb-4`}>
            3 · Ödeme
          </h2>
          <p className="max-w-[60ch] text-card text-ink-soft">
            {paymentSimulated
              ? "Demo mağaza: ödeme bir simülatörle yapılır, gerçek para çekilmez ve kart bilgisi istenmez."
              : "Ödemeyi iyzico'nun güvenli sayfasında tamamlayacaksın; kart bilgilerin EDACEY'e iletilmez."}
          </p>
        </section>
      </div>

      <aside
        aria-labelledby="checkout-summary-title"
        className="col-span-12 tab:sticky tab:top-[132px] tab:col-start-8 tab:col-span-5 tab:pl-6 desk:col-start-9 desk:col-span-4 desk:pl-0 hdr:top-[88px]"
      >
        <h2
          id="checkout-summary-title"
          className="border-b border-line-strong pb-5 text-body-sm uppercase tracking-eyebrow tab:flex tab:h-24 tab:items-end"
        >
          Sipariş Özeti
        </h2>

        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={`${item.id}-${item.variantId ?? ""}`} className="flex gap-4 py-4">
              <div className="relative aspect-[3/4] w-16 flex-none overflow-hidden bg-cream-deep">
                <Image src={item.thumbnail} alt="" fill sizes="64px" className="object-cover object-top" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1 text-card">
                <span className="truncate">{item.title}</span>
                <span className="text-text-3">
                  {item.variantLabel ? `${item.variantLabel} · ` : ""}
                  {item.quantity} adet
                </span>
              </div>
              <span className="text-card">{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="border-y border-line py-5">
          {coupon ? (
            <div className="flex items-baseline justify-between gap-3 text-card">
              <span>
                <span className="text-text-3">Kupon</span> {coupon.code}
              </span>
              <button
                type="button"
                onClick={() => setCoupon(null)}
                className="text-[12px] text-ink-soft underline decoration-disabled underline-offset-4 hover:text-ink"
              >
                Kaldır
              </button>
            </div>
          ) : (
            <form onSubmit={applyCoupon} className={`flex border-b ${couponError ? "border-sale" : "border-ink"}`}>
              <input
                aria-label="İndirim kodu"
                placeholder="İndirim kodu"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  setCouponError(null);
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
            </form>
          )}
          {couponError && <p className="mt-2 text-[12px] text-sale">{couponError}</p>}
          {coupon && campaignWins && (
            <p className="mt-2 text-[12px] text-text-3">
              &quot;{campaign?.name}&quot; kampanyası kuponundan daha yüksek indirim sağladığı için kupon uygulanmadı.
            </p>
          )}
        </div>

        <dl className="flex flex-col gap-3 py-6 text-card">
          <div className="flex justify-between">
            <dt>Ara toplam</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between">
              <dt>
                İndirim
                <span className="ml-1.5 text-text-3">({campaignWins ? campaign?.name : coupon?.code})</span>
              </dt>
              <dd className="text-sale">−{formatPrice(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Kargo</dt>
            <dd>{shippingCost === 0 ? "Ücretsiz" : formatPrice(shippingCost)}</dd>
          </div>
        </dl>

        <div className="flex items-baseline justify-between border-t border-line pt-6">
          <span className="text-[14px]">Toplam</span>
          <span className="text-xl font-medium">{formatPrice(total)}</span>
        </div>
        <p className="mt-1 text-caption text-text-4">KDV dahil</p>

        {error && <p className="mt-4 text-[12px] text-sale">{error}</p>}

        <button
          type="button"
          onClick={pay}
          disabled={!!missing || submitting}
          className="mt-6 flex h-14 w-full items-center justify-center bg-ink text-nav uppercase tracking-[0.16em] text-background transition-colors hover:bg-ink-hover disabled:cursor-not-allowed disabled:bg-disabled"
        >
          {submitting ? "Yönlendiriliyor…" : "Ödemeyi Başlat"}
        </button>
        {missing && <p className="mt-2 text-center text-[12px] text-text-3">{missing}</p>}

        <p className="mt-5 flex items-center justify-center gap-2 text-[12px] text-text-3">
          <LockSimpleIcon size={14} className="flex-none" />
          {paymentSimulated ? "Test ödemesi — gerçek para çekilmez" : "iyzico ile güvenli ödeme"}
        </p>
        <Link href="/cart" className="text-cta mx-auto mt-5 block w-fit">
          Sepete dön
        </Link>
      </aside>
    </div>
  );
}
