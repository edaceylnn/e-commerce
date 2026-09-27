import { ReactNode } from "react";

// Lightweight chrome wrapper, not a data-grid abstraction — each table keeps
// its own <thead>/<tr>/<td> markup (Playwright's e2e specs select rows via
// `tr` directly, so the row structure must stay exactly as each caller wrote
// it). This just gives every admin table the same bordered container +
// consistent header-row style instead of floating bare in the page.
export function AdminTable({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-x-auto rounded-xl border border-adm-border bg-adm-surface-card [&_tbody>tr:nth-child(even)]:bg-adm-bg/40 ${className}`}
    >
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function AdminTableEmpty({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-sm text-adm-text-tertiary">
        {children}
      </td>
    </tr>
  );
}
