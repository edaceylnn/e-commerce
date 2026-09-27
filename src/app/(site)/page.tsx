import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { getProductsByCategory } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

const CATEGORY_TILES = [
  {
    slug: "loungewear" as const,
    label: "Loungewear",
    image: "/categories/loungewear.webp",
    position: "50% 12%",
    copy: "Yumuşak dokular, dışarıya taşan ev rahatlığı.",
    className: "md:col-span-2 md:row-span-2",
    imageClassName: "aspect-[4/5] md:min-h-[620px]",
  },
  {
    slug: "spor" as const,
    label: "Spor",
    image: "/categories/spor-studyo.webp",
    position: "50% 22%",
    copy: "Hareket için sade, güçlü ve hafif parçalar.",
    className: "",
    imageClassName: "aspect-[4/5] md:aspect-[4/3]",
  },
  {
    slug: "pijama" as const,
    label: "Pijama",
    image: "/categories/pijama.webp",
    position: "50% 4%",
    copy: "Geceye ve yavaş sabahlara hazır seçimler.",
    className: "",
    imageClassName: "aspect-[4/5] md:aspect-[4/3]",
  },
];

const FEATURED_PRODUCT_IDS = [1, 3, 2, 4];

const HOME_INTRO_CSS = `
@keyframes home-fade-up {
  from { transform: translateY(18px); opacity: 0 }
  to { transform: translateY(0); opacity: 1 }
}
@keyframes home-image-settle {
  from { transform: scale(1.035) }
  to { transform: scale(1) }
}
.home-fade-up {
  animation: home-fade-up 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) var(--home-delay, 0s) both;
}
.home-image-settle {
  animation: home-image-settle 1.35s cubic-bezier(0.25, 0.6, 0.3, 1) both;
}
@media (prefers-reduced-motion: reduce) {
  .home-fade-up, .home-image-settle { animation: none }
}
`;

const delay = (ms: number) => ({ "--home-delay": `${ms}ms` }) as CSSProperties;

