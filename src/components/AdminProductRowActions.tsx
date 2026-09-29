"use client";

import Link from "next/link";
import { PencilIcon, TrashIcon } from "@/components/icons/AdminIcons";

const iconButton =
  "inline-flex h-8 w-8 items-center justify-center rounded-md text-adm-text-tertiary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-adm-primary/30";

// Both actions sit visibly in the row rather than behind a "⋯" menu — there
// are only two, and delete still asks for confirmation (see
// AdminProductsTable's handleDelete).
export function AdminProductRowActions({
  productId,
  productTitle,
  onDelete,
}: {
  productId: number;
  productTitle: string;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <Link
        href={`/admin/products/${productId}/edit`}
        aria-label={`${productTitle} ürününü düzenle`}
        title="Düzenle"
        className={`${iconButton} hover:bg-adm-surface-secondary hover:text-adm-text`}
      >
        <PencilIcon className="h-4 w-4" />
      </Link>
      <button
        type="button"
        onClick={() => onDelete(productId)}
        aria-label={`${productTitle} ürününü sil`}
        title="Sil"
        className={`${iconButton} hover:bg-adm-danger-soft hover:text-adm-danger`}
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
