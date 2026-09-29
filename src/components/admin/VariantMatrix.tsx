"use client";

import { useState } from "react";
import { AdminButton } from "@/components/admin/Button";
import { TrashIcon } from "@/components/icons/AdminIcons";
import type { AdminProductVariantInitial } from "@/components/AdminProductForm";

const inputClass =
  "w-full rounded-md border border-adm-border bg-adm-surface-card px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-primary";

type Color = { id: string; name: string; hex: string };
type Size = { id: string; label: string };

function unique(ids: string[]) {
  return [...new Set(ids)];
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        selected
          ? "border-adm-primary bg-adm-primary text-adm-on-primary"
          : "border-adm-border text-adm-text-secondary hover:border-adm-text-tertiary"
      }`}
    >
      {children}
    </button>
  );
}

// Pick colors and sizes; every color × size combination becomes a row with
// its own stock. SKUs left blank are generated on save (ED-<id>-RENK-BEDEN).
// Removing a single row keeps the selections, for a combination that
// simply isn't produced.
export function VariantMatrix({
  colors,
  sizes,
  variants,
  onChange,
}: {
  colors: Color[];
  sizes: Size[];
  variants: AdminProductVariantInitial[];
  onChange: (variants: AdminProductVariantInitial[]) => void;
}) {
  const [colorIds, setColorIds] = useState(() => unique(variants.map((v) => v.colorId)));
  const [sizeIds, setSizeIds] = useState(() => unique(variants.map((v) => v.sizeId)));
  const [bulkStock, setBulkStock] = useState("");

  const colorById = new Map(colors.map((c) => [c.id, c]));
  const sizeById = new Map(sizes.map((s) => [s.id, s]));
  const sizeOrder = new Map(sizes.map((s, i) => [s.id, i]));

  function sorted(rows: AdminProductVariantInitial[], colorOrder: string[]) {
    return [...rows].sort(
      (a, b) =>
        colorOrder.indexOf(a.colorId) - colorOrder.indexOf(b.colorId) ||
        (sizeOrder.get(a.sizeId) ?? 0) - (sizeOrder.get(b.sizeId) ?? 0)
    );
  }

  function withCombos(colorList: string[], sizeList: string[]) {
    const existing = new Set(variants.map((v) => `${v.colorId}|${v.sizeId}`));
    const added = colorList.flatMap((colorId) =>
      sizeList
        .filter((sizeId) => !existing.has(`${colorId}|${sizeId}`))
        .map((sizeId) => ({ colorId, sizeId, sku: "", stock: 0 }))
    );
    return [...variants, ...added];
  }

  function toggleColor(id: string) {
    if (colorIds.includes(id)) {
      const next = colorIds.filter((c) => c !== id);
      setColorIds(next);
      onChange(variants.filter((v) => v.colorId !== id));
    } else {
      const next = [...colorIds, id];
      setColorIds(next);
      onChange(sorted(withCombos([id], sizeIds), next));
    }
  }

  function toggleSize(id: string) {
    if (sizeIds.includes(id)) {
      setSizeIds(sizeIds.filter((s) => s !== id));
      onChange(variants.filter((v) => v.sizeId !== id));
    } else {
      setSizeIds([...sizeIds, id]);
      onChange(sorted(withCombos(colorIds, [id]), colorIds));
    }
  }

  function update(index: number, patch: Partial<AdminProductVariantInitial>) {
    onChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function applyBulkStock() {
    const stock = Number(bulkStock);
    if (bulkStock === "" || !Number.isFinite(stock) || stock < 0) return;
    onChange(variants.map((v) => ({ ...v, stock })));
  }

  if (colors.length === 0 || sizes.length === 0) {
    return (
      <p className="text-xs text-adm-danger">
        Varyant eklemeden önce en az bir renk ve bir beden tanımlanmış olmalı (Diğer → Renkler / Bedenler).
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs text-adm-text-secondary">Renkler</p>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <Chip key={c.id} selected={colorIds.includes(c.id)} onClick={() => toggleColor(c.id)}>
              <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
              {c.name}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs text-adm-text-secondary">Bedenler</p>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <Chip key={s.id} selected={sizeIds.includes(s.id)} onClick={() => toggleSize(s.id)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </div>

      {variants.length === 0 ? (
        <p className="rounded-lg bg-adm-surface-secondary px-3 py-2 text-xs text-adm-text-secondary">
          Renk ve beden seçin; her kombinasyon için stok satırı otomatik oluşur.
        </p>
      ) : (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-adm-text-secondary">
              {variants.length} varyant · SKU boş bırakılırsa kaydederken otomatik oluşturulur
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                placeholder="Stok"
                aria-label="Tüm varyantlara uygulanacak stok"
                value={bulkStock}
                onChange={(e) => setBulkStock(e.target.value)}
                className="w-20 rounded-md border border-adm-border bg-adm-surface-card px-3 py-1.5 text-sm text-adm-text outline-none focus:border-adm-primary"
              />
              <AdminButton
                type="button"
                size="sm"
                variant="secondary"
                className="whitespace-nowrap"
                onClick={applyBulkStock}
              >
                Hepsine uygula
              </AdminButton>
            </div>
          </div>
          <div className="hidden grid-cols-[1fr_70px_1fr_90px_36px] gap-2 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-adm-text-tertiary sm:grid">
            <span>Renk</span>
            <span>Beden</span>
            <span>SKU</span>
            <span>Stok</span>
            <span />
          </div>
          <div className="space-y-1.5">
            {variants.map((v, index) => {
              const color = colorById.get(v.colorId);
              const size = sizeById.get(v.sizeId);
              const label = `${color?.name ?? "?"} ${size?.label ?? "?"}`;
              return (
                <div
                  key={v.id ?? `${v.colorId}|${v.sizeId}`}
                  className="grid grid-cols-[1fr_70px] gap-2 sm:grid-cols-[1fr_70px_1fr_90px_36px] sm:items-center"
                >
                  <span className="flex items-center gap-2 text-sm text-adm-text">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-adm-border"
                      style={{ backgroundColor: color?.hex ?? "#e8e3df" }}
                    />
                    {color?.name ?? "?"}
                  </span>
                  <span className="text-sm font-medium text-adm-text">{size?.label ?? "?"}</span>
                  <input
                    placeholder="Otomatik"
                    aria-label={`${label} SKU`}
                    value={v.sku}
                    onChange={(e) => update(index, { sku: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min="0"
                    aria-label={`${label} stok`}
                    value={v.stock}
                    onChange={(e) => update(index, { stock: Number(e.target.value) })}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => onChange(variants.filter((_, i) => i !== index))}
                    aria-label={`${label} varyantını kaldır`}
                    className="inline-flex justify-center rounded-md p-2 text-adm-danger transition hover:bg-adm-danger-soft"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
