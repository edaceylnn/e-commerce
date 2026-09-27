"use client";

import { useState } from "react";

export function FooterNewsletterForm() {
  const [subscribed, setSubscribed] = useState(false);

  if (subscribed) {
    return <p className="text-body-sm text-ink-soft">Teşekkürler, kaydettik.</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubscribed(true);
      }}
      className="flex border border-line"
    >
      <input
        type="email"
        required
        placeholder="E-posta adresin"
        className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-body-sm text-ink placeholder:text-ink-soft focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 bg-ink px-4 py-3 font-sans text-caption font-semibold uppercase tracking-label text-background"
      >
        Gönder
      </button>
    </form>
  );
}
