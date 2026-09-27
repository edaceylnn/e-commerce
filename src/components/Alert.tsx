import type { ReactNode } from "react";
import { CheckIcon, AlertCircleIcon } from "@/components/icons/AccountIcons";

// Inline success/error feedback for forms — never color-only: an icon and
// the message text both carry the meaning.
export function Alert({ variant, children }: { variant: "success" | "error"; children: ReactNode }) {
  const isSuccess = variant === "success";
  return (
    <div
      role={isSuccess ? "status" : "alert"}
      className={`flex items-start gap-2 border px-3 py-2.5 text-sm ${
        isSuccess
          ? "border-success/25 bg-success-soft text-success"
          : "border-danger/25 bg-danger-soft text-danger"
      }`}
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
