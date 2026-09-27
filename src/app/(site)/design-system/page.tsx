import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getProductById, type Product } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { CategoryTile } from "@/components/CategoryTile";
import { PillButton, pillClassName, type PillVariant } from "@/components/Pill";
import { FormField, fieldInputClass } from "@/components/FormField";
import { Alert } from "@/components/Alert";
import { HeartIcon } from "@/components/icons/HeartIcon";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { ShoppingBagIcon } from "@/components/icons/ShoppingBagIcon";
import { UserIcon } from "@/components/icons/AccountIcons";
import { MenuIcon, CloseIcon } from "@/components/icons/AdminIcons";

// Living style guide: every swatch, type step and component below is the
// real token/component the storefront renders, so this page can't drift
// from the site. Unlisted and not indexed — it's a portfolio/QA surface.
export const metadata: Metadata = {
  title: "Tasarım Sistemi — EDACEY",
  robots: { index: false, follow: false },
};

// ---- Contrast (WCAG 2.x relative luminance) --------------------------------

type RGB = [number, number, number];
const BACKGROUND: RGB = [0xf2, 0xef, 0xe8];

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Translucent tokens (ink-soft, line) are measured as they actually render:
// composited over the page background.
function composite(rgb: RGB, alpha: number, over: RGB = BACKGROUND): RGB {
  return rgb.map((c, i) => Math.round(c * alpha + over[i] * (1 - alpha))) as RGB;
}

function luminance([r, g, b]: RGB): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ---- Tokens -----------------------------------------------------------------

const INK: RGB = [0x16, 0x15, 0x0f];

type Swatch = {
  token: string;
  value: string;
  role: string;
  rgb: RGB;
  // "text" swatches are checked against 4.5:1, "ui" against 3:1, and
  // "surface"/"decorative" ones aren't text-bearing so no ratio is shown.
  kind: "text" | "ui" | "surface" | "decorative";
};

const SWATCHES: Swatch[] = [
  { token: "background", value: "#f2efe8", role: "Sayfa zemini", rgb: BACKGROUND, kind: "surface" },
  { token: "cream", value: "#ede9e0", role: "İkincil yüzey", rgb: hexToRgb("#ede9e0"), kind: "surface" },
  { token: "cream-deep", value: "#e4e0d5", role: "Görsel yer tutucu", rgb: hexToRgb("#e4e0d5"), kind: "surface" },
  { token: "ivory", value: "#ffffff", role: "Kart vurgusu, hover", rgb: hexToRgb("#ffffff"), kind: "surface" },
  { token: "field", value: "#f8f6f2", role: "Krem zemindeki form alanı", rgb: hexToRgb("#f8f6f2"), kind: "surface" },
  { token: "ink", value: "#16150f", role: "Metin, birincil buton", rgb: INK, kind: "text" },
  { token: "ink-soft", value: "ink · 65%", role: "Tek ikincil metin rengi", rgb: composite(INK, 0.65), kind: "text" },
  { token: "accent", value: "#4e5b3a", role: "Adaçayı vurgu: hover, indirim", rgb: hexToRgb("#4e5b3a"), kind: "text" },
  { token: "line", value: "ink · 14%", role: "Ayırıcı çizgi (dekoratif)", rgb: composite(INK, 0.14), kind: "decorative" },
  { token: "line-strong", value: "ink · 50%", role: "Form alanı kenarı", rgb: composite(INK, 0.5), kind: "ui" },
  { token: "danger", value: "#c23b52", role: "Hata", rgb: hexToRgb("#c23b52"), kind: "text" },
  { token: "success", value: "#16794a", role: "Başarı, stokta", rgb: hexToRgb("#16794a"), kind: "text" },
];

type TypeStep = { name: string; className: string; spec: string; sample: string };

