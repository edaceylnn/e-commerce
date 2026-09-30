"use client";

import { FormEvent, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PillButton } from "@/components/Pill";
import { FormField, fieldInputClass } from "@/components/FormField";
import { PasswordField } from "@/components/PasswordField";
import { Alert } from "@/components/Alert";

type Mode = "login" | "register";

const TABS: { mode: Mode; label: string }[] = [
  { mode: "login", label: "Giriş Yap" },
  { mode: "register", label: "Kayıt Ol" },
];

// `demo`: the public demo's shared account, shown with a fill-in button.
export function AccountClient({ demo }: { demo?: { email: string; password: string } }) {
  const router = useRouter();
  const nameId = useId();
  const emailId = useId();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Bir şeyler ters gitti.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="mt-10">
      {/* The active mode is marked by a hairline underline sitting on the
          row's bottom border (-mb-px), not by color alone. */}
      <div className="flex gap-6">
        {TABS.map((tab) => {
          const active = mode === tab.mode;
          return (
            <button
              key={tab.mode}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setMode(tab.mode);
                setError(null);
              }}
              className={`border-b pb-1 text-nav uppercase tracking-label transition-colors ${
                active ? "border-ink text-ink" : "border-transparent text-text-4 hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {mode === "register" && (
          <FormField label="İsim" htmlFor={nameId} required>
            <input
              id={nameId}
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={fieldInputClass(false, "field")}
            />
          </FormField>
        )}

        <FormField label="E-posta" htmlFor={emailId} required>
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            placeholder="ornek@eposta.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldInputClass(false, "field")}
          />
        </FormField>

        <PasswordField
          label="Parola"
          required
          minLength={mode === "register" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          hint={mode === "register" ? "En az 8 karakter." : undefined}
          value={password}
          onChange={setPassword}
          surface="field"
        />

        {demo && mode === "login" && (
          <div className="border border-line px-4 py-3 text-card">
            <p className="font-medium">Demo müşteri hesabı</p>
            <p className="mt-0.5 text-ink-soft">
              {demo.email} · {demo.password}
            </p>
            <p className="mt-0.5 text-text-3">Test kartı: 5528 7900 0000 0008 · 12/30 · 123</p>
            <button
              type="button"
              onClick={() => {
                setEmail(demo.email);
                setPassword(demo.password);
              }}
              className="mt-1.5 underline underline-offset-4 hover:text-ink-soft"
            >
              Bilgileri doldur
            </button>
          </div>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <PillButton type="submit" disabled={submitting} className="!mt-8 w-full">
          {submitting ? "Gönderiliyor…" : mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
        </PillButton>
      </form>

      {mode === "login" && (
        <p className="mt-5 text-center">
          <Link
            href="/account/sifremi-unuttum"
            className="text-[12px] text-ink-soft underline decoration-disabled underline-offset-4 transition-colors hover:text-ink"
          >
            Şifremi unuttum
          </Link>
        </p>
      )}
    </div>
  );
}
