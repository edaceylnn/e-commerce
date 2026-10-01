import { ReactNode, ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes } from "react";

// The reusable table system for admin list screens — Table (scroll/card
// shell) > TableHeader > TableRow > TableHead, and TableBody > TableRow >
// TableCell, plus TableEmptyState for the no-rows case. Every admin table
// (products, orders, customers, stock, …) can compose these instead of
// hand-rolling its own <table> markup.
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
      className={`overflow-x-auto ${
        embedded ? "" : "rounded-xl border border-adm-border bg-adm-surface-card"
      } ${className}`}
    >
      <table className="adm-table" style={{ minWidth }}>
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
  return <tr className={className}>{children}</tr>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({
  children,
  selected = false,
  className = "",
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return (
    <tr
      className={`${selected ? "bg-adm-primary-soft/50" : ""} ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

// Spacing and type come from .adm-table (globals.css) — only alignment here.
export function TableHead({
  children,
  align = "left",
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <th
      className={`${
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
      className={`${
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
      <td colSpan={colSpan} className="py-14 text-center text-adm-text-secondary">
        {children}
      </td>
    </tr>
  );
}
