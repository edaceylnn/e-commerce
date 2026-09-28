import type { ReactNode } from "react";
import { CheckIcon, AlertCircleIcon } from "@/components/icons/AccountIcons";

// Inline success/error feedback for forms — never color-only: an icon and
// the message text both carry the meaning.
export function Alert({ variant, children }: { variant: "success" | "error"; children: ReactNode }) {
  const isSuccess = variant === "success";
  return (
    <div
      role={isSuccess ? "status" : "alert"}
      className={`flex items-start gap-2 text-card ${isSuccess ? "text-ink" : "text-sale"}`}
    >
      {isSuccess ? (
        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}
