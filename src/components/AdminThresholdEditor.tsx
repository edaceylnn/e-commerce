"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminThresholdEditor({
  endpoint,
  value,
  effectiveValue,
  nullable = true,
}: {
  endpoint: string;
  value: number | null;
  effectiveValue: number;
  // Product-level thresholds have no "inherit from parent" concept (the
  // product's own field can't be null) — only variant-level ones can be
  // cleared back to "inherit from the product".
  nullable?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value !== null ? String(value) : "");
  const [saving, setSaving] = useState(false);

  const canSave = nullable || input !== "";

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const nextValue = input === "" ? null : Number(input);
    await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lowStockThreshold: nextValue }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-adm-text underline decoration-dotted underline-offset-2 hover:text-adm-primary"
      >
        {effectiveValue}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={nullable ? "Varsayılan" : undefined}
        className="w-20 border border-adm-border bg-adm-surface-card p-1.5 text-sm text-adm-text outline-none focus:border-adm-primary rounded-lg"
      />
      <button
        onClick={handleSave}
        disabled={saving || !canSave}
        className="text-xs font-medium text-adm-primary hover:underline disabled:opacity-50"
      >
        Kaydet
      </button>
      <button
        onClick={() => setEditing(false)}
        className="text-xs text-adm-text-secondary hover:underline"
      >
        Vazgeç
      </button>
    </div>
  );
}
