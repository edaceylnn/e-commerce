"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { XIcon } from "@/components/icons/Ph";

// Right-hand drawer from the design handoff (filters, size guide): 440px
// (full width on mobile), slides in over 0.55s with a fading scrim. Stays
// mounted so it can animate out; `inert` keeps it out of the tab order and
// the accessibility tree while closed.
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = overflow;
    };
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-ink/[.28] transition-opacity duration-400 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        inert={!open}
        className={`fixed inset-y-0 right-0 z-[41] flex w-screen flex-col bg-background outline-none transition-transform duration-[550ms] ease-soft tab:w-[440px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-16 flex-none items-center justify-between border-b border-line px-7">
          <span className="text-nav uppercase tracking-cta">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="-mr-3 flex h-11 w-11 items-center justify-center text-ink"
          >
            <XIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-7">{children}</div>
        {footer && <div className="flex-none border-t border-line px-7 pb-6 pt-4">{footer}</div>}
      </aside>
    </>
  );
}
