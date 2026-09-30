"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-10 border border-ink px-6 text-nav uppercase tracking-cta transition-colors hover:bg-ink hover:text-background"
    >
      Yazdır / PDF kaydet
    </button>
  );
}
