import type { AuditResult } from "@/lib/product-audit";
import { Card } from "@/components/admin/Card";

function scoreTone(score: number) {
  if (score >= 85) return "text-adm-success";
  if (score >= 60) return "text-adm-warning";
  return "text-adm-danger";
}

// Live "kart tamlığı" readout next to the product form. Recomputed from the
// form state on every change, so fixing a field clears its warning at once.
export function ProductAuditPanel({ result }: { result: AuditResult }) {
  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");

  return (
    <Card padding="sm">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-adm-text-secondary">
          Kart kontrolü
        </p>
        <p className={`text-2xl font-bold ${scoreTone(result.score)}`}>
          {result.score}
          <span className="text-sm font-medium text-adm-text-tertiary">/100</span>
        </p>
      </div>
      <p className="mt-1 text-xs text-adm-text-tertiary">
        Ürün kartının tamlığı — SEO başarısı değil, eksik bilgi göstergesi.
      </p>

      {result.issues.length === 0 ? (
        <p className="mt-4 rounded-lg bg-adm-success-soft px-3 py-2 text-sm text-adm-success">
          Eksik bilgi yok.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {[...errors, ...warnings].map((issue) => (
            <li
              key={issue.id}
              className={`rounded-lg px-3 py-2 ${
                issue.severity === "error" ? "bg-adm-danger-soft" : "bg-adm-warning-soft"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  issue.severity === "error" ? "text-adm-danger" : "text-adm-warning"
                }`}
              >
                {issue.message}
              </p>
              <p className="mt-0.5 text-xs text-adm-text-secondary">{issue.fix}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
