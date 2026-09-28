"use client";

import { useToastStore } from "@/lib/store/toast-store";

export function Toaster() {
  const toast = useToastStore((s) => s.toast);
  const hide = useToastStore((s) => s.hide);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100vw-40px)] -translate-x-1/2 items-center gap-5 bg-ink px-[22px] py-3.5 text-card tracking-[0.02em] text-background transition-[transform,opacity] duration-500 ease-soft ${
        toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <span>{toast?.text}</span>
      {toast?.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            hide();
          }}
          className="border-b border-background pb-px uppercase tracking-label"
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
