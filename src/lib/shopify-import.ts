import { access } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/email/outbox";
import { nextProductId } from "@/lib/product-ids";
import { generateSku } from "@/lib/product-variants";
import { downloadImage, RemoteImageError } from "@/lib/remote-image";
import { planPricing, type ParsedProduct } from "@/lib/shopify-csv";
import { slugify } from "@/lib/slugify";
import { removeProductImage, saveProductImage } from "@/lib/uploads";

// Shopify CSV → our catalog. Two steps: plan() says what would happen
// (create / update / skip, new colours, sizes and brands, every problem)
// without writing anything; run() does it. The admin sees the plan first.
//
// Matching an existing product: by any variant SKU, or — for a file we
// exported ourselves — by the "<title>-<id>" handle. Everything else is a
// new product. Variants missing from the file are left alone (never
// deleted); stock from the file replaces ours only when asked.

export const MAX_IMPORT_PRODUCTS = 300;
const MAX_IMAGES_PER_PRODUCT = 10;
const DEFAULT_OPTION = "Standart";
const IMPORTED_SIZE_GROUP = "İçe aktarılan";

// Where an image comes from: this store itself (a file we exported — reused
// as it is, nothing downloaded), or an https address to download. Anything
// else can't be used.
function imageSource(url: string): { local: string } | { remote: string } | null {
  try {
    const u = new URL(url);
    if (u.origin === new URL(siteUrl("/")).origin && /^\/(products|uploads)\//.test(u.pathname)) {
      return { local: decodeURIComponent(u.pathname) };
    }
    if (u.protocol === "https:") return { remote: url };
  } catch {
    // not a URL
  }
  return null;
}

async function localImageExists(publicPath: string) {
  const root = path.join(process.cwd(), "public");
  const file = path.normalize(path.join(root, publicPath));
  if (!file.startsWith(root + path.sep)) return false;
  return access(file).then(
    () => true,
    () => false
  );
}

export type ImportOptions = { fallbackCategoryId: string; taxRate: number; updateStock: boolean };

export type PlannedProduct = {
  handle: string;
  line: number;
  title: string;
  action: "create" | "update" | "skip";
  productId: number | null;
  categoryLabel: string | null;
  variantCount: number;
  imageCount: number;
  errors: string[];
  warnings: string[];
};

export type ImportPlan = {
  products: PlannedProduct[];
  fileErrors: string[];
  newBrands: string[];
  newColors: string[];
  newSizes: string[];
};

const key = (s: string) => s.trim().toLocaleLowerCase("tr-TR");

async function lookups(parsed: ParsedProduct[]) {
  const skus = parsed.flatMap((p) => p.variants.map((v) => v.sku)).filter(Boolean);
  const handleIds = parsed.map((p) => Number(/-(\d+)$/.exec(p.handle)?.[1])).filter(Number.isInteger);
  const [variants, byHandleId, categories, brands, colors, sizes] = await Promise.all([
    prisma.productVariant.findMany({ where: { sku: { in: skus } }, select: { sku: true, productId: true } }),
    prisma.product.findMany({ where: { id: { in: handleIds } }, select: { id: true, title: true } }),
    prisma.category.findMany({ select: { id: true, slug: true, label: true } }),
    prisma.brand.findMany({ select: { id: true, name: true } }),
    prisma.color.findMany({ select: { id: true, name: true } }),
    prisma.size.findMany({ select: { id: true, label: true }, orderBy: { position: "asc" } }),
  ]);
  return {
    productBySku: new Map(variants.map((v) => [v.sku, v.productId])),
    productByHandle: new Map(byHandleId.map((p) => [`${slugify(p.title)}-${p.id}`, p.id])),
    categoryFor: (type: string | null) =>
      type ? categories.find((c) => key(c.label) === key(type) || c.slug === slugify(type)) ?? null : null,
    categories,
    brands: new Map(brands.map((b) => [key(b.name), b.id])),
    colors: new Map(colors.map((c) => [key(c.name), c.id])),
    sizes: new Map(sizes.map((s) => [key(s.label), s.id])),
  };
}

