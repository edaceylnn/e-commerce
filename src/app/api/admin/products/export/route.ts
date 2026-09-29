import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { effectiveLowStockThreshold, isCriticalStock } from "@/lib/stock";
import type { Prisma } from "@/generated/prisma/client";
import { ADMIN_PRODUCT_ORDER, parseAdminProductFilters, productStatusFor } from "@/lib/admin-product-filters";

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Taslak",
  ACTIVE: "Yayında",
  ARCHIVED: "Arşiv",
};

// Uses the products list page's own filters (see admin-product-filters.ts),
// so "Dışa Aktar" exports the same rows the admin is looking at — same
// pattern as /api/admin/orders/export (Bölüm 16/39) — including the list's
// newest-first order.
export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const { q, category, brand, stock, ...filters } = parseAdminProductFilters({
    q: params.get("q"),
    category: params.get("category"),
    brand: params.get("brand"),
    status: params.get("status"),
    stock: params.get("stock"),
    view: params.get("view"),
  });
  const status = productStatusFor(filters.status);

  const where: Prisma.ProductWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  if (category) where.category = { slug: category };
  if (brand) where.brand = { slug: brand };
  if (status) where.status = status;

  const products = await prisma.product.findMany({
    where,
    include: { category: true, brand: true, variants: true },
    orderBy: ADMIN_PRODUCT_ORDER,
  });
  const filteredProducts = products.filter((product) => {
    const variantCritical = product.variants.map((v) =>
      isCriticalStock(v.stock, effectiveLowStockThreshold(product.lowStockThreshold, v.lowStockThreshold))
    );
    const isLowStock = product.variants.length > 0
      ? variantCritical.some(Boolean)
      : isCriticalStock(product.stock, product.lowStockThreshold);

    if (stock === "critical" && !isLowStock) return false;
    if (stock === "in-stock" && product.stock <= 0) return false;
    if (stock === "out-of-stock" && product.stock !== 0) return false;
    return true;
  });

  const header = [
    "ID",
    "Başlık",
    "Kategori",
    "Marka",
    "Fiyat",
    "İndirim (%)",
    "Stok",
    "Durum",
    "Varyant Sayısı",
    "İlk SKU",
  ];
  const rows = filteredProducts.map((p) =>
    [
      String(p.id),
      p.title,
      p.category.label,
      p.brand?.name ?? "",
      Number(p.price).toFixed(2),
      Number(p.discountPercentage).toFixed(0),
      String(p.stock),
      STATUS_LABELS[p.status] ?? p.status,
      String(p.variants.length),
      p.variants[0]?.sku ?? "",
    ].map(csvCell)
  );

  const csv = [header.map(csvCell).join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="urunler-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
