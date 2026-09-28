"use client";

import { useState, useSyncExternalStore } from "react";
import { ToggleRow } from "@/components/ToggleRow";
import { AccountCard } from "@/components/account/AccountCard";
import { Alert } from "@/components/Alert";
import { TextButton } from "@/components/account/AccountButtons";
import { enablePushNotifications } from "@/lib/push/client";

type Prefs = {
  notifyMarketing: boolean;
  notifyOrderStatus: boolean;
  notifyNewProducts: boolean;
  notifySms: boolean;
};

const ITEMS: { key: keyof Prefs; label: string; description: string }[] = [
  {
    key: "notifyMarketing",
    label: "Kampanya ve indirim e-postaları",
    description: "İndirim ve kampanya duyurularını e-posta ile alın.",
  },
  {
    key: "notifyOrderStatus",
    label: "Sipariş durumu bildirimleri",
    description: "Siparişiniz hazırlanırken ve kargoya verilirken haber verelim.",
  },
  {
    key: "notifyNewProducts",
    label: "Yeni ürün bildirimleri",
    description: "Yeni gelen ürünlerden ilk siz haberdar olun.",
  },
  {
    key: "notifySms",
    label: "SMS bildirimleri",
    description: "Sipariş ve kampanya bilgilerini SMS ile de alın.",
  },
];

type PushStatus = "unsupported" | "denied" | "granted" | "default";

// The browser's permission is read (not synced into state by an effect):
// the server snapshot is "default", matching the SSR markup, and the client
// snapshot takes over right after hydration. Permission changes made through
// this form are tracked in `pushOverride` below.
const noopSubscribe = () => () => {};
function readPushPermission(): PushStatus {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as PushStatus;
}

export function NotificationPreferencesForm({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState<keyof Prefs | null>(null);
  const [error, setError] = useState<string | null>(null);

  const browserPushStatus = useSyncExternalStore(
    noopSubscribe,
    readPushPermission,
    () => "default" as const
  );
  const [pushOverride, setPushOverride] = useState<PushStatus | null>(null);
  const pushStatus = pushOverride ?? browserPushStatus;
  const [pushLoading, setPushLoading] = useState(false);

  async function update(key: keyof Prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(key);
    setError(null);

    const res = await fetch("/api/account/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaving(null);

    if (!res.ok) {
      setPrefs(prefs);
      setError("Güncellenemedi, lütfen tekrar deneyin.");
    }
  }

  async function handleEnablePush() {
    setPushLoading(true);
    const result = await enablePushNotifications();
    setPushLoading(false);
    setPushOverride(result.status === "subscribed" ? "granted" : result.status === "denied" ? "denied" : "unsupported");
  }

  return (
    <AccountCard>
      <h2 className="font-light tracking-title text-2xl">Bildirim Tercihleri</h2>
      <ul className="mt-4 divide-y divide-line">
        {ITEMS.map(({ key, label, description }) => (
          <ToggleRow
            key={key}
            label={label}
            description={description}
            checked={prefs[key]}
            onChange={(value) => update(key, value)}
            disabled={saving === key}
          />
        ))}
      </ul>

      {pushStatus !== "unsupported" && (
        <div className="flex items-center justify-between gap-4 border-t border-line py-4">
          <div className="pr-4">
            <p className="text-sm font-medium">Push bildirimleri</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              Tarayıcınız üzerinden anlık stok ve sipariş bildirimleri alın.
            </p>
          </div>
          {pushStatus === "granted" ? (
            <span className="text-xs font-medium uppercase tracking-wide text-success">Açık</span>
          ) : pushStatus === "denied" ? (
            <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              Engellendi
            </span>
          ) : (
            <TextButton onClick={handleEnablePush} disabled={pushLoading}>
              {pushLoading ? "Açılıyor…" : "Etkinleştir"}
            </TextButton>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
    </AccountCard>
  );
}