export async function plan(parsed: ParsedProduct[], fileErrors: string[], options: ImportOptions): Promise<ImportPlan> {
  const errors = [...fileErrors];
  if (parsed.length > MAX_IMPORT_PRODUCTS) {
    errors.push(`Tek seferde en fazla ${MAX_IMPORT_PRODUCTS} ürün içe aktarılabilir (dosyada ${parsed.length}). Dosyayı bölün.`);
  }
  const l = await lookups(parsed);
  const fallback = l.categories.find((c) => c.id === options.fallbackCategoryId);
  if (!fallback) errors.push("Varsayılan kategori bulunamadı.");

  const newBrands = new Set<string>();
  const newColors = new Set<string>();
  const newSizes = new Set<string>();

  const products = parsed.map((p): PlannedProduct => {
    const productErrors = [...p.errors];
    const warnings = [...p.warnings];
    const matched = new Set(p.variants.map((v) => l.productBySku.get(v.sku)).filter((id) => id !== undefined));
    const handleMatch = l.productByHandle.get(p.handle);
    if (handleMatch !== undefined) matched.add(handleMatch);
    if (matched.size > 1) productErrors.push(`SKU'lar birden fazla mevcut ürüne ait (${[...matched].join(", ")}).`);
    const productId = matched.size === 1 ? [...matched][0] : null;

    const category = l.categoryFor(p.type);
    if (!category && productId === null && fallback) {
      warnings.push(`${p.type ? `"${p.type}" kategorisi yok` : "Tür (Type) boş"}; "${fallback.label}" kategorisine eklenecek.`);
    }
    const usable = p.images.slice(0, MAX_IMAGES_PER_PRODUCT).filter((img) => {
      if (imageSource(img.url)) return true;
      warnings.push(`Görsel kullanılamaz (https değil), atlanacak: ${img.url}`);
      return false;
    });
    if (productId === null && usable.length === 0) productErrors.push("Yeni ürün için en az bir görsel gerekli.");
    if (p.images.length > MAX_IMAGES_PER_PRODUCT) warnings.push(`İlk ${MAX_IMAGES_PER_PRODUCT} görsel alınacak.`);
    if (p.variants.length > 0) warnings.push(...planPricing(p.variants).warnings);

    if (p.vendor && !l.brands.has(key(p.vendor))) newBrands.add(p.vendor);
    if (p.hasOptions) {
      for (const v of p.variants) {
        const color = v.color ?? DEFAULT_OPTION;
        const size = v.size ?? DEFAULT_OPTION;
        if (!l.colors.has(key(color))) newColors.add(color);
        if (!l.sizes.has(key(size))) newSizes.add(size);
      }
    }

    const skip = productErrors.length > 0 || errors.length > 0;
    return {
      handle: p.handle,
      line: p.line,
      title: p.title,
      action: skip ? "skip" : productId !== null ? "update" : "create",
      productId,
      categoryLabel: (category ?? (productId === null ? fallback : null))?.label ?? null,
      variantCount: p.variants.length,
      imageCount: usable.length,
      errors: productErrors,
      warnings,
    };
  });

  return { products, fileErrors: errors, newBrands: [...newBrands], newColors: [...newColors], newSizes: [...newSizes] };
}

export type ImportResult = PlannedProduct & { done: boolean };

