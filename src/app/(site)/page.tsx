import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  getProductsByCategory,
  getUnitsSoldByProduct,
  selectNewArrivals,
  type Product,
} from "@/lib/products";
import { BestSellers } from "@/components/home/BestSellers";
import { ShopByCategory, type ShopRow } from "@/components/home/ShopByCategory";
import { NewArrivalsRail } from "@/components/home/NewArrivalsRail";
import { NewsletterSignup } from "@/components/home/NewsletterSignup";
import { formatPrice } from "@/lib/format";
import { discountedPrice } from "@/lib/product-view";
import { ArrowRightIcon } from "@/components/icons/Ph";

// Homepage — design handoff screen 1, mapped onto the
// store's real catalogue: the three categories stand in for the design's
// Women / Men / Sportswear / Accessories.

// Stagger for the hero's rise-in animation (see animate-hero-rise).
const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

export default async function HomePage() {
  const [loungewear, spor, pijama, unitsSold] = await Promise.all([
    getProductsByCategory("loungewear"),
    getProductsByCategory("spor"),
    getProductsByCategory("pijama"),
    getUnitsSoldByProduct(),
  ]);

  const all = [...loungewear, ...spor, ...pijama];
  // Units sold first; reviews and rating only break ties (most products
  // have no sales or reviews yet on a fresh store).
  const byBestSelling = (a: Product, b: Product) =>
    (unitsSold.get(b.id) ?? 0) - (unitsSold.get(a.id) ?? 0) ||
    b.ratingCount - a.ratingCount ||
    b.rating - a.rating ||
    a.id - b.id;
  const bestSellers = [...all].sort(byBestSelling);
  const newArrivals = selectNewArrivals(all);
  const onSale = all.filter((p) => p.discountPercentage > 0);
  const editPicks = [...pijama].sort(byBestSelling).slice(0, 2);
  const sporPicks = [...spor].sort(byBestSelling).slice(0, 3);

  // Editorial slots each take a photo not yet used elsewhere on the page —
  // with five campaign images and ~15 image slots, reusing the same shot in
  // several places made the page look repetitive. The campaign shots are
  // claimed first; product photos fill the rest in priority order.
  const used = new Set([
    "/hero/evde-rahatlik.webp",
    "/categories/loungewear.webp",
    "/categories/pijama.webp",
    "/categories/spor-studyo.webp",
    "/editorial/rahatlik-seninle.webp",
    ...editPicks.map((p) => p.thumbnail),
  ]);
  const pick = (candidates: Product[], fallback: string) => {
    const found = candidates.find((p) => !used.has(p.thumbnail));
    if (!found) return fallback;
    used.add(found.thumbnail);
    return found.thumbnail;
  };

  const categoryCards = [
    { href: "/products?category=loungewear", label: "Loungewear", image: "/categories/loungewear.webp", position: "50% 12%" },
    // The Spor campaign shot is the editorial banner below.
    { href: "/products?category=spor", label: "Spor", image: pick([...spor].sort(byBestSelling), "/categories/spor-studyo.webp"), position: "50% 20%" },
    { href: "/products?category=pijama", label: "Pijama", image: "/categories/pijama.webp", position: "50% 4%" },
    { href: "/products?filter=new", label: "Yeni Gelenler", image: pick(newArrivals, "/hero/evde-rahatlik.webp"), position: "50% 20%" },
  ];
  // The seasonal edit is the largest image after the hero, so it keeps the
  // calm Pijama campaign shot (shared with the Pijama card) rather than
  // whichever product photo happens to be left — Pijama has only 3 products.
  const seasonalImage = "/categories/pijama.webp";
  const lifestylePortrait = pick([...loungewear].sort(byBestSelling), "/categories/loungewear.webp");

  const shopRows: ShopRow[] = [
    { href: "/products?category=loungewear", label: "Loungewear", count: loungewear.length, image: pick(loungewear, "/categories/loungewear.webp") },
    { href: "/products?category=spor", label: "Spor", count: spor.length, image: pick(spor, "/categories/spor-studyo.webp") },
    { href: "/products?category=pijama", label: "Pijama", count: pijama.length, image: pick(pijama, "/categories/pijama.webp") },
    { href: "/products?filter=new", label: "Yeni Gelenler", count: newArrivals.length, image: pick(newArrivals, "/hero/evde-rahatlik.webp") },
    ...(onSale.length > 0
      ? [{ href: "/products?sort=discount", label: "İndirimdekiler", count: onSale.length, image: pick(onSale, onSale[0].thumbnail) }]
      : []),
    { href: "/products", label: "Tüm Ürünler", count: all.length, image: pick(all, "/hero/evde-rahatlik.webp") },
  ];

  return (
    <div className="overflow-x-clip">
      {/* 1. Hero — full-bleed. The photo is anchored to its top edge: the
          models' heads sit ~5% from the top, so any crop has to come off the
          floor, never the top. A flat 18% scrim (no gradients) keeps the
          copy legible over the light sofa/rug area. Entrance: the image
          settles, then the copy rises in sequence (off with reduced motion). */}
      <section className="relative h-[calc(100dvh-140px)] min-h-[620px] overflow-hidden bg-[#a29786] hdr:h-[calc(100dvh-96px)]">
        <Image
          src="/hero/evde-rahatlik.webp"
          alt="Güneşli bir salonda EDACEY loungewear takımlarıyla yürüyen iki kadın"
          fill
          sizes="100vw"
          priority
          className="animate-hero-settle origin-top object-cover object-[54%_0%]"
        />
        <div className="pointer-events-none absolute inset-0 bg-ink/[.18]" />
        <div className="absolute inset-x-0 bottom-12 tab:bottom-16">
          <div className="page-x flex items-end justify-between gap-10 text-on-image">
            <div className="flex max-w-[720px] flex-col">
              <span
                className="animate-hero-rise text-caption uppercase tracking-eyebrow"
                style={delay(150)}
              >
                Yeni sezon — Sonbahar 2026
              </span>
              <h1
                className="animate-hero-rise mt-5 text-[clamp(3.25rem,7.2vw,7.5rem)] font-light leading-[0.95] tracking-[-0.03em]"
                style={delay(300)}
              >
                Gün içinde
                <br />
                rahatlık
              </h1>
              <p
                className="animate-hero-rise mt-6 max-w-[38ch] text-body-lg font-light"
                style={delay(450)}
              >
                Evden dışarıya uzanan yumuşak dokular; taş, krem ve antrasit tonlarında.
              </p>
              <div
                className="animate-hero-rise mt-8 flex flex-wrap items-center gap-x-8 gap-y-5"
                style={delay(600)}
              >
                <Link
                  href="/products?category=loungewear"
                  className="inline-flex h-[52px] items-center bg-on-image px-9 text-nav uppercase tracking-[0.16em] text-ink transition-colors duration-300 hover:bg-background"
                >
                  Koleksiyonu keşfet
                </Link>
                <Link href="/products?filter=new" className="text-cta">
                  Yeni gelenler
                </Link>
              </div>
            </div>
            {/* A plain link group, not a <nav>: it repeats the header's
                category links, so a second navigation landmark would just be
                noise for screen-reader users. */}
            <div
              className="animate-hero-rise hidden flex-col items-end gap-2 text-caption uppercase tracking-eyebrow desk:flex"
              style={delay(750)}
            >
              <Link href="/products?category=loungewear" className="transition-opacity hover:opacity-70">
                Loungewear
              </Link>
              <Link href="/products?category=spor" className="transition-opacity hover:opacity-70">
                Spor
              </Link>
              <Link href="/products?category=pijama" className="transition-opacity hover:opacity-70">
                Pijama
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Category cards — 1.3fr 1.3fr 1fr 1fr, bottom-aligned. */}
      <section className="page-x pt-[120px]">
        <div className="grid grid-cols-2 items-end gap-x-2 gap-y-8 desk:grid-cols-[1.3fr_1.3fr_1fr_1fr] desk:gap-2">
          {categoryCards.map((c, i) => (
            <Link key={c.href} href={c.href} className="group flex flex-col gap-3.5">
              <div
                className={`relative aspect-[3/4] overflow-hidden bg-cream-deep ${i >= 2 ? "desk:aspect-[2/3]" : ""}`}
              >
                <Image
                  src={c.image}
                  alt=""
                  fill
                  sizes="(max-width: 1099px) 50vw, 30vw"
                  className="object-cover transition-transform duration-[1200ms] ease-soft group-hover:scale-[1.03]"
                  style={{ objectPosition: c.position }}
                />
              </div>
              <span className="self-start border-b border-transparent pb-1 text-nav uppercase tracking-cta transition-colors duration-300 group-hover:border-ink">
                {c.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Seasonal edit — 7-col image, text bottom-aligned in cols 9–12. */}
      <section className="page-x pt-40">
        <div className="grid grid-cols-12 items-end gap-2">
          <div className="relative col-span-12 aspect-[3/4] bg-image-alt tab:col-span-7">
            <Image
              src={seasonalImage}
              alt="Pijama takımıyla sabah ışığında dinlenen kadın"
              fill
              sizes="(max-width: 759px) 100vw, 58vw"
              className="object-cover object-[50%_4%]"
            />
          </div>
          <div className="col-span-12 mt-10 flex flex-col gap-12 tab:col-start-8 tab:col-span-5 tab:mt-0 desk:col-start-9 desk:col-span-4">
            <div className="flex flex-col gap-[18px]">
              <span className="text-caption uppercase tracking-eyebrow text-text-3">Sezon seçkisi</span>
              <h2 className="headline text-display-lg">Gece &amp; Sabah</h2>
              <p className="max-w-[38ch] text-pretty text-body font-light text-ink-soft">
                Yumuşak modal ve pamuklu pijamalar; geceden yavaş sabahlara aynı rahatlıkla.
              </p>
              <Link href="/products?category=pijama" className="text-cta mt-2 self-start">
                Seçkiyi keşfet
              </Link>
            </div>
            {editPicks.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {editPicks.map((p) => (
                  <Link key={p.id} href={`/products/${p.id}`} className="flex flex-col gap-1.5">
                    <div className="relative mb-2 aspect-[2/3] bg-cream-deep">
                      <Image src={p.thumbnail} alt="" fill sizes="(max-width: 759px) 50vw, 15vw" className="object-cover" />
                    </div>
                    <span className="text-card">{p.title}</span>
                    <span className="text-card text-text-3">{formatPrice(discountedPrice(p))}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Best sellers — tabs + 4-col grid. */}
      <BestSellers products={bestSellers} />

      {/* 5. Spor editorial — photo left, copy right (beside the photo rather
          than over it: the model fills the middle of this shot, so overlaid
          text sat on her and didn't read). Lists real Spor best sellers so
          the block leads somewhere (names only — no prices in an editorial
          block). Mobile: photo first. */}
      <section className="page-x pt-40">
        <div className="grid grid-cols-12 items-end gap-x-2 gap-y-10">
          <div className="relative col-span-12 aspect-[4/3] bg-[#6f675c] tab:col-span-7 desk:col-span-8">
            <Image
              src="/categories/spor-studyo.webp"
              alt="Stüdyoda EDACEY spor takımıyla esneyen kadın"
              fill
              sizes="(max-width: 759px) 100vw, 66vw"
              className="object-cover"
            />
          </div>
          <div className="col-span-12 flex flex-col gap-[18px] tab:col-start-8 tab:col-span-5 tab:pl-6 desk:col-start-9 desk:col-span-4 desk:pl-10">
            <span className="text-caption uppercase tracking-eyebrow text-text-3">Spor</span>
            <h2 className="headline text-balance text-display-lg">Sakin renklerle hareket et</h2>
            <p className="max-w-[36ch] text-pretty text-body font-light text-ink-soft">
              Toparlayıcı taytlar, ikinci ten gibi üstler ve takımlar; antrenman gününe de dinlenme
              gününe de.
            </p>
            {sporPicks.length > 0 && (
              <ul className="mt-4 border-t border-line">
                {sporPicks.map((p) => (
                  <li key={p.id} className="border-b border-line">
                    <Link
                      href={`/products/${p.id}`}
                      className="group flex items-center justify-between gap-4 py-3.5 text-card"
                    >
                      <span className="transition-colors group-hover:text-text-3">{p.title}</span>
                      <ArrowRightIcon
                        size={14}
                        className="flex-none text-text-3 transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/products?category=spor" className="text-cta mt-4 self-start">
              Spor&apos;u keşfet
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Shop by category — hover list + crossfading image. */}
      <ShopByCategory rows={shopRows} />

      {/* 7. New arrivals — scroll-snap rail. */}
      {newArrivals.length > 0 && <NewArrivalsRail products={newArrivals} />}

      {/* 8. Lifestyle — 3:2 landscape + offset portrait and copy. */}
      <section className="page-x pt-40">
        <div className="grid grid-cols-12 items-start gap-2">
          <div className="relative col-span-12 aspect-[3/2] bg-[#ddd6ca] tab:col-span-8">
            <Image
              src="/editorial/rahatlik-seninle.webp"
              alt="Taş kemerli bir avluda EDACEY parçalarıyla yürüyen kadın"
              fill
              sizes="(max-width: 759px) 100vw, 66vw"
              className="object-cover object-[40%_20%]"
            />
          </div>
          <div className="col-span-12 mt-10 flex flex-col gap-10 tab:col-start-9 tab:col-span-4 tab:mt-0 desk:col-start-10 desk:col-span-3 desk:mt-[22%]">
            <div className="relative aspect-[3/4] w-3/5 bg-image-alt tab:w-full">
              <Image
                src={lifestylePortrait}
                alt=""
                fill
                sizes="(max-width: 759px) 60vw, 25vw"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="headline text-[clamp(30px,2.6vw,42px)] leading-[1.08]">
                Yavaş pazarlar, yumuşak dokular
              </h2>
              <p className="max-w-[34ch] text-body font-light text-ink-soft">
                Fırçalanmış pamuk ve modal loungewear; evde kalmak için.
              </p>
              <Link href="/products?category=loungewear" className="text-cta mt-2 self-start">
                Loungewear&apos;ı keşfet
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Newsletter. */}
      <section className="page-x pb-4 pt-44">
        <div className="mx-auto flex max-w-[520px] flex-col items-center gap-4 text-center">
          <h2 className="text-[clamp(28px,2.6vw,38px)] font-light leading-[1.1] tracking-title">
            Yeni sezonu ilk sen gör
          </h2>
          <p className="max-w-[40ch] text-body font-light text-ink-soft">
            Yeni koleksiyonlar, özel indirim tarihleri ve kampanyalardan ilk sen haberdar ol.
          </p>
          <NewsletterSignup />
        </div>
      </section>
    </div>
  );
}
