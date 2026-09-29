// Product-card completeness check — pure and DB-free so the admin form can
// run it live on every keystroke, and the server can run the same rules.
// This is a "kart tamlığı" score, deliberately not framed as SEO success:
// every rule says why it matters and how to fix it. Weights follow the
// product plan (başlık 15, açıklama 20, meta 15, görsel 15, kategori 10,
// varyant 15, stok/fiyat 10 = 100).

export type AuditInput = {
  title: string;
  description: string;
  categorySlug: string;
  price: number;
  stock: number;
  metaTitle?: string;
  metaDescription?: string;
  images: { url: string; altText?: string }[];
  variants: { colorId: string; sizeId: string; stock: number }[];
};

export type AuditSeverity = "error" | "warning";

export type AuditIssue = {
  id: string;
  severity: AuditSeverity;
  message: string;
  fix: string;
  // Points this issue costs out of 100.
  penalty: number;
};

export type AuditResult = {
  score: number;
  issues: AuditIssue[];
};

export const TITLE_MIN = 10;
export const TITLE_MAX = 70;
export const DESCRIPTION_MIN = 80;
export const META_DESCRIPTION_MAX = 160;
export const META_TITLE_MAX = 60;

export function auditProduct(input: AuditInput): AuditResult {
  const issues: AuditIssue[] = [];
  const title = input.title.trim();
  const description = input.description.trim();
  const metaDescription = input.metaDescription?.trim() ?? "";
  const metaTitle = input.metaTitle?.trim() ?? "";

  if (!title) {
    issues.push({
      id: "title-missing",
      severity: "error",
      message: "Ürün adı yok",
      fix: "Ürün tipini ve öne çıkan özelliği içeren bir ad yazın (örn. “Yüksek Bel Toparlayıcı Spor Tayt”).",
      penalty: 15,
    });
  } else if (title.length < TITLE_MIN) {
    issues.push({
      id: "title-short",
      severity: "warning",
      message: "Ürün adı çok kısa",
      fix: "Adın arama sonuçlarında ayırt edilebilmesi için ürün tipini ve bir özelliği ekleyin.",
      penalty: 5,
    });
  } else if (title.length > TITLE_MAX) {
    issues.push({
      id: "title-long",
      severity: "warning",
      message: `Ürün adı ${TITLE_MAX} karakteri aşıyor`,
      fix: "Uzun adlar listelerde ve arama sonuçlarında kesilir; ayrıntıları açıklamaya taşıyın.",
      penalty: 5,
    });
  }

  if (!description) {
    issues.push({
      id: "description-missing",
      severity: "error",
      message: "Açıklama yok",
      fix: "Kumaş, kalıp ve kullanım alanını anlatan en az birkaç cümle ekleyin.",
      penalty: 20,
    });
  } else if (description.length < DESCRIPTION_MIN) {
    issues.push({
      id: "description-short",
      severity: "warning",
      message: "Açıklama çok kısa",
      fix: `Açıklama ${DESCRIPTION_MIN} karakterin altında; müşterinin soracağı kumaş, kalıp ve bakım bilgisini ekleyin.`,
      penalty: 10,
    });
  }

  if (!metaDescription) {
    issues.push({
      id: "meta-description-missing",
      severity: "error",
      message: "Meta açıklama yok",
      fix: "Arama sonucunda görünecek 120–160 karakterlik bir özet yazın.",
      penalty: 10,
    });
  } else if (metaDescription.length > META_DESCRIPTION_MAX) {
    issues.push({
      id: "meta-description-long",
      severity: "warning",
      message: `Meta açıklama ${META_DESCRIPTION_MAX} karakteri aşıyor`,
      fix: "Arama motorları uzun meta açıklamaları keser; ana mesajı ilk cümleye taşıyın.",
      penalty: 5,
    });
  }
  if (!metaTitle) {
    issues.push({
      id: "meta-title-missing",
      severity: "warning",
      message: "SEO başlığı yok",
      fix: "Boş kalırsa ürün adı kullanılır; arama için ayrı bir başlık yazmak isteyebilirsiniz.",
      penalty: 5,
    });
  }

  if (input.images.length === 0) {
    issues.push({
      id: "images-missing",
      severity: "error",
      message: "Görsel yok",
      fix: "En az bir ürün görseli ekleyin.",
      penalty: 15,
    });
  } else {
    const missingAlt = input.images.filter((img) => !img.altText?.trim()).length;
    if (missingAlt > 0) {
      issues.push({
        id: "image-alt-missing",
        severity: "warning",
        message: `Görsel alt metni yok (${missingAlt}/${input.images.length} görselde)`,
        fix: "Her görsele ne gösterdiğini anlatan kısa bir alt metin yazın (örn. “Siyah spor tayt, yandan görünüm”).",
        penalty: 5,
      });
    }
  }

  if (!input.categorySlug) {
    issues.push({
      id: "category-missing",
      severity: "error",
      message: "Kategori seçilmedi",
      fix: "Ürünü doğru kategoriye atayın.",
      penalty: 10,
    });
  }

  if (input.variants.length === 0) {
    issues.push({
      id: "variants-missing",
      severity: "error",
      message: "Beden ve renk bilgisi eksik",
      fix: "Satılan her beden/renk kombinasyonu için bir varyant ekleyin.",
      penalty: 15,
    });
  } else {
    const sizeCount = new Set(input.variants.map((v) => v.sizeId)).size;
    if (sizeCount === 1) {
      issues.push({
        id: "variants-single-size",
        severity: "warning",
        message: "Yalnızca tek beden tanımlı",
        fix: "Ürün tek beden değilse diğer bedenleri de varyant olarak ekleyin.",
        penalty: 5,
      });
    }
  }

  if (!(input.price > 0)) {
    issues.push({
      id: "price-missing",
      severity: "error",
      message: "Fiyat girilmedi",
      fix: "Satış fiyatını girin.",
      penalty: 5,
    });
  }
  const totalStock = input.variants.length
    ? input.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)
    : input.stock;
  if (!(totalStock > 0)) {
    issues.push({
      id: "stock-empty",
      severity: "warning",
      message: "Stok yok",
      fix: "Ürün yayında olacaksa stok adedini girin.",
      penalty: 5,
    });
  }

  const penalty = issues.reduce((sum, i) => sum + i.penalty, 0);
  return { score: Math.max(0, 100 - penalty), issues };
}
