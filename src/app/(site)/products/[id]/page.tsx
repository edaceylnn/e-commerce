import { notFound } from "next/navigation";
import { getProductById } from "@/lib/products";
import { ProductDetailInteractive } from "@/components/ProductDetailInteractive";
import { ReviewSection } from "@/components/ReviewSection";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId)) {
    notFound();
  }

  const product = await getProductById(productId).catch(() => null);
  if (!product) {
    notFound();
  }

  const discounted = product.price * (1 - product.discountPercentage / 100);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <ProductDetailInteractive product={product} discountedPrice={discounted} />

      <ReviewSection productId={product.id} />
    </div>
  );
}