const TYPE_SCALE: TypeStep[] = [
  { name: "display-2xl", className: "font-display text-display-2xl italic", spec: "Instrument Serif · clamp(48px, 5vw, 120px) · 0.88", sample: "ama iddialı." },
  { name: "display-xl", className: "font-display text-display-xl", spec: "Instrument Serif · clamp(36px, 3.2vw, 68px) · 0.88", sample: "Yumuşak" },
  { name: "display-lg", className: "font-display text-display-lg", spec: "Instrument Serif · clamp(30px, 4.6vw, 54px) · 1.05", sample: "Rahatlık seninle gelir." },
  { name: "display-md", className: "font-display text-display-md", spec: "Instrument Serif · clamp(28px, 4vw, 44px) · 1.1", sample: "Öne çıkanlar" },
  { name: "sayfa başlığı", className: "font-display text-4xl sm:text-5xl", spec: "Instrument Serif · 36px → 48px (sm) · iç sayfa h1", sample: "Sepetim" },
  { name: "kart başlığı", className: "font-display text-2xl", spec: "Instrument Serif · 24px · hesap kartları, bölüm başlığı", sample: "Siparişlerim" },
  { name: "body-lg", className: "font-sans text-body-lg", spec: "Archivo · 15px · 1.625", sample: "Evdeki rahatlığını günün her anına taşı." },
  { name: "sm", className: "font-sans text-sm", spec: "Archivo · 14px · 1.43", sample: "Form alanı, gövde metni" },
  { name: "body-sm", className: "font-sans text-body-sm", spec: "Archivo · 13px · 1.5", sample: "Ürün adı, menü, footer bağlantısı" },
  { name: "xs", className: "font-sans text-xs", spec: "Archivo · 12px · 1.33", sample: "Yardımcı metin, fiyat notu" },
  { name: "caption", className: "font-mono text-caption uppercase tracking-eyebrow", spec: "11px · 1.5 · DM Mono + eyebrow aralığı ile üst etiket", sample: "EDACEY / EVDE VE DIŞARIDA" },
];

const TRACKING = [
  { token: "display", value: "-0.02em", use: "Serif başlıklar", sample: "Yumuşak", className: "font-display text-3xl tracking-display" },
  { token: "wide", value: "0.025em", use: "Küçük büyük harfli arayüz etiketleri", sample: "FİLTRELE", className: "text-xs font-semibold uppercase tracking-wide" },
  { token: "label", value: "0.12em", use: "Buton, menü, küçük başlık", sample: "SEPETE EKLE", className: "text-xs font-semibold uppercase tracking-label" },
  { token: "eyebrow", value: "0.2em", use: "Mono üst etiket, duyuru bandı", sample: "EDACEY NOTU", className: "font-mono text-caption uppercase tracking-eyebrow" },
  { token: "logo", value: "0.34em", use: "Yalnızca logo", sample: "EDACEY", className: "text-lg font-extrabold tracking-logo" },
];

const SPACING = [
  { px: 4, cls: "1" },
  { px: 8, cls: "2" },
  { px: 12, cls: "3" },
  { px: 16, cls: "4" },
  { px: 24, cls: "6" },
  { px: 32, cls: "8" },
  { px: 48, cls: "12" },
  { px: 64, cls: "16" },
];

// Forced-state classes so each state can be seen without interacting.
const STATE_PREVIEW: Record<PillVariant, { hover: string; focus: string }> = {
  solid: { hover: "!bg-primary-dark !text-accent-ink", focus: "outline-2 outline-offset-4 outline-ink" },
  outline: { hover: "!border-ink", focus: "outline-2 outline-offset-4 outline-ink" },
  ghost: { hover: "!text-accent", focus: "outline-2 outline-offset-4 outline-ink" },
};

const VARIANT_LABEL: Record<PillVariant, string> = {
  solid: "Birincil",
  outline: "İkincil",
  ghost: "Ghost",
};

const ICONS = [
  { name: "Menü", el: <MenuIcon className="h-5 w-5" /> },
  { name: "Kapat", el: <CloseIcon className="h-5 w-5" /> },
  { name: "Ara", el: <SearchIcon className="h-5 w-5" /> },
  { name: "Favori", el: <HeartIcon className="h-5 w-5" /> },
  { name: "Hesap", el: <UserIcon className="h-5 w-5" /> },
  { name: "Sepet", el: <ShoppingBagIcon className="h-5 w-5" /> },
];

// ---- Page ---------------------------------------------------------------------

