"use client";

import { FormEvent, useState } from "react";
import { AdminButton } from "@/components/admin/Button";
import { Card } from "@/components/admin/Card";

export function AdminNotificationsForm() {
  const [title, setTitle] = useState("EDACEY");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sentToAny, setSentToAny] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const res = await fetch("/api/push/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message }),
    });
    const data = await res.json();
    setSubmitting(false);

    setSentToAny(data.total > 0);
    setStatus(
      data.total === 0
        ? "Aktif abonelik yok."
        : `${data.sent}/${data.total} cihaza gönderildi.`
    );
  }

  return (
    <Card padding="lg" className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          placeholder="Başlık"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-adm-border bg-adm-surface-card px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-primary"
        />
        <textarea
          placeholder="Mesaj"
          required
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-adm-border bg-adm-surface-card px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-primary"
        />
        <AdminButton type="submit" disabled={submitting}>
          {submitting ? "Gönderiliyor…" : "Tüm Abonelere Gönder"}
        </AdminButton>
        {status && (
          <p
            className={`rounded-lg px-4 py-3 text-sm ${
              sentToAny
                ? "bg-adm-success-soft text-adm-success"
                : "bg-adm-warning-soft text-adm-warning"
            }`}
          >
            {status}
          </p>
        )}
      </form>
    </Card>
  );
}
