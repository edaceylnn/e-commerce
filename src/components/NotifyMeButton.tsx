"use client";

import { ReactNode, useState } from "react";
import { enablePushNotifications } from "@/lib/push/client";
import { PillButton } from "@/components/Pill";
import { BellIcon, CheckIcon } from "@/components/icons/AccountIcons";

export function NotifyMeButton() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "subscribed" | "denied" | "unsupported" | "error"
  >("idle");

  async function handleClick() {
    setStatus("loading");
    try {
      const result = await enablePushNotifications();
      setStatus(result.status);
    } catch {
      setStatus("error");
    }
  }

  const label: Record<typeof status, ReactNode> = {
    idle: (
      <>
        <BellIcon className="h-4 w-4" />
        Stok bildirimi al
      </>
    ),
    loading: "Ayarlanıyor…",
    subscribed: (
      <>
        <CheckIcon className="h-4 w-4" />
        Bildirimler açık
      </>
    ),
    denied: "İzin reddedildi",
    unsupported: "Bu tarayıcı desteklemiyor",
    error: "Bir sorun oluştu",
  };

  return (
    <PillButton
      variant="outline"
      onClick={handleClick}
      disabled={status === "loading" || status === "subscribed"}
      className="w-full disabled:opacity-70"
    >
      {label[status]}
    </PillButton>
  );
}
