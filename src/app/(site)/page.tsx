import Image from "next/image";
import Link from "next/link";
import {
  getProductsByCategory,
  getUnitsSoldByProduct,
  selectNewArrivals,
  type Product,
} from "@/lib/products";
import { BestSellers } from "@/components/home/BestSellers";
import { NewArrivalsRail } from "@/components/home/NewArrivalsRail";
import { NewsletterSignup } from "@/components/home/NewsletterSignup";
import { formatPrice } from "@/lib/format";
import { discountedPrice } from "@/lib/product-view";
import { ShopByCategory, type ShopRow } from "@/components/home/ShopByCategory";
import { SplitHero } from "@/components/home/SplitHero";

// Homepage — design handoff screen 1, mapped onto the
// store's real catalogue: the three categories stand in for the design's
// Women / Men / Sportswear / Accessories.


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

  // The seasonal edit is the largest image after the hero, so it keeps the
  // calm Pijama campaign shot (shared with the Pijama card) rather than
  // whichever product photo happens to be left — Pijama has only 3 products.
  const seasonalImage = "/categories/pijama.webp";

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
      {/* 1. Hero — one shoot in two halves: black-and-white film and a
          colour close-up (see SplitHero). */}
      <SplitHero />

      {/* 2. Best sellers — right under the hero: products to buy first;
          categories are browsed further down (Shop by category). */}
      <BestSellers products={bestSellers} />

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

      {/* 4. Shop by category — hover list + crossfading image. */}
      <ShopByCategory rows={shopRows} />

      {/* 5. New arrivals — scroll-snap rail. */}
      {newArrivals.length > 0 && <NewArrivalsRail products={newArrivals} />}

      {/* 6. Loungewear campaign — full-bleed photo as a second shop window
          before the newsletter. The model walks left of centre, so from
          tablet up the copy sits over the colonnade on the right (with a
          soft shade from that side); on phones it goes under the photo. */}
      <section className="pt-40">
        <div className="relative tab:h-[70vh] tab:min-h-[520px]">
          <div className="relative aspect-[4/5] overflow-hidden bg-[#ddd6ca] tab:absolute tab:inset-0 tab:aspect-auto">
            <Image
              src="/editorial/rahatlik-seninle.webp"
              alt="Taş kemerli bir avluda EDACEY loungewear parçalarıyla yürüyen kadın"
              fill
              sizes="100vw"
              className="object-cover object-[45%_10%]"
            />
            <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-l from-ink/50 via-ink/15 to-transparent tab:block" />
          </div>
          <div className="page-x pt-8 tab:absolute tab:inset-x-0 tab:bottom-16 tab:flex tab:justify-end tab:pt-0 tab:text-on-image">
            <div className="tab:max-w-[440px]">
              <span className="block text-caption uppercase tracking-eyebrow text-text-3 tab:text-on-image">Loungewear</span>
              <h2 className="mt-4 text-[clamp(2.25rem,3.6vw,3.75rem)] font-light leading-[1.02] tracking-[-0.02em]">
                Yavaş pazarlar,
                <br />
                yumuşak dokular
              </h2>
              <p className="mt-5 max-w-[40ch] text-body font-light text-ink-soft tab:text-on-image">
                Fırçalanmış pamuk ve modal loungewear; evde kalmak için.
              </p>
              <Link
                href="/products?category=loungewear"
                className="mt-7 inline-flex h-[52px] items-center bg-ink px-9 text-nav uppercase tracking-[0.16em] text-background transition-colors duration-300 hover:bg-ink-soft tab:bg-on-image tab:text-ink tab:hover:bg-background"
              >
                Loungewear&apos;ı keşfet
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Newsletter. */}
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
