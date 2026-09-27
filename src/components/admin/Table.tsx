import { ReactNode, ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes } from "react";

// The reusable table system for admin list screens — Table (scroll/card
// shell) > TableHeader > TableRow > TableHead, and TableBody > TableRow >
// TableCell, plus TableEmptyState/TableLoadingState for the no-rows and
// loading cases. Every admin table (products, orders, customers, stock, …)
// can compose these instead of hand-rolling its own <table> markup, and a
// spacing/color tweak here applies everywhere at once.
//
// AdminTable (admin/AdminTable.tsx) is the older, simpler wrapper still used
// by ~9 existing screens — left as is on purpose so this rollout doesn't
// touch pages beyond the one it was asked for. This is the version to reach
// for going forward.

export function Table({
  children,
  className = "",
  minWidth = "860px",
  embedded = false,
}: {
  children: ReactNode;
  className?: string;
  minWidth?: string;
  // true when a parent already supplies the white rounded/bordered card —
  // skips this component's own outer chrome so the table doesn't nest a
  // card inside a card (see AdminProductsTable's usage on /admin/products,
  // whose page-level card wraps the tabs/filters/table together).
  embedded?: boolean;
}) {
  return (
    <div
      className={`overflow-x-auto [&_tbody>tr:nth-child(even)]:bg-adm-bg/40 ${
        embedded ? "" : "rounded-xl border border-adm-border bg-adm-surface-card"
      } ${className}`}
    >
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

// The header row never hovers/highlights like a data row does — a plain
// wrapper rather than reusing TableRow (which always carries a hover tint).
export function TableHeadRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <tr className={`border-b border-adm-border ${className}`}>{children}</tr>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-adm-border">{children}</tbody>;
}

export function TableRow({
  children,
  selected = false,
  className = "",
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return (
    <tr
      className={`transition-colors hover:bg-adm-surface-secondary/50 ${
        selected ? "bg-adm-primary-soft/50" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

// Small, muted, uppercase — a header row answers "what's the column", it
// never competes with the data below it for attention.
export function TableHead({
  children,
  align = "left",
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <th
      className={`py-2.5 pr-4 text-[11px] font-semibold uppercase tracking-wider text-adm-text-secondary first:pl-4 last:pr-4 ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      } ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  align = "left",
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <td
      className={`py-2.5 pr-4 first:pl-4 last:pr-4 ${
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"
      } ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}

export function TableEmptyState({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-14 text-center text-sm text-adm-text-secondary">
        {children}
      </td>
    </tr>
  );
}

export function TableLoadingState({ colSpan, rows = 4 }: { colSpan: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          <td colSpan={colSpan} className="py-3 pl-4 pr-4">
            <div className="h-4 w-full animate-pulse rounded bg-adm-surface-secondary" />
          </td>
        </tr>
      ))}
    </>
  );
}
