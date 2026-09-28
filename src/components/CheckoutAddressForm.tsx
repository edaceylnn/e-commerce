"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddressPicker, type SavedAddress } from "@/components/AddressPicker";
import { PillButton } from "@/components/Pill";

export function CheckoutAddressForm({
  savedAddresses,
}: {
  savedAddresses: SavedAddress[];
}) {
  const router = useRouter();
  const [addresses, setAddresses] = useState(savedAddresses);
  const [shippingId, setShippingId] = useState<string | null>(
    savedAddresses.find((a) => a.type === "SHIPPING")?.id ??
      savedAddresses[0]?.id ??
      null
  );
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [billingId, setBillingId] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  function handleCreated(address: SavedAddress) {
    setAddresses((prev) => [address, ...prev]);
  }

  const finalBillingId = sameAsShipping ? shippingId : billingId;
  const canContinue = !!shippingId && !!finalBillingId;

  function handleContinue() {
    if (!shippingId || !finalBillingId) return;
    setNavigating(true);
    router.push(
      `/checkout/review?shippingAddressId=${shippingId}&billingAddressId=${finalBillingId}`
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
          Teslimat Adresi
        </h2>
        <AddressPicker
          addresses={addresses}
          selectedId={shippingId}
          onSelect={setShippingId}
          onCreated={handleCreated}
          defaultType="SHIPPING"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={sameAsShipping}
          onChange={(e) => setSameAsShipping(e.target.checked)}
        />
        Fatura adresim teslimat adresimle aynı
      </label>

      {!sameAsShipping && (
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-soft">
            Fatura Adresi
          </h2>
          <AddressPicker
            addresses={addresses}
            selectedId={billingId}
            onSelect={setBillingId}
            onCreated={handleCreated}
            defaultType="BILLING"
          />
        </div>
      )}

      <PillButton
        onClick={handleContinue}
        disabled={!canContinue || navigating}
        className="w-full"
      >
        Devam Et
      </PillButton>
    </div>
  );
}
