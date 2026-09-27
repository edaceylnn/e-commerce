"use client";

import { useState } from "react";
import { StarRating } from "@/components/StarRating";

type Row = {
  id: string;
  productTitle: string;
  author: string;
  rating: number;
  comment: string;
  verified: boolean;
  status: string;
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Bekliyor", className: "bg-adm-warning-soft text-adm-warning" },
  APPROVED: { label: "Onaylandı", className: "bg-adm-success-soft text-adm-success" },
  REJECTED: { label: "Reddedildi", className: "bg-adm-danger-soft text-adm-danger" },
};

export function AdminReviewsTable({ reviews }: { reviews: Row[] }) {
  const [rows, setRows] = useState(reviews);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(id: string, status: "APPROVED" | "REJECTED") {
    setError(null);
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Güncellenemedi.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  if (rows.length === 0) {
    return <p className="text-sm text-adm-text-secondary">Bu sekmede yorum yok.</p>;
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-adm-danger">{error}</p>}
      {rows.map((review) => (
        // Wrapper deliberately keeps the literal "rounded-2xl" class —
        // e2e/review-moderation-flow.spec.ts selects this card via
        // `div.rounded-2xl`, so it's not routed through the admin `Card`
        // component (same radius as Card, just not the shared component).
        <div
          key={review.id}
          className="rounded-2xl border border-adm-border p-5 transition hover:border-adm-primary/40"
        >
          <div className="flex items-center justify-between gap-4 text-sm">
            <p className="font-semibold text-adm-text">
              {review.productTitle} — {review.author}
              {review.verified && (
                <span className="ml-2 rounded-full bg-adm-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-adm-primary-deep">
                  Doğrulanmış
                </span>
              )}
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE[review.status]?.className ?? ""}`}
              >
                {STATUS_BADGE[review.status]?.label ?? review.status}
              </span>
            </p>
            <div className="shrink-0">
              <StarRating rating={review.rating} />
            </div>
          </div>
          <p className="mt-2 text-sm text-adm-text-secondary">{review.comment}</p>
          <div className="mt-3 flex gap-2">
            {review.status !== "APPROVED" && (
              <button
                onClick={() => handleAction(review.id, "APPROVED")}
                className="rounded-full bg-adm-success-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-adm-success transition hover:brightness-95"
              >
                Onayla
              </button>
            )}
            {review.status !== "REJECTED" && (
              <button
                onClick={() => handleAction(review.id, "REJECTED")}
                className="rounded-full bg-adm-danger-soft px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-adm-danger transition hover:brightness-95"
              >
                Reddet
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
