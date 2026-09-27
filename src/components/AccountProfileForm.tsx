"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormField, fieldInputClass } from "@/components/FormField";
import { PhoneInput } from "@/components/PhoneInput";
import { PrimaryButton } from "@/components/account/AccountButtons";
import { AccountCard } from "@/components/account/AccountCard";
import { Alert } from "@/components/Alert";

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return { firstName: fullName, lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

export function AccountProfileForm({
  initialName,
  initialEmail,
  initialPhone,
  initialBirthDate,
}: {
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  initialBirthDate: string;
}) {
  const router = useRouter();
  const { firstName: initialFirstName, lastName: initialLastName } = splitName(initialName);

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [birthDate, setBirthDate] = useState(initialBirthDate);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const emailChanged = email.trim() !== initialEmail;
  const hasChanges = useMemo(
    () =>
      firstName !== initialFirstName ||
      lastName !== initialLastName ||
      email !== initialEmail ||
      phone !== initialPhone ||
      birthDate !== initialBirthDate,
    [firstName, lastName, email, phone, birthDate, initialFirstName, initialLastName, initialEmail, initialPhone, initialBirthDate]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone: phone.trim() || null,
        birthDate: birthDate || null,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Güncellenemedi.");
      return;
    }
    setSuccess(true);
    router.refresh();
  }

  return (
    <AccountCard>
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="font-display text-2xl">Hesap Bilgilerim</h2>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Kişisel Bilgiler
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Ad" htmlFor="profile-first-name" required>
              <input
                id="profile-first-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={fieldInputClass()}
              />
            </FormField>
            <FormField label="Soyad" htmlFor="profile-last-name">
              <input
                id="profile-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={fieldInputClass()}
              />
            </FormField>
            <FormField label="Doğum Tarihi" htmlFor="profile-birth-date" hint="Opsiyonel">
              <input
                id="profile-birth-date"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={fieldInputClass()}
              />
            </FormField>
          </div>
        </div>

        <div className="border-t border-line pt-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
            İletişim
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="E-posta"
              htmlFor="profile-email"
              required
              hint={emailChanged ? "E-posta adresinizi değiştirirseniz doğrulama gerekebilir." : undefined}
            >
              <input
                id="profile-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldInputClass()}
              />
            </FormField>
            <FormField label="Telefon" htmlFor="profile-phone" hint="Opsiyonel">
              <PhoneInput id="profile-phone" value={phone} onChange={setPhone} />
            </FormField>
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">Bilgileriniz başarıyla güncellendi.</Alert>}

        <PrimaryButton type="submit" disabled={saving || !hasChanges} size="sm">
          {saving ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
        </PrimaryButton>
      </form>
    </AccountCard>
  );
}
