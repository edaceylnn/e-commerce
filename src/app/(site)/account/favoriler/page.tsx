import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProductsByIds } from "@/lib/products";
import { WishlistProductCard } from "@/components/WishlistProductCard";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryLink } from "@/components/account/AccountButtons";
import { AccountCard } from "@/components/account/AccountCard";
import { HeartIcon } from "@/components/icons/HeartIcon";

export default async function FavorilerPage() {
  const session = await getSession();
  if (!session) {
    redirect("/account");
  }

  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.userId },
    select: { productId: true, priceAtAdd: true },
  });
  const products = await getProductsByIds(items.map((i) => i.productId));
  const priceAtAddByProduct = new Map(
    items.map((i) => [i.productId, i.priceAtAdd ? Number(i.priceAtAdd) : null])
  );

  return (
    <AccountCard>
      <h2 className="font-display text-2xl">Favorilerim</h2>

      {products.length === 0 ? (
        <EmptyState
          icon={HeartIcon}
          title="Henüz favori ürününüz yok."
          description="Beğendiğiniz ürünleri favorilere ekleyin, buradan hızlıca ulaşın."
          action={<PrimaryLink href="/products">Ürünleri Keşfet</PrimaryLink>}
        />
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3">
          {products.map((product) => (
            <WishlistProductCard
              key={product.id}
              product={product}
              priceAtAdd={priceAtAddByProduct.get(product.id) ?? null}
            />
          ))}
        </div>
      )}
    </AccountCard>
  );
}
