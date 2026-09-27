// EDACEY catalog seed — a static loungewear/spor/pijama catalog (no external
// fetch). This replaces the project's original DummyJSON-import seed after
// the storefront's rebrand from a beauty/cosmetics demo to an apparel brand.
//
// Deliberately written as upserts against the SAME product ids the old
// cosmetics catalog used (see prisma/migrations history) rather than fresh
// rows: those ids are already referenced by seeded Order/Review/WishlistItem
// test data, and reusing them keeps that data valid instead of orphaning it.
// Categories are upserted by slug; a database seeded before the slug rename
// (beauty/fragrances/skin-care) is migrated in place by renameLegacyCategories(). Every cosmetic-specific field (skinTypes, spf,
// fullIngredients, ...) is explicitly cleared for the same reason — nothing
// from the old catalog should leak through into the apparel one.
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  { slug: "loungewear", label: "Loungewear" },
  { slug: "spor", label: "Spor" },
  { slug: "pijama", label: "Pijama" },
] as const;

const BRAND = { name: "EDACEY", slug: "edacey" };

const COSMETIC_FIELD_RESET = {
  skinTypes: [] as string[],
  skinConcerns: [] as string[],
  finish: null,
  coverage: null,
  texture: null,
  usagePurpose: null,
  fullIngredients: null,
  usageInstructions: null,
  warnings: null,
  isVegan: false,
  isCrueltyFree: false,
  isParabenFree: false,
  spf: null,
  volumeLabel: null,
  origin: "İzmir",
  expiryInfo: null,
};

type SeedProduct = {
  id: number;
  categorySlug: (typeof CATEGORIES)[number]["slug"];
  title: string;
  description: string;
  price: number;
  discountPercentage?: number;
  isNew?: boolean;
  tags: string[];
  colorLabel: string;
  colorHex: string;
  images: string[]; // /products/*.{jpg,webp}, first is the thumbnail
};

const SIZES = ["XS", "S", "M", "L", "XL"];
const SIZE_GROUP_NAME = "Standart";

