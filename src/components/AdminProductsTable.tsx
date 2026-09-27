"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHeadRow,
  TableHead,
  TableCell,
  TableEmptyState,
} from "@/components/admin/Table";
import { StatusBadge, type StatusBadgeVariant } from "@/components/admin/StatusBadge";
import { AdminProductRowActions } from "@/components/AdminProductRowActions";

type Row = {
  id: number;
  title: string;
  thumbnail: string;
  brand: string | null;
  categoryLabel: string;
  categorySlug: string;
  price: number;
  stock: number;
  isNew: boolean;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  variantCount: number;
  sku: string | null;
  unitsSold: number;
  isLowStock: boolean;
  isPartiallyCritical: boolean;
};

// A single combined status per row (mirrors the reference design's one
// DURUM badge) — stock-out/critical takes priority over publish state,
// since an admin scanning the list cares more about "can this even be sold
// right now" than the draft/live flag once stock is the blocker.
function combinedStatus(product: Row): { variant: StatusBadgeVariant; label: string } {
  if (product.stock === 0) return { variant: "danger", label: "Stokta yok" };
  if (product.isLowStock) return { variant: "warning", label: "Az stok" };
  if (product.status === "DRAFT") return { variant: "neutral", label: "Taslak" };
  if (product.status === "ARCHIVED") return { variant: "neutral", label: "Arşiv" };
  return { variant: "success", label: "Aktif" };
}

// The stock bar's own color scale is independent of the DURUM badge's
// semantic colors — the bar just answers "how full", so a healthy quantity
// reads dark/neutral rather than green, per the reference design.
function stockBarTone(product: Row): { width: number; color: string } {
  if (product.stock === 0) return { width: 0, color: "bg-adm-danger" };
  if (product.isLowStock) return { width: 30, color: "bg-adm-warning" };
  return { width: 100, color: "bg-adm-text" };
}

export function AdminProductsTable({
  products,
  embedded = false,
}: {
  products: Row[];
  // true when a parent already supplies the white rounded/bordered card
  // (the Products page's unified tabs+filters+table container) — skips this
  // component's own outer card chrome so the table doesn't nest a card
  // inside a card.
  embedded?: boolean;
}) {
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const rows = useMemo(
    () => products.filter((product) => !deletedIds.has(product.id)),
    [deletedIds, products]
  );

  // No bulk action exists yet for products (unlike Orders' bulk-ship) — this
  // is selection *infrastructure* only, ready for one to hook into later,
  // per the request to prepare the UI without inventing new destructive
  // behavior that wasn't asked for.
  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }
  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    setError(null);
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Silinemedi.");
      return;
    }
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  return (
    <div>
      {error && <p className="mb-3 text-xs text-adm-danger">{error}</p>}
      {selected.size > 0 && (
        <p className="mb-2 text-xs font-medium text-adm-text-secondary">{selected.size} ürün seçildi</p>
      )}
      <Table embedded={embedded} minWidth="860px">
        <TableHeader>
          <TableHeadRow>
            <TableHead className="w-8">
              <input
                type="checkbox"
                checked={rows.length > 0 && selected.size === rows.length}
                onChange={toggleAll}
                className="accent-adm-primary"
                aria-label="Tümünü seç"
              />
            </TableHead>
            <TableHead>Ürün</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Fiyat</TableHead>
            <TableHead>Satış</TableHead>
            <TableHead>Stok</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead />
          </TableHeadRow>
        </TableHeader>
        <TableBody>
          {rows.map((product) => {
            const status = combinedStatus(product);
            const bar = stockBarTone(product);
            const subtext = product.sku ?? product.brand ?? "Markasız";
            const isSelected = selected.has(product.id);
            return (
              <TableRow key={product.id} selected={isSelected}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(product.id)}
                    className="accent-adm-primary"
                    aria-label={`${product.title} seç`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-adm-surface-secondary">
                      <Image src={product.thumbnail} alt="" fill sizes="44px" className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-adm-text">{product.title}</p>
                      <p className="truncate text-xs text-adm-text-tertiary">{subtext}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-adm-text-secondary">{product.categoryLabel}</TableCell>
                <TableCell className="font-semibold text-adm-text">{formatPrice(product.price)}</TableCell>
                <TableCell className="text-adm-text-tertiary">
                  {product.unitsSold > 0 ? product.unitsSold : "—"}
                </TableCell>
                <TableCell>
                  {/* Left slot is the real stock count; a right-aligned
                      "N depo" slot would go in this same flex row if the
                      catalog ever grows a multi-warehouse model — there's
                      only ever one implicit stock pool today, so nothing is
                      rendered there rather than showing a fake constant. */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-adm-text">{product.stock} adet</span>
                  </div>
                  <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-adm-surface-secondary">
                    <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${bar.width}%` }} />
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge variant={status.variant} size="sm">
                    {status.label}
                  </StatusBadge>
                </TableCell>
                <TableCell align="right" className="whitespace-nowrap">
                  <AdminProductRowActions productId={product.id} onDelete={handleDelete} />
                </TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 && <TableEmptyState colSpan={8}>Henüz ürün yok.</TableEmptyState>}
        </TableBody>
      </Table>
    </div>
  );
}
