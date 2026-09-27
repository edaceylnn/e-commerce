import type { ComponentType, ReactNode } from "react";
import { EmptyBoxIcon } from "@/components/icons/AccountIcons";

// Generic empty-state block reused across every "nothing here yet" screen
// in the account area (orders, addresses, favorites, notifications...).
export function EmptyState({
  icon: Icon = EmptyBoxIcon,
  title,
  description,
  action,
}: {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <Icon className="h-12 w-12 text-ink-soft/40" />
      <p className="mt-4 text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
