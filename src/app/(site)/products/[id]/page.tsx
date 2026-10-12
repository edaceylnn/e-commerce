import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  PRODUCT_CATEGORIES,
  getProductById,
  getProductExtras,
  getProductsByCategory,
  type CategorySlug,
} from "@/lib/products";
import { ProductDetail } from "@/components/pdp/ProductDetail";
import { ProductCard } from "@/components/ProductCard";
import { ReviewSection } from "@/components/ReviewSection";
import { parseProductParam, productPath } from "@/lib/product-url";

// Shared by generateMetadata and the page so the product is read once.
const loadProduct = cache(async (param: string) => {
  const productId = parseProductParam(param);
  if (productId === null) return null;
  return getProductById(productId).catch(() => null);
});

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await loadProduct((await params).id);
  if (!product) return {};
  const description = product.description.length > 160 ? `${product.description.slice(0, 157)}…` : product.description;
  return {
    title: `${product.title} — EDACEY`,
    description,
    alternates: { canonical: productPath(product) },
    openGraph: { title: product.title, description, images: [product.thumbnail] },
  };
}

// Product page — design handoff screen 3.
export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const product = await loadProduct(id);
  if (!product) {
    notFound();
  }

  // Bare-id, old-title or otherwise non-canonical URLs land on the real one.
  const canonical = productPath(product);
  if (`/products/${id}` !== canonical) permanentRedirect(canonical);

  const category = PRODUCT_CATEGORIES.find((c) => c.slug === product.category);
  const [extras, siblings] = await Promise.all([
    getProductExtras(product.id),
    category ? getProductsByCategory(category.slug as CategorySlug) : Promise.resolve([]),
  ]);
  const completeTheLook = siblings.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    // Bottom padding on mobile clears the fixed add-to-bag bar.
    <div className="pb-24 tab:pb-0">
      <nav
        aria-label="Konum"
        className="page-x flex flex-wrap gap-2.5 pt-5 text-nav tracking-[0.02em] text-text-3"
      >
        <Link href="/" className="hover:text-ink">
          Anasayfa
        </Link>
        <span aria-hidden>/</span>
        {category && (
          <>
            <Link href={`/products?category=${category.slug}`} className="hover:text-ink">
              {category.label}
            </Link>
            <span aria-hidden>/</span>
          </>
        )}
        <span className="text-ink">{product.title}</span>
      </nav>

      <ProductDetail product={product} extras={extras} />

      {completeTheLook.length > 0 && (
        <section className="page-x pt-20 tab:pt-28">
          <div className="mb-7 flex items-baseline justify-between">
            <h2 className="text-body-sm uppercase tracking-eyebrow">Kombini Tamamla</h2>
            {category && (
              <Link href={`/products?category=${category.slug}`} className="text-cta tracking-label">
                Tümünü gör
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-1.5 gap-y-9 tab:grid-cols-4 tab:gap-x-2">
            {completeTheLook.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <ReviewSection productId={product.id} />
    </div>
  );
}