const PRODUCTS: SeedProduct[] = [
  {
    id: 1,
    categorySlug: "loungewear",
    title: "Yumuşak Örme Hırka & Pantolon",
    description:
      "Yün karışımlı yumuşak örme takım. Oversize hırka, geniş paça pantolon; ayrı ayrı da giyilir.",
    price: 2390,
    tags: ["loungewear", "örme"],
    colorLabel: "Bebe Mavisi",
    colorHex: "#a8bfd6",
    images: ["/products/orme-hirka-pantolon.webp"],
  },
  {
    id: 2,
    categorySlug: "loungewear",
    title: "Uzun Kollu Ev Takımı",
    description:
      "Fırfır kenarlı ribana üst ve geniş paça alt. Hafif pamuk karışımı, gün boyu üzerinde kalır.",
    price: 990,
    isNew: true,
    tags: ["loungewear", "yeni"],
    colorLabel: "Ekru",
    colorHex: "#efe9de",
    images: ["/products/uzun-kollu-ev-takimi.webp"],
  },
  {
    id: 3,
    categorySlug: "loungewear",
    title: "Çizgili Ev Giyim Takımı",
    description: "Pamuklu Çizgili Ev Giyim Takımı",
    price: 1190,
    tags: ["loungewear"],
    colorLabel: "Çizgili Ekru",
    colorHex: "#c3d0da",
    images: ["/products/cizgili-ev-giyim-takimi-v2.webp"],
  },
  {
    id: 4,
    categorySlug: "spor",
    title: "Flare Tayt & Büstiyer Yoga Takımı",
    description:
      "Yüksek bel flare tayt ve destekli büstiyerden oluşan takım. Yoga matından gün içine rahatça eşlik eder.",
    price: 1690,
    tags: ["spor"],
    colorLabel: "Kahve",
    colorHex: "#4b3a31",
    images: ["/products/flare-yoga-takimi.webp"],
  },
  {
    id: 5,
    categorySlug: "loungewear",
    title: "Yumuşak Şort Takımı",
    description:
      "Nefes alan modal karışımlı şort ve tişört takımı. Sıcak günler için hafif iç giyim tayfı.",
    price: 890,
    tags: ["loungewear"],
    colorLabel: "Adaçayı",
    colorHex: "#a7bba4",
    images: ["/products/sage-pajama.jpg"],
  },
  {
    id: 6,
    categorySlug: "spor",
    title: "Katlamalı Bel Flare Tayt",
    description:
      "Katlanabilir yüksek bel, ispanyol paça. Kompakt interlok kumaş; yogadan sokağa geçiyor.",
    price: 1290,
    isNew: true,
    tags: ["spor", "yeni"],
    colorLabel: "Kil",
    colorHex: "#d8cbba",
    images: ["/products/clay-flare.jpg"],
  },
  {
    id: 7,
    categorySlug: "spor",
    title: "Dikişsiz Spor Büstiyer",
    description:
      "Orta destekli, dikişsiz örgü. Nefes alan sırt paneli ve çıkarılabilir pedler.",
    price: 690,
    tags: ["spor"],
    colorLabel: "Ekru",
    colorHex: "#efe9de",
    images: ["/products/ecru-bra.jpg"],
  },
  {
    id: 8,
    categorySlug: "spor",
    title: "Kompakt Tayt & Büstiyer Takım",
    description:
      "Yüksek bel, opak kompakt kumaş. Squat geçirmez, gizli bel cebi.",
    price: 1490,
    tags: ["spor"],
    colorLabel: "Zeytin Yeşili",
    colorHex: "#8b9e6b",
    images: ["/products/green-legging.jpg"],
  },
  {
    id: 9,
    categorySlug: "spor",
    title: "Crossover Flare Takım",
    description:
      "Çapraz bel detaylı flare tayt ve destekli büstiyer. Mat, kalın kompakt kumaş.",
    price: 1890,
    discountPercentage: 40,
    tags: ["spor", "indirim"],
    colorLabel: "Kahve",
    colorHex: "#4b3a31",
    images: ["/products/brown-set.jpg"],
  },
  {
    id: 10,
    categorySlug: "spor",
    title: "Crop Büstiyer — Zeytin",
    description:
      "Geniş alt bant, düşük destek. Pilates ve yoga için hafif dikişsiz örgü.",
    price: 790,
    tags: ["spor"],
    colorLabel: "Zeytin Yeşili",
    colorHex: "#7e8c5c",
    images: ["/products/green-bra.jpg"],
  },
  {
    id: 118,
    categorySlug: "pijama",
    title: "Çizgili Modal Pijama Takımı",
    description:
      "İnce çizgili modal örme. Askılı body, geniş paça pantolon ve uyumlu hırka.",
    price: 1590,
    tags: ["pijama"],
    colorLabel: "Çizgili Ekru",
    colorHex: "#c3d0da",
    images: ["/products/stripe-modal.jpg"],
  },
  {
    id: 119,
    categorySlug: "pijama",
    title: "Tencel Gömlek Pijama",
    description:
      "Biyeli yaka, sedef düğme, cep detayı. Serin tutan tencel dokuma.",
    price: 1190,
    tags: ["pijama"],
    colorLabel: "Adaçayı",
    colorHex: "#a7bba4",
    images: ["/products/sage-pajama.jpg"],
  },
  {
    id: 120,
    categorySlug: "pijama",
    title: "Saten Askılı Gecelik",
    description:
      "Bias kesim saten gecelik. Ayarlanabilir ince askı, dantel detay.",
    price: 990,
    tags: ["pijama"],
    colorLabel: "Pudra",
    colorHex: "#f0dcde",
    images: ["/products/lift-pajama.jpg"],
  },
];

// Slugs the categories had before the apparel rename. Renaming the rows in
// place (rather than upserting new ones) keeps every product, campaign and
// order that points at them by id intact.
const LEGACY_CATEGORY_SLUGS: Record<string, (typeof CATEGORIES)[number]["slug"]> = {
  beauty: "loungewear",
  fragrances: "spor",
  "skin-care": "pijama",
};

async function renameLegacyCategories() {
  for (const [from, to] of Object.entries(LEGACY_CATEGORY_SLUGS)) {
    const [legacy, current] = await Promise.all([
      prisma.category.findUnique({ where: { slug: from } }),
      prisma.category.findUnique({ where: { slug: to } }),
    ]);
    if (legacy && !current) {
      await prisma.category.update({ where: { id: legacy.id }, data: { slug: to } });
    }
  }
}

