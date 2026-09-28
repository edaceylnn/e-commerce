import type { AddressFormValues } from "@/components/AddressForm";
import { TextButton } from "@/components/account/AccountButtons";

export type SavedAddress = AddressFormValues & { id: string };

const BADGE_CLASS =
  "inline-flex items-center gap-1 bg-success-soft px-2.5 py-1 text-caption font-medium uppercase tracking-wide text-success";

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: SavedAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: (field: "isDefaultShipping" | "isDefaultBilling") => void;
}) {
  return (
    <div className="border border-line p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {address.type === "SHIPPING" ? "Teslimat" : "Fatura"}
            {address.label ? ` · ${address.label}` : ""}
          </p>
          <p className="mt-1 text-sm font-medium">{address.fullName}</p>
          <p className="mt-0.5 text-sm text-ink-soft">{address.phone}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {address.line1}
            {address.line2 ? `, ${address.line2}` : ""}
            <br />
            {address.district}/{address.city} {address.postalCode}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {address.isDefaultShipping && <span className={BADGE_CLASS}>Varsayılan Teslimat</span>}
          {address.isDefaultBilling && <span className={BADGE_CLASS}>Varsayılan Fatura</span>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-xs font-medium uppercase tracking-wide">
        <TextButton onClick={onEdit}>Düzenle</TextButton>
        <button type="button" onClick={onDelete} className="underline underline-offset-4 text-danger transition hover:brightness-90">
          Sil
        </button>
        {!address.isDefaultShipping && (
          <button
            type="button"
            onClick={() => onSetDefault("isDefaultShipping")}
            className="text-ink-soft underline underline-offset-4 transition hover:text-primary"
          >
            Teslimat için Varsayılan Yap
          </button>
        )}
        {!address.isDefaultBilling && (
          <button
            type="button"
            onClick={() => onSetDefault("isDefaultBilling")}
            className="text-ink-soft underline underline-offset-4 transition hover:text-primary"
          >
            Fatura için Varsayılan Yap
          </button>
        )}
      </div>
    </div>
  );
}
