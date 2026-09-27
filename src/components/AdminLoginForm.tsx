"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
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
      className="relative space-y-4 overflow-hidden border border-adm-border bg-adm-surface-container-low p-6"
    >
      <span className="absolute inset-x-0 top-0 h-[3px] bg-adm-primary" />
      <div className="space-y-1.5">
        <label
          htmlFor="admin-email"
          className="block text-xs font-medium text-adm-on-surface-variant"
        >
          E-posta
        </label>
        <input
          id="admin-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-adm-border bg-adm-surface-container-lowest px-3 py-2.5 text-sm text-adm-on-surface outline-none focus:border-adm-primary"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="admin-password"
          className="block text-xs font-medium text-adm-on-surface-variant"
        >
          Parola
        </label>
        <input
          id="admin-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-adm-border bg-adm-surface-container-lowest px-3 py-2.5 text-sm text-adm-on-surface outline-none focus:border-adm-primary"
        />
      </div>
      {error && <p className="text-xs text-adm-error">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-adm-primary py-2.5 text-sm font-medium text-adm-on-primary transition hover:bg-adm-primary-deep disabled:opacity-50"
      >
        {submitting ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
    </form>
  );
}
