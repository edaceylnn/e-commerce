"use client";

import { FormEvent, useState } from "react";
import { FormField, fieldInputClass } from "@/components/FormField";
import { PhoneInput } from "@/components/PhoneInput";
import { PrimaryButton, TextButton } from "@/components/account/AccountButtons";
import { Alert } from "@/components/Alert";
import { TR_PROVINCES } from "@/lib/tr-provinces";

export type AddressFormValues = {
  type: "SHIPPING" | "BILLING";
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  district: string;
  postalCode: string;
  // Optional so call sites that don't deal with defaults at all (e.g. the
  // checkout address picker) don't have to know about these fields.
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
};

export function AddressForm({
  initial,
  submitLabel,
  submitting,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<AddressFormValues>;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (values: AddressFormValues) => void;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<AddressFormValues>({
    type: initial?.type ?? "SHIPPING",
    label: initial?.label ?? "",
    fullName: initial?.fullName ?? "",
    phone: initial?.phone ?? "",
    line1: initial?.line1 ?? "",
    line2: initial?.line2 ?? "",
    city: initial?.city ?? "",
    district: initial?.district ?? "",
    postalCode: initial?.postalCode ?? "",
    isDefaultShipping: initial?.isDefaultShipping ?? false,
    isDefaultBilling: initial?.isDefaultBilling ?? false,
  });

  function set<K extends keyof AddressFormValues>(key: K, value: AddressFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Adres Tipi" htmlFor="addr-type">
          <select
            id="addr-type"
            value={values.type}
            onChange={(e) => set("type", e.target.value as AddressFormValues["type"])}
            className={fieldInputClass()}
          >
            <option value="SHIPPING">Teslimat Adresi</option>
            <option value="BILLING">Fatura Adresi</option>
          </select>
        </FormField>
        <FormField label="Adres Etiketi" htmlFor="addr-label" hint="Ör. Ev, İş — opsiyonel">
          <input
            id="addr-label"
            value={values.label}
            onChange={(e) => set("label", e.target.value)}
            className={fieldInputClass()}
          />
        </FormField>
        <FormField label="Ad Soyad" htmlFor="addr-name" required className="sm:col-span-2">
          <input
            id="addr-name"
            required
            value={values.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            className={fieldInputClass()}
          />
        </FormField>
        <FormField label="Telefon" htmlFor="addr-phone" required className="sm:col-span-2">
          <PhoneInput
            id="addr-phone"
            required
            value={values.phone}
            onChange={(v) => set("phone", v)}
          />
        </FormField>
        <FormField label="Adres" htmlFor="addr-line1" required className="sm:col-span-2">
          <input
            id="addr-line1"
            required
            value={values.line1}
            onChange={(e) => set("line1", e.target.value)}
            className={fieldInputClass()}
          />
        </FormField>
        <FormField label="Adres Devamı" htmlFor="addr-line2" hint="Opsiyonel" className="sm:col-span-2">
          <input
            id="addr-line2"
            value={values.line2}
            onChange={(e) => set("line2", e.target.value)}
            className={fieldInputClass()}
          />
        </FormField>
        <FormField label="İl" htmlFor="addr-city" required>
          <select
            id="addr-city"
            required
            value={values.city}
            onChange={(e) => set("city", e.target.value)}
            className={fieldInputClass()}
          >
            <option value="" disabled>
              İl seçin
            </option>
            {TR_PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="İlçe" htmlFor="addr-district" required>
          <input
            id="addr-district"
            required
            value={values.district}
            onChange={(e) => set("district", e.target.value)}
            className={fieldInputClass()}
          />
        </FormField>
        <FormField label="Posta Kodu" htmlFor="addr-postal" required className="sm:col-span-2">
          <input
            id="addr-postal"
            required
            inputMode="numeric"
            value={values.postalCode}
            onChange={(e) => set("postalCode", e.target.value)}
            className={fieldInputClass()}
          />
        </FormField>
      </div>

      <div className="space-y-2 border-t border-line pt-4">
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={values.isDefaultShipping}
            onChange={(e) => set("isDefaultShipping", e.target.checked)}
            className="h-4 w-4 border-line text-primary accent-primary"
          />
          Varsayılan teslimat adresi yap
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={values.isDefaultBilling}
            onChange={(e) => set("isDefaultBilling", e.target.checked)}
            className="h-4 w-4 border-line text-primary accent-primary"
          />
          Varsayılan fatura adresi yap
        </label>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex items-center gap-4">
        <PrimaryButton type="submit" disabled={submitting} size="sm">
          {submitting ? "Kaydediliyor…" : submitLabel}
        </PrimaryButton>
        {onCancel && <TextButton onClick={onCancel}>Vazgeç</TextButton>}
      </div>
    </form>
  );
}
