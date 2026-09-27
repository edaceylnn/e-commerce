"use client";

import { useState } from "react";
import {
  Table,
  TableHeader,
  TableHeadRow,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmptyState,
} from "@/components/admin/Table";
import { StatusBadge, type StatusBadgeVariant } from "@/components/admin/StatusBadge";
import { formatPrice, getInitials } from "@/lib/format";

export type CustomerSegment = "VIP" | "Sadık" | "Yeni" | "Riskli" | "Standart";

const SEGMENT_VARIANT: Record<CustomerSegment, StatusBadgeVariant> = {
  VIP: "purple",
  Sadık: "success",
  Yeni: "info",
  Riskli: "warning",
  Standart: "neutral",
};

type Row = {
  id: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "ADMIN";
  createdAtLabel: string;
  orderCount: number;
  returnCount: number;
  totalSpent: number;
  segment: CustomerSegment;
  lastOrderLabel: string;
};

export function AdminUsersTable({
  users,
  currentUserId,
}: {
  users: Row[];
  currentUserId: string;
}) {
  const [rows, setRows] = useState(users);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleToggle(id: string, currentRole: "CUSTOMER" | "ADMIN") {
    const nextRole = currentRole === "ADMIN" ? "CUSTOMER" : "ADMIN";
    setPendingId(id);
    setError(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    const data = await res.json();
    setPendingId(null);

    if (!res.ok) {
      setError(data.error ?? "Güncellenemedi.");
      return;
    }
    setRows((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: nextRole } : u))
    );
  }

  return (
    <div>
      {error && <p className="mb-3 text-xs text-adm-danger">{error}</p>}
      <Table minWidth="900px">
        <TableHeader>
          <TableHeadRow>
            <TableHead>Müşteri</TableHead>
            <TableHead>Segment</TableHead>
            <TableHead align="right">Sipariş</TableHead>
            <TableHead align="right">İade</TableHead>
            <TableHead align="right">Toplam Harcama</TableHead>
            <TableHead>Son Sipariş</TableHead>
            <TableHead align="right">Rol</TableHead>
          </TableHeadRow>
        </TableHeader>
        <TableBody>
          {rows.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      user.segment === "VIP"
                        ? "bg-adm-purple text-white"
                        : "bg-adm-primary text-adm-on-primary"
                    }`}
                  >
                    {getInitials(user.name, user.email)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-adm-text">{user.name}</p>
                    <p className="truncate text-xs text-adm-text-tertiary">{user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge variant={SEGMENT_VARIANT[user.segment]} size="sm">
                  {user.segment}
                </StatusBadge>
              </TableCell>
              <TableCell align="right" className="text-adm-text">
                {user.orderCount}
              </TableCell>
              <TableCell align="right" className="text-adm-text-secondary">
                {user.returnCount}
              </TableCell>
              <TableCell align="right" className="font-semibold text-adm-text">
                {formatPrice(user.totalSpent)}
              </TableCell>
              <TableCell className="text-adm-text-secondary">{user.lastOrderLabel}</TableCell>
              <TableCell align="right" className="whitespace-nowrap">
                {user.id === currentUserId ? (
                  <span className="text-xs text-adm-text-tertiary">Siz</span>
                ) : (
                  <button
                    onClick={() => handleToggle(user.id, user.role)}
                    disabled={pendingId === user.id}
                    className="rounded-lg border border-adm-border px-2.5 py-1 text-xs font-medium text-adm-text-secondary transition hover:border-adm-text-tertiary hover:text-adm-text disabled:opacity-50"
                  >
                    {user.role === "ADMIN" ? "Müşteri yap" : "Admin yap"}
                  </button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableEmptyState colSpan={7}>Bu segmentte müşteri yok.</TableEmptyState>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
