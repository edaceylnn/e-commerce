"use client";

import { useState } from "react";
import { useHasMounted } from "@/lib/use-has-mounted";

// Records the choice, then hands the token to the store's callback with a
// form POST — exactly what iyzico's hosted page does after a payment.
export function SimulatedPaymentActions({ token }: { token: string }) {
  const [busy, setBusy] = useState<"SUCCESS" | "FAILURE" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Disabled until hydrated: a click before then would do nothing at all.
  const ready = useHasMounted();

  async function choose(outcome: "SUCCESS" | "FAILURE") {
    setBusy(outcome);
    setError(null);
    const res = await fetch(`/api/payment-simulator/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data?.callbackUrl) {
      setError(data?.error ?? "Bir şeyler ters gitti, tekrar dene.");
      setBusy(null);
      return;
    }
    const form = document.createElement("form");
    form.method = "POST";
    form.action = data.callbackUrl;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "token";
    input.value = token;
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={!ready || busy !== null}
        onClick={() => choose("SUCCESS")}
        className="flex h-12 w-full items-center justify-center bg-ink text-nav uppercase tracking-cta text-background transition-opacity disabled:opacity-60"
      >
        {busy === "SUCCESS" ? "Ödeniyor…" : "Ödemeyi tamamla"}
      </button>
      <button
        type="button"
        disabled={!ready || busy !== null}
        onClick={() => choose("FAILURE")}
        className="flex h-12 w-full items-center justify-center border border-ink text-nav uppercase tracking-cta transition-colors hover:bg-cream disabled:opacity-60"
      >
        {busy === "FAILURE" ? "Gönderiliyor…" : "Başarısız ödeme dene"}
      </button>
      {error && <p className="text-card text-danger">{error}</p>}
    </div>
  );
}
