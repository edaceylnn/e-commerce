"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

// `demo`: the public demo's shared account, shown with a fill-in button.
export function AdminLoginForm({ demo }: { demo?: { email: string; password: string } }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setSubmitting(false);
      setError(data.error ?? "Bir şeyler ters gitti.");
      return;
    }

    if (data.role !== "ADMIN") {
      // This account is valid but has no back-office access — never leave
      // a non-admin session sitting on the admin login page.
      await fetch("/api/auth/logout", { method: "POST" });
      setSubmitting(false);
      setError("Bu hesabın yönetici paneline erişim yetkisi yok.");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-adm-border bg-adm-surface-card p-6"
    >
      {demo && (
        <div className="rounded-lg bg-adm-surface-secondary px-3 py-2.5 text-[13px] text-adm-text">
          <p className="font-semibold">Demo hesabı</p>
          <p className="mt-0.5 text-adm-text-secondary">
            {demo.email} · {demo.password}
          </p>
          <p className="mt-0.5 text-xs text-adm-text-tertiary">Her şeyi deneyebilirsiniz; veriler her gece sıfırlanır.</p>
          <button
            type="button"
            onClick={() => {
              setEmail(demo.email);
              setPassword(demo.password);
            }}
            className="mt-1.5 text-xs font-semibold text-adm-primary hover:underline"
          >
            Bilgileri doldur
          </button>
        </div>
      )}
      <div className="space-y-1.5">
        <label
          htmlFor="admin-email"
          className="block text-[13px] font-medium text-adm-text"
        >
          E-posta
        </label>
        <input
          id="admin-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-adm-border bg-adm-surface-card px-3 py-2.5 text-sm text-adm-text outline-none focus:border-adm-primary rounded-lg"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="admin-password"
          className="block text-[13px] font-medium text-adm-text"
        >
          Parola
        </label>
        <input
          id="admin-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-adm-border bg-adm-surface-card px-3 py-2.5 text-sm text-adm-text outline-none focus:border-adm-primary rounded-lg"
        />
      </div>
      {error && <p className="text-xs text-adm-danger">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-adm-primary py-2.5 text-sm font-semibold text-adm-on-primary transition hover:bg-adm-primary-deep disabled:opacity-50"
      >
        {submitting ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
    </form>
  );
}
