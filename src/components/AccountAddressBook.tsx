"use client";

import { useState } from "react";
import { AddressForm, type AddressFormValues } from "@/components/AddressForm";
import { AddressCard, type SavedAddress } from "@/components/AddressCard";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Alert } from "@/components/Alert";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/account/AccountButtons";
import { MapPinIcon } from "@/components/icons/AccountIcons";

export function AccountAddressBook({
  addresses,
  initialShowForm = false,
}: {
  addresses: SavedAddress[];
  initialShowForm?: boolean;
}) {
  const [rows, setRows] = useState(addresses);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(initialShowForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    setRows((prev) =>
      applyDefaults(
        [{ id: data.id, ...values }, ...prev],
        values
      )
    );
    setShowNewForm(false);
  }

  async function handleUpdate(id: string, values: AddressFormValues) {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Adres güncellenemedi.");
      return;
    }
    setRows((prev) =>
      applyDefaults(
        prev.map((a) => (a.id === id ? { id, ...values } : a)),
        values,
        id
      )
    );
    setEditingId(null);
  }

  // Mirrors the API's own "only one default per type" rule locally so the
  // UI doesn't need a full refetch after every save.
  function applyDefaults(
    list: SavedAddress[],
    values: AddressFormValues,
    keepId?: string
  ): SavedAddress[] {
    return list.map((a) => {
      const isTarget = keepId ? a.id === keepId : a === list[0];
      if (isTarget) return a;
      return {
        ...a,
        isDefaultShipping: values.isDefaultShipping ? false : a.isDefaultShipping,
        isDefaultBilling: values.isDefaultBilling ? false : a.isDefaultBilling,
      };
    });
  }

  async function handleSetDefault(id: string, field: "isDefaultShipping" | "isDefaultBilling") {
    setError(null);
    const res = await fetch(`/api/addresses/${id}/default`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Güncellenemedi.");
      return;
    }
    setRows((prev) =>
      prev.map((a) => ({ ...a, [field]: a.id === id }))
    );
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/addresses/${pendingDeleteId}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setError(data.error ?? "Adres silinemedi.");
      setPendingDeleteId(null);
      return;
    }
    setRows((prev) => prev.filter((a) => a.id !== pendingDeleteId));
    setPendingDeleteId(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-light tracking-title text-2xl">Adreslerim</h2>
        {!showNewForm && (
          <PrimaryButton size="sm" onClick={() => setShowNewForm(true)}>
            + Yeni Adres Ekle
          </PrimaryButton>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {showNewForm && (
        <div className="border border-line p-4 sm:p-5">
          <AddressForm
            submitLabel="Adresi Kaydet"
            submitting={submitting}
            onSubmit={handleCreate}
            onCancel={() => setShowNewForm(false)}
          />
        </div>
      )}

      {rows.length === 0 && !showNewForm ? (
        <EmptyState
          icon={MapPinIcon}
          title="Henüz kayıtlı adresiniz yok."
          description="Hızlı ödeme için yukarıdan bir teslimat adresi ekleyin."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((address) =>
            editingId === address.id ? (
              <div key={address.id} className="border border-line p-4 sm:p-5">
                <AddressForm
                  initial={address}
                  submitLabel="Güncelle"
                  submitting={submitting}
                  onSubmit={(values) => handleUpdate(address.id, values)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={() => setEditingId(address.id)}
                onDelete={() => setPendingDeleteId(address.id)}
                onSetDefault={(field) => handleSetDefault(address.id, field)}
              />
            )
          )}
        </div>
      )}

      <ConfirmModal
        open={!!pendingDeleteId}
        title="Bu adresi silmek istediğinize emin misiniz?"
        description="Bu işlem geri alınamaz."
        confirmLabel="Sil"
        danger
        submitting={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
