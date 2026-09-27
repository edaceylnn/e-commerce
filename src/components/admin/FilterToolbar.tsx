import { ReactNode } from "react";

export function FilterToolbar({
  children,
  resultLabel,
  className = "",
}: {
  children: ReactNode;
  resultLabel?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-6 flex flex-wrap items-center justify-between gap-4 ${className}`}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        {children}
      </div>
      {resultLabel && (
        <span className="shrink-0 text-sm text-adm-text-tertiary">
          {resultLabel}
        </span>
      )}
    </div>
  );
}

export function ToolbarSearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[17px] w-[17px] shrink-0 text-adm-text-tertiary"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
