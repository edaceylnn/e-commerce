"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FilterToolbar } from "@/components/admin/FilterToolbar";
import { FilterSelect } from "@/components/admin/FilterSelect";
import { SearchInput } from "@/components/admin/SearchInput";

export function AdminProductFilters({
  brands,
  totalCount,
  query,
  category,
  brand,
  stock,
  view,
}: {
  brands: readonly { slug: string; name: string }[];
  totalCount: number;
  query: string;
  category: string;
  brand: string;
  stock: string;
  view: string;
}) {
  const router = useRouter();

  function pushParams(next: { q?: string; category?: string; brand?: string; stock?: string }) {
    const params = new URLSearchParams();
    const nextQ = next.q ?? query;
    const nextCategory = next.category ?? category;
    const nextBrand = next.brand ?? brand;
    const nextStock = next.stock ?? stock;
    if (nextQ) params.set("q", nextQ);
    if (nextCategory) params.set("category", nextCategory);
    if (nextBrand) params.set("brand", nextBrand);
    if (nextStock) params.set("stock", nextStock);
    if (view && view !== "all") params.set("view", view);
    router.push(`/admin/products${params.toString() ? `?${params}` : ""}`);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    pushParams({ q: String(formData.get("q") ?? "") });
  }

  return (
    <FilterToolbar
      className="mb-3 border-t border-adm-border pt-3"
      resultLabel={
        <>
          <strong className="font-semibold text-adm-text">{totalCount}</strong> ürün gösteriliyor
        </>
      }
    >
        <form onSubmit={handleSubmit} className="min-w-56 flex-1">
          <SearchInput name="q" defaultValue={query} placeholder="Ürün ara" aria-label="Ürün ara" />
        </form>
        <FilterSelect value={brand} onChange={(e) => pushParams({ brand: e.target.value })}>
          <option value="">Marka</option>
          {brands.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={stock} onChange={(e) => pushParams({ stock: e.target.value })}>
          <option value="">Stok</option>
          <option value="critical">Kritik</option>
          <option value="in-stock">Stokta</option>
          <option value="out-of-stock">Tükendi</option>
        </FilterSelect>
    </FilterToolbar>
  );
}
