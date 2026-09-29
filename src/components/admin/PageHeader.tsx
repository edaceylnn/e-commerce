import { ReactNode } from "react";
import Link from "next/link";

export function PageHeader({
  breadcrumb,
  title,
  badge,
  description,
  meta,
  actions,
}: {
  breadcrumb?: { label: string; href: string }[];
  title: string;
  // Shown right after the title (e.g. an order's status).
  badge?: ReactNode;
  description?: string;
  meta?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mb-1 flex items-center gap-1.5 text-sm text-adm-text-secondary">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-adm-text-tertiary">/</span>}
                <Link href={crumb.href} className="transition hover:text-adm-text">
                  {crumb.label}
                </Link>
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-adm-headline text-[28px] font-semibold leading-tight tracking-tight text-adm-text">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1 max-w-lg text-sm text-adm-text-secondary">
            {description}
          </p>
        )}
        {meta && (
          <p className="mt-1 text-sm text-adm-text-secondary">
            {meta}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      )}
    </div>
  );
}
