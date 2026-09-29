"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FilterToolbar } from "@/components/admin/FilterToolbar";
import { FilterSelect } from "@/components/admin/FilterSelect";
import { SearchInput } from "@/components/admin/SearchInput";
import {
  adminProductFilterParams,
  PRODUCT_STATUS_FILTERS,
  PRODUCT_STOCK_FILTERS,
  type AdminProductFilters as Filters,
} from "@/lib/admin-product-filters";

// Every way to narrow the product list, in one row: search, category,
// publish status and stock — plus the result count. The list itself is
// always newest first. (Brand isn't offered: the catalog has a single house
// brand. A ?brand= link still works.)
export function AdminProductFilters({
  categories,
  totalCount,
  filters,
}: {
  categories: readonly { slug: string; label: string }[];
  totalCount: number;
  filters: Filters;
}) {
  const router = useRouter();

  function pushParams(next: Partial<Record<keyof Filters, string>>) {
    const params = adminProductFilterParams({ ...filters, ...next } as Filters);
    router.push(`/admin/products${params.size ? `?${params}` : ""}`);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    pushParams({ q: String(formData.get("q") ?? "") });
  }

  return (
    <FilterToolbar
      className="mb-3"
      resultLabel={
        <>
          <strong className="font-semibold text-adm-text">{totalCount}</strong> ürün gösteriliyor
        </>
      }
    >
      <form onSubmit={handleSubmit} className="min-w-56 flex-1">
        <SearchInput name="q" defaultValue={filters.q ?? ""} placeholder="Ürün ara" aria-label="Ürün ara" />
      </form>
      <FilterSelect
        value={filters.category ?? ""}
        aria-label="Kategori"
        onChange={(e) => pushParams({ category: e.target.value })}
      >
        <option value="">Tüm kategoriler</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.label}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        value={filters.status ?? ""}
        aria-label="Yayın durumu"
        onChange={(e) => pushParams({ status: e.target.value })}
      >
        <option value="">Tüm durumlar</option>
        {PRODUCT_STATUS_FILTERS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        value={filters.stock ?? ""}
        aria-label="Stok durumu"
        onChange={(e) => pushParams({ stock: e.target.value })}
      >
        <option value="">Tüm stok durumları</option>
        {PRODUCT_STOCK_FILTERS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </FilterSelect>
    </FilterToolbar>
  );
}
