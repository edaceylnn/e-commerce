"use client";

import { useRouter } from "next/navigation";
import { FilterSelect } from "@/components/admin/FilterSelect";

export function AdminProductFilterPills({
  categories,
  category,
  q,
  brand,
  stock,
  view,
}: {
  categories: readonly { slug: string; label: string }[];
  category: string;
  q: string;
  brand: string;
  stock: string;
  view: string;
}) {
  const router = useRouter();

  function pushParams(next: { category?: string }) {
    const params = new URLSearchParams();
    const nextCategory = next.category ?? category;
    if (q) params.set("q", q);
    if (nextCategory) params.set("category", nextCategory);
    if (brand) params.set("brand", brand);
    if (stock) params.set("stock", stock);
    if (view && view !== "all") params.set("view", view);
    router.push(`/admin/products${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <FilterSelect value={category} onChange={(e) => pushParams({ category: e.target.value })}>
      <option value="">Kategori</option>
      {categories.map((c) => (
        <option key={c.slug} value={c.slug}>
          {c.label}
        </option>
      ))}
    </FilterSelect>
  );
}