// `download` is swappable so tests don't depend on the network.
export async function run(
  parsed: ParsedProduct[],
  fileErrors: string[],
  options: ImportOptions,
  download: typeof downloadImage = downloadImage
): Promise<ImportResult[]> {
  const planned = await plan(parsed, fileErrors, options);
  if (planned.fileErrors.length > 0) return planned.products.map((p) => ({ ...p, action: "skip", done: false }));

  const results: ImportResult[] = [];
  for (const [i, p] of parsed.entries()) {
    const step = planned.products[i];
    if (step.action === "skip") {
      results.push({ ...step, done: false });
      continue;
    }
    // Images first, outside the transaction (network); a failed one is a
    // warning, unless the new product ends up with none.
    const images: { url: string; altText: string | null }[] = [];
    for (const img of p.images.slice(0, MAX_IMAGES_PER_PRODUCT)) {
      const source = imageSource(img.url);
      if (!source) continue;
      try {
        if ("local" in source) {
          if (await localImageExists(source.local)) images.push({ url: source.local, altText: img.alt });
          else step.warnings.push(`Görsel bu mağazada bulunamadı: ${source.local}`);
          continue;
        }
        const { bytes, ext } = await download(source.remote);
        images.push({ url: await saveProductImage(bytes, ext), altText: img.alt });
      } catch (err) {
        step.warnings.push(err instanceof RemoteImageError ? err.message : `Görsel indirilemedi: ${img.url}`);
      }
    }
    if (step.action === "create" && images.length === 0) {
      results.push({ ...step, action: "skip", errors: [...step.errors, "Görsellerin hiçbiri indirilemedi."], done: false });
      continue;
    }
    try {
      const { id: productId, replaced } = await prisma.$transaction((tx) => writeProduct(tx, p, step, images, options));
      // Only once the new images are committed: old files nothing uses
      // any more can go.
      for (const url of replaced) {
        const inUse =
          (await prisma.productImage.count({ where: { url } })) + (await prisma.product.count({ where: { thumbnail: url } }));
        if (inUse === 0) await removeProductImage(url);
      }
      results.push({ ...step, productId, done: true });
    } catch (err) {
      console.error("shopify import failed", p.handle, err);
      const message = (err as { code?: string }).code === "P2002" ? "Bir SKU başka bir üründe kullanılıyor." : "Kaydedilemedi.";
      results.push({ ...step, action: "skip", errors: [...step.errors, message], done: false });
    }
  }
  return results;
}

async function idByName(
  find: () => Promise<{ id: string } | null>,
  create: () => Promise<{ id: string }>
) {
  return (await find())?.id ?? (await create()).id;
}

