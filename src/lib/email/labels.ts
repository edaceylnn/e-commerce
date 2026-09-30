import type { StatusBadgeVariant } from "@/components/admin/StatusBadge";

// Admin labels for the email outbox.

export const EMAIL_TEMPLATE_LABELS: Record<string, string> = {
  "order-confirmed": "Sipariş alındı",
  "order-shipped": "Kargoya verildi",
  "order-delivered": "Teslim edildi",
  "order-cancelled": "Sipariş iptal",
  refund: "İade tamamlandı",
  "password-reset": "Şifre sıfırlama",
};

export const EMAIL_STATUS: Record<string, { label: string; variant: StatusBadgeVariant }> = {
  QUEUED: { label: "Sırada", variant: "warning" },
  SENDING: { label: "Gönderiliyor", variant: "info" },
  SENT: { label: "Gönderildi", variant: "success" },
  FAILED: { label: "Hata", variant: "danger" },
  SKIPPED: { label: "Gönderilmedi", variant: "neutral" },
};
