"use client";

import { useState } from "react";
import { Card } from "@/components/admin/Card";
import { AdminButton } from "@/components/admin/Button";
import { META_DESCRIPTION_MAX, META_TITLE_MAX } from "@/lib/product-audit";

export type DraftKind = "SHORT_DESCRIPTION" | "META_TITLE" | "META_DESCRIPTION" | "IMAGE_ALT";

export type PendingDraft = { id: string; kind: DraftKind; aiText: string; imageUrl?: string | null };

export type DraftSourceFields = {
  title: string;
  categorySlug: string;
  description: string;
  price: number;
  colorIds: string[];
  sizeIds: string[];
  images: { url: string; altText?: string }[];
};

const KIND_LABEL: Record<DraftKind, string> = {
  SHORT_DESCRIPTION: "Kısa açıklama",
  META_TITLE: "SEO başlığı",
  META_DESCRIPTION: "Meta açıklama",
  IMAGE_ALT: "Görsel alt metni",
};

const KIND_TARGET: Record<DraftKind, string> = {
  SHORT_DESCRIPTION: "Onaylanınca ürünün Açıklama alanına yazılır.",
  META_TITLE: "Onaylanınca ürünün SEO başlığı alanına yazılır.",
  META_DESCRIPTION: "Onaylanınca ürünün Meta açıklama alanına yazılır.",
  IMAGE_ALT: "Onaylanınca bu görselin alt metnine yazılır.",
};

const KIND_ORDER: DraftKind[] = ["SHORT_DESCRIPTION", "META_TITLE", "META_DESCRIPTION", "IMAGE_ALT"];

const MAX_LENGTH: Partial<Record<DraftKind, number>> = {
  META_TITLE: META_TITLE_MAX,
  META_DESCRIPTION: META_DESCRIPTION_MAX,
};

function toDraftStates(drafts: PendingDraft[]): DraftState[] {
  return [...drafts]
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
    .map((d) => ({ ...d, text: d.aiText, busy: false }));
}

type DraftState = PendingDraft & { text: string; busy: boolean; error?: string };

function DraftCard({
  draft,
  onChange,
  onApprove,
  onReject,
}: {
  draft: DraftState;
  onChange: (text: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const edited = draft.text !== draft.aiText;
  const maxLength = MAX_LENGTH[draft.kind];
  const tooLong = maxLength !== undefined && draft.text.length > maxLength;

  return (
    <div className="rounded-xl border border-adm-border p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          {draft.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.imageUrl}
              alt=""
              className="h-8 w-8 shrink-0 rounded border border-adm-border object-cover"
            />
          )}
          <p className="text-sm font-semibold text-adm-text">{KIND_LABEL[draft.kind]}</p>
        </div>
        {edited && (
          <button
            type="button"
            onClick={() => onChange(draft.aiText)}
            className="text-xs text-adm-text-tertiary hover:text-adm-text hover:underline"
          >
            AI metnine dön
          </button>
        )}
      </div>
      <textarea
        value={draft.text}
        onChange={(e) => onChange(e.target.value)}
        rows={draft.kind === "SHORT_DESCRIPTION" ? 6 : draft.kind === "META_TITLE" ? 2 : 4}
        className="w-full rounded-md border border-adm-border bg-adm-surface-card px-3 py-2 text-sm text-adm-text outline-none focus:border-adm-primary"
      />
      <div className="mt-1 flex justify-between text-[11px] text-adm-text-tertiary">
        <span>{KIND_TARGET[draft.kind]}</span>
        <span className={tooLong ? "font-semibold text-adm-danger" : undefined}>
          {maxLength ? `${draft.text.length}/${maxLength}` : `${draft.text.length} karakter`}
        </span>
      </div>
      {draft.error && <p className="mt-1 text-xs text-adm-danger">{draft.error}</p>}
      <div className="mt-2 flex gap-2">
        <AdminButton
          type="button"
          size="sm"
          onClick={onApprove}
          loading={draft.busy}
          disabled={!draft.text.trim()}
        >
          {edited ? "Düzenlenmiş hâliyle onayla" : "Onayla"}
        </AdminButton>
        <AdminButton type="button" size="sm" variant="ghost" onClick={onReject} disabled={draft.busy}>
          Reddet
        </AdminButton>
      </div>
    </div>
  );
}

