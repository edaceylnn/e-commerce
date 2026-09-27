"use client";

import { useState } from "react";
import Link from "next/link";

export function AdminProductRowActions({
  productId,
  onDelete,
}: {
  productId: number;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);

  function handleDelete() {
    setOpen(false);
    onDelete(productId);
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="İşlemler"
        className="rounded-md p-1.5 text-adm-text-tertiary transition hover:bg-adm-surface-secondary hover:text-adm-text"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <>
          <button
            aria-label="Kapat"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-1 w-44 border border-adm-border bg-adm-surface-card py-1">
            <Link
              href={`/admin/products/${productId}/edit`}
              className="block px-3.5 py-2 text-sm text-adm-text transition hover:bg-adm-surface-secondary"
            >
              Düzenle
            </Link>
            <button
              onClick={handleDelete}
              className="block w-full px-3.5 py-2 text-left text-sm text-adm-danger transition hover:bg-adm-danger-soft"
            >
              Sil
            </button>
          </div>
        </>
      )}
    </div>
  );
}
