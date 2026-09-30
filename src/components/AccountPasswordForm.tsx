"use client";

import { FormEvent, useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { PrimaryButton } from "@/components/account/AccountButtons";
import { AccountCard } from "@/components/account/AccountCard";
import { Alert } from "@/components/Alert";
import { CheckIcon } from "@/components/icons/AccountIcons";
import { PASSWORD_REQUIREMENTS } from "@/lib/password-rules";

const REQUIREMENTS = PASSWORD_REQUIREMENTS;

export function AccountPasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const requirementsMet = REQUIREMENTS.every((r) => r.test(newPassword));
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = currentPassword.length > 0 && requirementsMet && passwordsMatch;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!passwordsMatch) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Güncellenemedi.");
      return;
    }
    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <AccountCard>
      <form onSubmit={handleSubmit} className="space-y-5">
        <h2 className="font-light tracking-title text-2xl">Şifre Değiştir</h2>

        <PasswordField
          label="Mevcut Şifre"
          value={currentPassword}
          onChange={setCurrentPassword}
          required
          autoComplete="current-password"
        />
        <PasswordField
          label="Yeni Şifre"
          value={newPassword}
          onChange={setNewPassword}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <PasswordField
          label="Yeni Şifre (Tekrar)"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
          autoComplete="new-password"
          error={confirmPassword.length > 0 && !passwordsMatch ? "Şifreler eşleşmiyor." : null}
        />

        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {REQUIREMENTS.map((req) => {
            const met = req.test(newPassword);
            return (
              <li
                key={req.label}
                className={`flex items-center gap-1.5 text-xs ${met ? "text-success" : "text-ink-soft"}`}
              >
                <CheckIcon className="h-3.5 w-3.5 shrink-0" />
                {req.label}
              </li>
            );
          })}
        </ul>

        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">Şifreniz başarıyla değiştirildi.</Alert>}

        <PrimaryButton type="submit" disabled={saving || !canSubmit} size="sm">
          {saving ? "Kaydediliyor…" : "Şifremi Değiştir"}
        </PrimaryButton>
      </form>
    </AccountCard>
  );
}
