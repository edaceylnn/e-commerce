"use client";

import Link from "next/link";
import { FormEvent, useId, useState } from "react";
import { Alert } from "@/components/Alert";
import { FormField, fieldInputClass } from "@/components/FormField";
import { PasswordField } from "@/components/PasswordField";
import { PillButton } from "@/components/Pill";
import { PASSWORD_REQUIREMENTS } from "@/lib/password-rules";

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  const data = await res?.json().catch(() => null);
  return res?.ok ? null : (data?.error ?? "Bir şeyler ters gitti, tekrar dene.");
}

// Step 1: ask for a link. The answer is the same whether or not the
// address has an account.
export function PasswordResetRequestForm() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(await post("/api/auth/password-reset", { email }));
    setSubmitting(false);
    setSent(true);
  }

  if (sent && !error) {
    return (
      <div className="mt-8 space-y-4">
        <Alert variant="success">
          Bu adrese kayıtlı bir hesap varsa, şifre sıfırlama bağlantısını gönderdik. Bağlantı 30 dakika geçerli.
        </Alert>
        <p className="text-card text-ink-soft">E-posta gelmediyse gereksiz (spam) klasörüne de bak.</p>
        <Link href="/account" className="text-card underline underline-offset-4">
          Giriş sayfasına dön
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <FormField label="E-posta" htmlFor={emailId} required>
        <input
          id={emailId}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldInputClass(false, "field")}
        />
      </FormField>
      {error && <Alert variant="error">{error}</Alert>}
      <PillButton type="submit" disabled={submitting} className="w-full">
        {submitting ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
      </PillButton>
      <p className="text-center">
        <Link href="/account" className="text-card text-ink-soft underline underline-offset-4 hover:text-ink">
          Giriş sayfasına dön
        </Link>
      </p>
    </form>
  );
}

// Step 2: from the emailed link, choose the new password.
export function PasswordResetConfirmForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const rulesMet = PASSWORD_REQUIREMENTS.every((r) => r.test(password));
  const matches = password.length > 0 && password === confirm;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const err = await post("/api/auth/password-reset/confirm", { token, password });
    setSubmitting(false);
    setError(err);
    if (!err) setDone(true);
  }

  if (done) {
    return (
      <div className="mt-8 space-y-4">
        <Alert variant="success">Şifren değiştirildi. Yeni şifrenle giriş yapabilirsin.</Alert>
        <Link href="/account" className="text-card underline underline-offset-4">
          Giriş yap
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <PasswordField label="Yeni şifre" value={password} onChange={setPassword} required minLength={8} autoComplete="new-password" surface="field" />
      <PasswordField
        label="Yeni şifre (tekrar)"
        value={confirm}
        onChange={setConfirm}
        required
        autoComplete="new-password"
        surface="field"
        error={confirm.length > 0 && !matches ? "Şifreler eşleşmiyor." : null}
      />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {PASSWORD_REQUIREMENTS.map((r) => (
          <li key={r.label} className={r.test(password) ? "text-success" : "text-ink-soft"}>
            {r.test(password) ? "✓" : "·"} {r.label}
          </li>
        ))}
      </ul>
      {error && <Alert variant="error">{error}</Alert>}
      <PillButton type="submit" disabled={submitting || !rulesMet || !matches} className="w-full">
        {submitting ? "Kaydediliyor…" : "Şifremi değiştir"}
      </PillButton>
    </form>
  );
}
