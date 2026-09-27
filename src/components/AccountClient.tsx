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

export function AccountClient() {
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
    <div className="mt-8 border border-line bg-background px-6 pb-7 pt-5 sm:px-8 sm:pb-8">
      {/* The active mode is marked by a hairline underline sitting on the
          row's bottom border (-mb-px), not by color alone. */}
      <div className="flex gap-7 border-b border-line">
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
              className={`-mb-px border-b pb-3 text-xs font-semibold uppercase tracking-label transition ${
                active ? "border-ink text-ink" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

        {error && <Alert variant="error">{error}</Alert>}

        <PillButton type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? "Gönderiliyor…" : mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
        </PillButton>
      </form>

      {mode === "login" && (
        <p className="mt-5 text-center">
          <Link
            href="/account/sifremi-unuttum"
            className="text-xs text-ink-soft underline underline-offset-4 transition hover:text-ink"
          >
            Şifremi unuttum
          </Link>
        </p>
      )}
    </div>
  );
}