async function writeProduct(
  tx: Prisma.TransactionClient,
  p: ParsedProduct,
  step: PlannedProduct,
  images: { url: string; altText: string | null }[],
  options: ImportOptions
) {
  const insensitive = (value: string) => ({ equals: value.trim(), mode: "insensitive" as const });
  const brandId = p.vendor
    ? await idByName(
        () => tx.brand.findFirst({ where: { name: insensitive(p.vendor!) } }),
        () => tx.brand.create({ data: { name: p.vendor!.trim(), slug: slugify(p.vendor!) || `marka-${Date.now()}` } })
      )
    : null;
  const category = p.type
    ? await tx.category.findFirst({ where: { OR: [{ label: insensitive(p.type) }, { slug: slugify(p.type) }] } })
    : null;

  // Colour and size ids for each variant, creating what's missing. New
  // colours get a neutral grey to be corrected in the admin.
  const sizeGroup = async () =>
    (await tx.sizeGroup.findUnique({ where: { name: IMPORTED_SIZE_GROUP } })) ??
    (await tx.sizeGroup.create({ data: { name: IMPORTED_SIZE_GROUP } }));
  const variants = [];
  if (p.hasOptions) {
    for (const v of p.variants) {
      const color = v.color ?? DEFAULT_OPTION;
      const size = v.size ?? DEFAULT_OPTION;
      const colorId = await idByName(
        () => tx.color.findFirst({ where: { name: insensitive(color) } }),
        () => tx.color.create({ data: { name: color.trim(), hex: "#9e9e9e" } })
      );
      const sizeId = await idByName(
        () => tx.size.findFirst({ where: { label: insensitive(size) }, orderBy: { position: "asc" } }),
        async () => tx.size.create({ data: { label: size.trim(), sizeGroupId: (await sizeGroup()).id } })
      );
      variants.push({ ...v, colorId, sizeId, colorName: color, sizeLabel: size });
    }
  }
  const pricing = planPricing(p.variants);
  const fields = {
    title: p.title,
    description: p.description,
    price: pricing.price,
    discountPercentage: pricing.discountPercentage,
    cost: pricing.cost,
    tags: p.tags,
    status: p.status,
    metaTitle: p.seoTitle,
    metaDescription: p.seoDescription,
    brandId,
  };

  if (step.action === "create") {
    const id = await nextProductId(tx);
    const created = await tx.product.create({
      data: {
        id,
        ...fields,
        categoryId: category?.id ?? options.fallbackCategoryId,
        taxRate: options.taxRate,
        thumbnail: images[0].url,
        stock: p.hasOptions ? 0 : p.variants[0].stock,
        images: { create: images.map((img, position) => ({ ...img, position })) },
        variants: {
          create: variants.map((v, position) => ({
            colorId: v.colorId,
            sizeId: v.sizeId,
            sku: v.sku || generateSku(id, v.colorName, v.sizeLabel),
            stock: v.stock,
            priceOverride: pricing.overrides[position],
            position,
          })),
        },
      },
      include: { variants: true },
    });
    const received = created.variants.length
      ? created.variants.map((v) => ({ variantId: v.id, stock: v.stock }))
      : [{ variantId: null, stock: created.stock }];
    for (const r of received) {
      if (r.stock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: id,
            variantId: r.variantId,
            type: "RECEIVING",
            quantity: r.stock,
            previousStock: 0,
            newStock: r.stock,
            note: "Shopify CSV içe aktarma",
          },
        });
      }
    }
    return { id, replaced: [] as string[] };
  }

  const id = step.productId!;
  const existing = await tx.product.findUniqueOrThrow({ where: { id }, include: { variants: true } });
  await tx.product.update({
    where: { id },
    data: {
      ...fields,
      ...(category ? { categoryId: category.id } : {}),
      ...(images.length ? { thumbnail: images[0].url } : {}),
    },
  });
  let replaced: string[] = [];
  if (images.length) {
    const old = await tx.productImage.findMany({ where: { productId: id }, select: { url: true } });
    replaced = [...old.map((i) => i.url), existing.thumbnail].filter((u) => !images.some((img) => img.url === u));
    await tx.productImage.deleteMany({ where: { productId: id } });
    await tx.productImage.createMany({ data: images.map((img, position) => ({ ...img, productId: id, position })) });
  }

  const adjust = async (variantId: string | null, previous: number, next: number) => {
    if (!options.updateStock || previous === next) return;
    await tx.stockMovement.create({
      data: {
        productId: id,
        variantId,
        type: "MANUAL_ADJUSTMENT",
        quantity: Math.abs(next - previous),
        previousStock: previous,
        newStock: next,
        note: "Shopify CSV içe aktarma",
      },
    });
  };

  if (!p.hasOptions) {
    if (existing.variants.length === 0) {
      await adjust(null, existing.stock, p.variants[0].stock);
      if (options.updateStock) await tx.product.update({ where: { id }, data: { stock: p.variants[0].stock } });
    }
    return { id, replaced };
  }

  let position = existing.variants.length;
  for (const [i, v] of variants.entries()) {
    const current = existing.variants.find(
      (e) => (v.sku && e.sku === v.sku) || (e.colorId === v.colorId && e.sizeId === v.sizeId)
    );
    if (current) {
      await tx.productVariant.update({
        where: { id: current.id },
        data: {
          priceOverride: pricing.overrides[i],
          ...(options.updateStock ? { stock: v.stock } : {}),
        },
      });
      await adjust(current.id, current.stock, v.stock);
    } else {
      const created = await tx.productVariant.create({
        data: {
          productId: id,
          colorId: v.colorId,
          sizeId: v.sizeId,
          sku: v.sku || generateSku(id, v.colorName, v.sizeLabel),
          stock: v.stock,
          priceOverride: pricing.overrides[i],
          position: position++,
        },
      });
      if (v.stock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: id,
            variantId: created.id,
            type: "RECEIVING",
            quantity: v.stock,
            previousStock: 0,
            newStock: v.stock,
            note: "Shopify CSV içe aktarma",
          },
        });
      }
    }
  }
  return { id, replaced };
}