export default async function HomePage() {
  const [loungewear, spor, pijama] = await Promise.all([
    getProductsByCategory("loungewear"),
    getProductsByCategory("spor"),
    getProductsByCategory("pijama"),
  ]);

  const counts: Record<(typeof CATEGORY_TILES)[number]["slug"], number> = {
    loungewear: loungewear.length,
    spor: spor.length,
    pijama: pijama.length,
  };

  const all = [...loungewear, ...spor, ...pijama];
  const curated = FEATURED_PRODUCT_IDS.flatMap((id) => all.find((p) => p.id === id) ?? []);
  const featuredProducts = [
    ...curated,
    ...all
      .filter((p) => !curated.includes(p))
      .sort((a, b) => b.rating - a.rating),
  ].slice(0, 4);

  return (
    <div className="overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: HOME_INTRO_CSS }} />

      <section className="relative min-h-[78svh] overflow-hidden bg-ink text-background lg:min-h-[calc(100svh-116px)]">
        <Image
          src="/hero/evde-rahatlik.webp"
          alt="Güneşli bir salonda EDACEY loungewear takımlarıyla yürüyen iki kadın"
          fill
          sizes="100vw"
          className="home-image-settle object-cover object-[54%_34%]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/78 via-ink/16 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(22,21,15,0.48),rgba(22,21,15,0.08)_48%,rgba(22,21,15,0))]" />

        <div className="relative z-10 flex min-h-[78svh] items-end px-5 pb-10 pt-20 sm:px-10 sm:pb-14 lg:min-h-[calc(100svh-116px)] lg:px-16 lg:pb-16">
          <div className="max-w-[720px]">
            <p className="home-fade-up font-sans text-xs font-semibold uppercase tracking-label text-background/80">
              EDACEY
            </p>
            <h1
              className="home-fade-up mt-4 max-w-[11ch] font-display text-[clamp(3.5rem,10vw,9rem)] leading-[0.9] tracking-display"
              style={delay(110)}
            >
              Gün içinde rahatlık.
            </h1>
            <p
              className="home-fade-up mt-5 max-w-[36ch] font-sans text-base leading-7 text-background/88 sm:text-lg"
              style={delay(220)}
            >
              Evden dışarıya uzanan yumuşak, net ve kendinden emin parçalar.
            </p>
            <div className="home-fade-up mt-7 flex flex-wrap gap-3" style={delay(310)}>
              <Link
                href="/products"
                className="inline-flex items-center justify-center bg-background px-7 py-4 font-sans text-xs font-semibold uppercase tracking-label text-ink transition hover:bg-accent hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-background active:translate-y-px"
              >
                Koleksiyonu Gör
              </Link>
              <Link
                href="/products?filter=new"
                className="inline-flex items-center justify-center border border-background/65 px-7 py-4 font-sans text-xs font-semibold uppercase tracking-label text-background transition hover:border-background hover:bg-background/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-background active:translate-y-px"
              >
                Yeni Gelenler
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-[1440px]">
          <div className="max-w-2xl">
            <h2 className="font-display text-display-lg tracking-display">
              Evde başlayan stil, günün ritmine karışır.
            </h2>
            <p className="mt-4 max-w-[52ch] font-sans text-body-lg text-ink-soft">
              EDACEY seçimi; lounge, spor ve pijama kategorilerini aynı sakin güvenle bir araya getirir.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3 md:auto-rows-fr">
            {CATEGORY_TILES.map((tile) => (
              <Link
                key={tile.slug}
                href={`/products?category=${tile.slug}`}
                className={`group flex flex-col bg-ivory transition hover:-translate-y-1 hover:shadow-lift ${tile.className}`}
              >
                <div className={`relative overflow-hidden bg-cream-deep ${tile.imageClassName}`}>
                  <Image
                    src={tile.image}
                    alt={tile.label}
                    fill
                    sizes={tile.slug === "loungewear" ? "(max-width: 768px) 100vw, 66vw" : "(max-width: 768px) 100vw, 33vw"}
                    className="object-cover transition duration-700 group-hover:scale-[1.035]"
                    style={{ objectPosition: tile.position }}
                  />
                </div>
                <div className="flex min-h-36 flex-col justify-between gap-5 px-5 py-5 sm:px-6">
                  <div>
                    <h3 className="font-display text-display-md tracking-display">{tile.label}</h3>
                    <p className="mt-2 max-w-[28ch] text-body-sm text-ink-soft">{tile.copy}</p>
                  </div>
                  <span className="font-sans text-xs font-semibold uppercase tracking-label text-accent">
                    {counts[tile.slug]} Ürün
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ivory px-5 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="font-display text-display-lg tracking-display">Öne çıkan seçimler</h2>
              <p className="mt-3 max-w-[44ch] text-body-lg text-ink-soft">
                En sevdiğimiz dokuları ve kolay kombinlenen siluetleri tek bakışta gör.
              </p>
            </div>
            <Link
              href="/products"
              className="border-b border-ink pb-1 font-sans text-xs font-semibold uppercase tracking-label transition hover:text-accent"
            >
              Tümünü Gör
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-5 lg:gap-x-6">
            {featuredProducts.map((p, index) => (
              <div
                key={p.id}
                className={index === 0 ? "col-span-2" : "col-span-1"}
              >
                <ProductCard product={p} badge={null} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="relative aspect-[5/4] overflow-hidden bg-cream-deep lg:aspect-[16/10]">
            <Image
              src="/editorial/rahatlik-seninle.webp"
              alt="Taş kemerli bir avluda EDACEY parçalarıyla yürüyen kadın"
              fill
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover object-[40%_20%]"
            />
          </div>
          <div className="pb-1 lg:pb-10">
            <h2 className="font-display text-display-lg tracking-display">
              Rahatlık, üstünde taşıdığın bir tavır.
            </h2>
            <p className="mt-5 max-w-[42ch] text-body-lg text-ink-soft">
              Hafif katmanlar, yumuşak renkler ve gün boyu bozulmayan bir sadelik.
            </p>
            <Link
              href="/products?category=loungewear"
              className="mt-7 inline-flex border-b border-ink pb-1 font-sans text-xs font-semibold uppercase tracking-label transition hover:text-accent"
            >
              Loungewear Keşfet
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
