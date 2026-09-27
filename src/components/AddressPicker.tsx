"use client";

import { useState } from "react";
import { AddressForm, type AddressFormValues } from "@/components/AddressForm";

export type SavedAddress = AddressFormValues & { id: string };

export function AddressPicker({
  addresses,
  selectedId,
  onSelect,
  onCreated,
  defaultType,
}: {
  addresses: SavedAddress[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreated: (address: SavedAddress) => void;
  defaultType: "SHIPPING" | "BILLING";
}) {
  const [showForm, setShowForm] = useState(addresses.length === 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(values: AddressFormValues) {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Adres kaydedilemedi.");
      return;
    }

    const created: SavedAddress = { id: data.id, ...values };
    onCreated(created);
    onSelect(created.id);
    setShowForm(false);
  }

  return (
    <div className="space-y-3">
      {addresses.map((address) => (
        <label
          key={address.id}
          className={`flex cursor-pointer items-start gap-3 border p-4 text-sm transition ${
            selectedId === address.id ? "border-primary" : "border-line"
          }`}
        >
          <input
            type="radio"
            checked={selectedId === address.id}
            onChange={() => onSelect(address.id)}
            className="mt-1"
          />
          <div>
            <p className="font-semibold">
              {address.fullName}
              {address.label ? ` · ${address.label}` : ""}
            </p>
            <p className="text-ink-soft">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""} — {address.district}/
              {address.city}
            </p>
          </div>
        </label>
      ))}

      {showForm ? (
        <AddressForm
          initial={{ type: defaultType }}
          submitLabel="Adresi Kaydet"
          submitting={submitting}
          error={error}
          onSubmit={handleCreate}
          onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-xs font-semibold uppercase tracking-wide text-primary underline underline-offset-4"
        >
          Yeni adres ekle
        </button>
      )}
    </div>
  );
}