// AI drafts (kısa açıklama, SEO başlığı, meta açıklama, and alt text for
// each photo still missing one) generated from the form's current values. Nothing is written to the product until the admin
// approves a draft; rejecting or regenerating leaves the product untouched.
export function ProductDraftsPanel({
  productId,
  initialDrafts,
  getSource,
  onApproved,
}: {
  productId?: number;
  initialDrafts: PendingDraft[];
  getSource: () => DraftSourceFields;
  onApproved: (draft: PendingDraft, text: string) => void;
}) {
  const [drafts, setDrafts] = useState<DraftState[]>(() => toDraftStates(initialDrafts));
  const [missingInfo, setMissingInfo] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!productId) {
    return (
      <Card padding="sm" title="AI taslakları">
        <p className="text-sm text-adm-text-secondary">
          Ürünü ilk kez kaydettikten sonra buradan açıklama ve meta açıklama taslağı üretebilirsiniz.
        </p>
      </Card>
    );
  }

  function patchDraft(id: string, patch: Partial<DraftState>) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  async function generate() {
    setError(null);
    setNotice(null);
    setGenerating(true);
    const res = await fetch(`/api/admin/products/${productId}/drafts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getSource()),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setGenerating(false);
    if (!res?.ok) {
      setError(data?.error ?? "Taslak üretilemedi.");
      return;
    }
    setDrafts(toDraftStates(data.drafts as PendingDraft[]));
    setMissingInfo(data.missingInfo ?? []);
  }

  async function decide(draft: DraftState, action: "approve" | "reject") {
    patchDraft(draft.id, { busy: true, error: undefined });
    const res = await fetch(`/api/admin/content-drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "approve" ? { action, text: draft.text } : { action }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      patchDraft(draft.id, { busy: false, error: data?.error ?? "İşlem başarısız." });
      return;
    }
    setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    if (action === "approve") {
      onApproved(draft, draft.text.trim());
      setNotice(`${KIND_LABEL[draft.kind]} ürüne kaydedildi.`);
    } else {
      setNotice(null);
    }
  }

  return (
    <Card padding="sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-adm-text-tertiary">
        AI taslakları
      </p>
      <p className="mt-1 text-xs text-adm-text-tertiary">
        Açıklama, SEO başlığı, meta açıklama ve alt metni eksik görseller için. Formdaki güncel
        bilgilerden üretilir; siz onaylamadan hiçbir şey ürüne yazılmaz.
      </p>

      <AdminButton
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3 w-full"
        onClick={generate}
        loading={generating}
      >
        {generating ? "Üretiliyor…" : drafts.length ? "Yeniden üret" : "Metin taslaklarını üret"}
      </AdminButton>

      {error && <p className="mt-2 text-xs text-adm-danger">{error}</p>}
      {notice && (
        <p className="mt-2 rounded-lg bg-adm-success-soft px-3 py-2 text-xs text-adm-success">{notice}</p>
      )}

      {missingInfo.length > 0 && (
        <div className="mt-3 rounded-lg bg-adm-info-soft px-3 py-2">
          <p className="text-xs font-semibold text-adm-info">AI&apos;ın bilmediği için yazmadığı bilgiler</p>
          <p className="mt-0.5 text-xs text-adm-text-secondary">{missingInfo.join(", ")}</p>
        </div>
      )}

      {drafts.length > 0 && (
        <div className="mt-3 space-y-3">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onChange={(text) => patchDraft(draft.id, { text })}
              onApprove={() => decide(draft, "approve")}
              onReject={() => decide(draft, "reject")}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