function Section({ index, title, note, children }: { index: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-14">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="font-display text-display-md">
          <span className="mr-4 font-mono text-caption tracking-eyebrow text-ink-soft">{index}</span>
          {title}
        </h2>
        {note && <p className="max-w-[48ch] text-xs text-ink-soft">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function RatioBadge({ swatch }: { swatch: Swatch }) {
  if (swatch.kind === "surface" || swatch.kind === "decorative") {
    return <span className="text-xs text-ink-soft">{swatch.kind === "surface" ? "Yüzey" : "Dekoratif"}</span>;
  }
  const ratio = contrast(swatch.rgb, BACKGROUND);
  const target = swatch.kind === "text" ? 4.5 : 3;
  const pass = ratio >= target;
  return (
    <span className={`font-mono text-xs ${pass ? "text-success" : "text-danger"}`}>
      {ratio.toFixed(2)}:1 · {pass ? (swatch.kind === "text" ? "AA" : "UI 3:1") : "yetersiz"}
    </span>
  );
}

export default async function DesignSystemPage() {
  let product: Product | null = null;
  try {
    product = await getProductById(2);
  } catch {
    product = null;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-20 pt-12 sm:px-10">
      <header className="pb-12">
        <p className="font-mono text-caption tracking-eyebrow text-ink-soft">EDACEY / UI FOUNDATION v1</p>
        <h1 className="mt-6 font-display text-display-xl">Tasarım sistemi</h1>
        <p className="mt-6 max-w-[56ch] text-body-lg text-ink-soft">
          Bu sayfadaki her renk, yazı ölçüsü ve bileşen, sitede kullanılan
          gerçek token ve bileşenlerdir. Değerler sıfırdan uydurulmadı; sitede
          zaten kullanılanlardan türetildi ve sadeleştirildi.
        </p>
        <ul className="mt-8 grid gap-4 text-sm sm:grid-cols-3">
          <li className="border-t border-ink pt-3">
            <span className="font-semibold">Tek ikincil metin rengi.</span>{" "}
            <span className="text-ink-soft">Önem sırası kontrastla değil, boyut ve kalınlıkla kurulur.</span>
          </li>
          <li className="border-t border-ink pt-3">
            <span className="font-semibold">İki köşe.</span>{" "}
            <span className="text-ink-soft">Buton, kart ve görseller düz; ikon butonları ve rozetler tam yuvarlak.</span>
          </li>
          <li className="border-t border-ink pt-3">
            <span className="font-semibold">Ölçülü vurgu.</span>{" "}
            <span className="text-ink-soft">Adaçayı yeşili yalnızca hover, indirim ve durumlarda.</span>
          </li>
        </ul>
      </header>

      <Section index="01" title="Renkler" note="Kontrast, sayfa zeminine (#f2efe8) göre ölçülür. Metin renkleri 4.5:1, form kenarı 3:1 hedefler.">
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {SWATCHES.map((s) => (
            <div key={s.token}>
              <div
                className="aspect-[4/3] border border-line"
                style={{ backgroundColor: `rgb(${s.rgb.join(",")})` }}
              />
              <p className="mt-3 font-mono text-xs">{s.token}</p>
              <p className="text-xs text-ink-soft">{s.value} · {s.role}</p>
              <div className="mt-1">
                <RatioBadge swatch={s} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section index="02" title="Tipografi" note="Başlıklar Instrument Serif, arayüz metni Archivo, etiketler DM Mono. Başlıklar ekran genişliğiyle akışkan ölçeklenir. Harf aralığı beş adım.">
        <div className="divide-y divide-line border-y border-line">
          {TYPE_SCALE.map((t) => (
            <div key={t.name} className="grid gap-2 py-5 sm:grid-cols-[180px_1fr] sm:items-baseline">
              <div>
                <p className="font-mono text-xs">{t.name}</p>
                <p className="text-xs text-ink-soft">{t.spec}</p>
              </div>
              <p className={`${t.className} min-w-0 break-words`}>{t.sample}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-5">
          {TRACKING.map((t) => (
            <div key={t.token} className="border-t border-line pt-3">
              <p className={t.className}>{t.sample}</p>
              <p className="mt-2 font-mono text-xs">tracking-{t.token} · {t.value}</p>
              <p className="text-xs text-ink-soft">{t.use}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section index="03" title="Boşluk" note="8px ritmi; 4px yalnızca ikon ve etiket içi ince ayarlarda.">
        <div className="flex flex-col gap-3">
          {SPACING.map((s) => (
            <div key={s.px} className="flex items-center gap-4">
              <span className="w-16 font-mono text-xs text-ink-soft">{s.px}px</span>
              <span className="h-3 bg-accent" style={{ width: s.px }} />
              <span className="font-mono text-xs text-ink-soft">{s.cls}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section index="04" title="Butonlar" note="Üç stil, tek durum mantığı: klavye odağında halka, basınca 1px, devre dışıyken soluk ve tıklanamaz.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-y-4 text-left">
            <thead>
              <tr className="font-mono text-caption uppercase tracking-eyebrow text-ink-soft">
                <th className="w-28 font-normal" />
                <th className="font-normal">Varsayılan</th>
                <th className="font-normal">Hover</th>
                <th className="font-normal">Odak</th>
                <th className="font-normal">Devre dışı</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(STATE_PREVIEW) as PillVariant[]).map((v) => (
                <tr key={v}>
                  <th className="font-mono text-xs font-normal">{VARIANT_LABEL[v]}</th>
                  <td><PillButton variant={v} type="button">Sepete ekle</PillButton></td>
                  <td>
                    <span aria-hidden className={pillClassName(v, STATE_PREVIEW[v].hover)}>Sepete ekle</span>
                  </td>
                  <td>
                    <span aria-hidden className={pillClassName(v, STATE_PREVIEW[v].focus)}>Sepete ekle</span>
                  </td>
                  <td><PillButton variant={v} type="button" disabled>Sepete ekle</PillButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section index="05" title="Kartlar" note="Aynı dil: düz köşe, krem görsel zemini, hover'da görselde hafif yakınlaşma.">
        <div className="grid gap-8 sm:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="mb-3 font-mono text-xs text-ink-soft">Ürün kartı</p>
            {product ? <ProductCard product={product} /> : <p className="text-sm text-ink-soft">Ürün yüklenemedi.</p>}
          </div>
          <div>
            <p className="mb-3 font-mono text-xs text-ink-soft">Kategori kartı</p>
            <CategoryTile
              href="/products?category=loungewear"
              label="Loungewear"
              image="/categories/loungewear.webp"
              imagePosition="50% 8%"
              index={1}
              count={4}
              className="border border-line"
            />
          </div>
        </div>
      </Section>

      <Section index="06" title="Form" note="Form alanının kenarı 3:1 kontrastlı; hata hem renk hem metinle, geri bildirim hem ikon hem metinle verilir.">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="flex flex-col gap-5">
            <FormField label="E-posta" htmlFor="ds-email" hint="Sipariş bilgilerini bu adrese göndeririz.">
              <input id="ds-email" type="email" placeholder="ornek@eposta.com" className={fieldInputClass()} />
            </FormField>
            <FormField label="Telefon" htmlFor="ds-phone" required error="Telefon numarası 10 haneli olmalı.">
              <input id="ds-phone" type="tel" defaultValue="555 12" className={fieldInputClass(true)} aria-invalid />
            </FormField>
          </div>
          <div className="flex flex-col gap-3">
            <Alert variant="success">Adresin kaydedildi.</Alert>
            <Alert variant="error">Kupon kodu geçersiz.</Alert>
          </div>
        </div>
      </Section>

      <Section index="07" title="Köşe, gölge, ikon" note="İki köşe değeri, iki gölge. Çizgi ikonlar 1.6 kalınlıkta ve metin rengini (currentColor) alır.">
        <div className="grid gap-10 sm:grid-cols-3">
          <div className="flex items-end gap-5">
            <div>
              <div className="h-16 w-16 border border-ink" />
              <p className="mt-2 font-mono text-xs">0 · düz</p>
            </div>
            <div>
              <div className="h-16 w-16 rounded-full border border-ink" />
              <p className="mt-2 font-mono text-xs">full</p>
            </div>
          </div>
          <div className="flex items-end gap-5">
            <div>
              <div className="h-16 w-16 bg-ivory shadow-md" />
              <p className="mt-2 font-mono text-xs">md · yüzen buton</p>
            </div>
            <div>
              <div className="h-16 w-16 bg-ivory shadow-[var(--shadow-lift)]" />
              <p className="mt-2 font-mono text-xs">lift · panel</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {ICONS.map((i) => (
              <div key={i.name} className="flex flex-col items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line">{i.el}</span>
                <span className="text-xs text-ink-soft">{i.name}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
