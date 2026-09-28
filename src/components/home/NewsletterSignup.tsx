"use client";

import { useState } from "react";
import { TextTabs } from "@/components/home/TextTabs";

const PREFS = [
  { value: "loungewear", label: "Loungewear" },
  { value: "spor", label: "Spor" },
  { value: "hepsi", label: "Hepsi" },
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// There's no newsletter backend yet — like the old footer form, this only
// validates and confirms client-side.
export function NewsletterSignup() {
  const [pref, setPref] = useState<(typeof PREFS)[number]["value"]>("hepsi");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");

  if (state === "done") {
    return (
      <div className="mt-6 flex flex-col gap-2">
        <span className="text-lg">Listeye eklendin.</span>
        <span className="text-[13.5px] font-light text-ink-soft">
          Haberleri {email} adresine göndereceğiz.
        </span>
      </div>
    );
  }

  const error = state === "error";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setState(EMAIL_RE.test(email) ? "done" : "error");
      }}
      className="mt-6 flex w-full flex-col gap-7"
    >
      <TextTabs label="İlgi alanı" options={PREFS} value={pref} onChange={setPref} className="justify-center" />
      <div className="flex flex-col gap-2 text-left">
        <label htmlFor="nl-email" className="text-caption uppercase tracking-label text-text-3">
          E-posta adresi
        </label>
        <div className={`flex border-b ${error ? "border-sale" : "border-ink"}`}>
          <input
            id="nl-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setState("idle");
            }}
            placeholder="ornek@eposta.com"
            aria-invalid={error}
            aria-describedby="nl-help"
            className="min-w-0 flex-1 border-0 bg-transparent py-3 text-body-lg font-light text-ink outline-none placeholder:text-text-4"
          />
          <button type="submit" className="pl-4 text-nav uppercase tracking-cta text-ink">
            Abone ol
          </button>
        </div>
        <span id="nl-help" className={`min-h-[18px] text-[12px] ${error ? "text-sale" : "text-text-3"}`}>
          {error ? "Lütfen geçerli bir e-posta adresi gir." : "Spam yok. İstediğin zaman ayrılabilirsin."}
        </span>
      </div>
    </form>
  );
}
