import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ALL_ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/order-status";
import type { Prisma } from "@/generated/prisma/client";

function isOrderStatus(value: string): value is (typeof ALL_ORDER_STATUSES)[number] {
  return (ALL_ORDER_STATUSES as readonly string[]).includes(value);
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

// Mirrors the orders list page's own filters exactly, so "Dışa Aktar"
// always exports what the admin is currently looking at. No background
// queue for very large exports (Bölüm 16's edge case) — this demo's order
// volumes don't need one; a hard cap just guards against a runaway query.
const EXPORT_ROW_CAP = 5000;

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? undefined;
  const payment = params.get("payment") ?? undefined;
  const q = params.get("q") ?? undefined;
  const dateFrom = params.get("dateFrom") ?? undefined;
  const dateTo = params.get("dateTo") ?? undefined;
  const minTotal = params.get("minTotal") ?? undefined;
  const maxTotal = params.get("maxTotal") ?? undefined;

  const where: Prisma.OrderWhereInput = {};
  if (status && isOrderStatus(status)) where.status = status;
  if (payment === "paid") where.paidAt = { not: null };
  if (payment === "unpaid") where.paidAt = null;
  if (q?.trim()) {
    where.OR = [
      { orderNumber: { contains: q.trim(), mode: "insensitive" } },
      { user: { name: { contains: q.trim(), mode: "insensitive" } } },
    ];
  }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999`) } : {}),
    };
  }
  if (minTotal || maxTotal) {
    where.total = {
      ...(minTotal ? { gte: Number(minTotal) } : {}),
      ...(maxTotal ? { lte: Number(maxTotal) } : {}),
    };
  }

  const orders = await prisma.order.findMany({
    where,
    include: { user: true, items: true },
    orderBy: { createdAt: "desc" },
    take: EXPORT_ROW_CAP,
  });

  const header = [
    "Sipariş No",
    "Müşteri",
    "E-posta",
    "Tarih",
    "Ürün Sayısı",
    "Toplam",
    "Ödeme Durumu",
    "Sipariş Durumu",
    "Kargo Takip No",
  ];
  const rows = orders.map((o) =>
    [
      o.orderNumber,
      o.user.name,
      o.user.email,
      o.createdAt.toLocaleDateString("tr-TR"),
      String(o.items.reduce((sum, i) => sum + i.quantity, 0)),
      Number(o.total).toFixed(2),
      o.paidAt ? "Ödendi" : "Ödeme Bekliyor",
      ORDER_STATUS_LABELS[o.status] ?? o.status,
      o.trackingNumber ?? "",
    ].map(csvCell)
  );

  const csv = [header.map(csvCell).join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="siparisler-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
