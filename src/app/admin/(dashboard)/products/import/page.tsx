import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/admin/Card";
import { AdminButtonLink } from "@/components/admin/Button";
import { AdminShopifyImport } from "@/components/AdminShopifyImport";
import { MAX_IMPORT_PRODUCTS } from "@/lib/shopify-import";

// Shopify product CSV, both ways: export the catalog in Shopify's format,
// or import a Shopify export (preview first, then import).
export default async function AdminShopifyCsvPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ position: "asc" }, { label: "asc" }],
    select: { id: true, label: true },
  });

  return (
    <div>
      <PageHeader
        title="Shopify CSV"
        description="Ürünleri Shopify'ın ürün CSV biçiminde dışa aktarın ya da bir Shopify dışa aktarımını içe alın."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <Card title="İçe aktar" description={`Önce önizleme gösterilir; onaylamadan hiçbir şey kaydedilmez. En fazla ${MAX_IMPORT_PRODUCTS} ürün.`}>
          <AdminShopifyImport categories={categories} />
        </Card>
        <div className="space-y-6">
          <Card title="Dışa aktar" description="Tüm ürünler, varyantlar (renk × beden), fiyatlar, stok ve görseller.">
            <AdminButtonLink variant="secondary" href="/api/admin/products/export/shopify">
              Shopify CSV indir
            </AdminButtonLink>
          </Card>
          <Card title="Nasıl eşleşir?">
            <ul className="list-disc space-y-1.5 pl-4 text-sm text-adm-text-secondary">
              <li>Bir varyantın SKU&apos;su mağazada varsa o ürün güncellenir; yoksa yeni ürün oluşturulur.</li>
              <li>Seçenekler renk ve beden olmalı (Renk/Color, Beden/Size).</li>
              <li>İndirimli fiyat: Price ve Compare-at price&apos;tan hesaplanır.</li>
              <li>Olmayan renk, beden ve markalar oluşturulur; yeni renkler gri eklenir, sonra düzeltilebilir.</li>
              <li>Başka sitelerdeki görseller indirilip mağazaya kaydedilir; bu mağazanın kendi görselleri olduğu gibi kullanılır.</li>
              <li>Dosyada olmayan varyantlar silinmez.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
