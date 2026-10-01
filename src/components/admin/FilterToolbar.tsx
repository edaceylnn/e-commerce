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