async function seedCatalog() {
  const categoryIdBySlug: Record<string, string> = {};
  for (const { slug, label } of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug },
      update: { label },
      create: { slug, label },
    });
    categoryIdBySlug[slug] = category.id;
  }

  // The old catalog's "skin-care" category had one empty subcategory
  // ("Yüz Serumları") with no products — drop it, it doesn't map to
  // anything in the apparel taxonomy.
  await prisma.category.deleteMany({
    where: { slug: "yuz-serumlari", products: { none: {} } },
  });

  const brand = await prisma.brand.upsert({
    where: { name: BRAND.name },
    update: { slug: BRAND.slug },
    create: BRAND,
  });

  // Color/Size are shared reference data (Bölüm 5–6 of the PRD) — upserted
  // once here rather than per-variant, so every product reuses the same
  // Color/Size row instead of minting duplicates.
  const colorIdByLabel: Record<string, string> = {};
  const distinctColors = new Map(PRODUCTS.map((p) => [p.colorLabel, p.colorHex]));
  for (const [name, hex] of distinctColors) {
    const color = await prisma.color.upsert({
      where: { name },
      update: { hex },
      create: { name, hex },
    });
    colorIdByLabel[name] = color.id;
  }

  const sizeGroup = await prisma.sizeGroup.upsert({
    where: { name: SIZE_GROUP_NAME },
    update: {},
    create: { name: SIZE_GROUP_NAME },
  });
  const sizeIdByLabel: Record<string, string> = {};
  for (const [position, label] of SIZES.entries()) {
    const size = await prisma.size.upsert({
      where: { sizeGroupId_label: { sizeGroupId: sizeGroup.id, label } },
      update: { position },
      create: { sizeGroupId: sizeGroup.id, label, position },
    });
    sizeIdByLabel[label] = size.id;
  }

  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        title: p.title,
        description: p.description,
        categoryId: categoryIdBySlug[p.categorySlug],
        price: p.price,
        discountPercentage: p.discountPercentage ?? 0,
        stock: SIZES.length * 20,
        brandId: brand.id,
        tags: p.tags,
        ratingAvg: 0,
        ratingCount: 0,
        isNew: p.isNew ?? false,
        thumbnail: p.images[0],
        ...COSMETIC_FIELD_RESET,
      },
      create: {
        id: p.id,
        title: p.title,
        description: p.description,
        categoryId: categoryIdBySlug[p.categorySlug],
        price: p.price,
        discountPercentage: p.discountPercentage ?? 0,
        stock: SIZES.length * 20,
        brandId: brand.id,
        tags: p.tags,
        ratingAvg: 0,
        ratingCount: 0,
        isNew: p.isNew ?? false,
        thumbnail: p.images[0],
        ...COSMETIC_FIELD_RESET,
      },
    });

    // Images and variants are opt-in child rows with no natural upsert key
    // here — replace them wholesale rather than trying to diff.
    await prisma.productImage.deleteMany({ where: { productId: p.id } });
    await prisma.productImage.createMany({
      data: p.images.map((url, position) => ({
        productId: p.id,
        url,
        position,
      })),
    });

    await prisma.productVariant.deleteMany({ where: { productId: p.id } });
    await prisma.productVariant.createMany({
      data: SIZES.map((size, position) => ({
        productId: p.id,
        colorId: colorIdByLabel[p.colorLabel],
        sizeId: sizeIdByLabel[size],
        sku: `ED-${p.id}-${size}`,
        stock: 20,
        position,
      })),
    });
  }

  console.log(`  ${PRODUCTS.length} ürün, ${CATEGORIES.length} kategori, marka: ${brand.name}`);
}

// Test-run noise ("E2E test yorumu ...") accumulated on the old catalog's
// product ids by repeated Playwright runs — not curated demo content, and
// meaningless once attached to a different product after the rebrand.
async function clearStaleReviews() {
  const { count } = await prisma.review.deleteMany({});
  if (count > 0) console.log(`  ${count} eski yorum temizlendi.`);
}

async function rebrandExtras() {
  await prisma.campaign.updateMany({
    where: { name: "Makyaj Kampanyası" },
    data: { name: "Loungewear Kampanyası" },
  });
  await prisma.collection.updateMany({
    where: { slug: "altin-isiltisi-serisi" },
    data: {
      label: "İzmir Serisi",
      description: "Yerel atölyede dokunan, sınırlı sayıda üretilen parçalar.",
    },
  });
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn(
      "SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin seed."
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`  Admin kullanıcı hazır: ${email}`);
}

async function main() {
  console.log("Katalog güncelleniyor...");
  await renameLegacyCategories();
  await seedCatalog();
  await rebrandExtras();
  await clearStaleReviews();
  console.log("Admin kullanıcı oluşturuluyor...");
  await seedAdmin();
  console.log("Seed tamamlandı.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
