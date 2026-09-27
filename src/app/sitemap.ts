import type { MetadataRoute } from "next";
import { PRODUCT_CATEGORIES, getAllActiveProductIds } from "@/lib/products";
import { HELP_TOPIC_SLUGS } from "@/app/(site)/yardim/[slug]/page";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Only public, indexable pages — admin/account/checkout are excluded here
// and disallowed outright in robots.ts.
const STATIC_ROUTES = [
  "",
  "/products",
  "/hakkimizda",
  "/iletisim",
  "/gizlilik",
  "/kullanim-kosullari",
  "/mesafeli-satis-sozlesmesi",
  "/yardim",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const productIds = await getAllActiveProductIds();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "" ? "daily" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));

  const categoryEntries: MetadataRoute.Sitemap = PRODUCT_CATEGORIES.map((c) => ({
    url: `${SITE_URL}/products?category=${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const helpEntries: MetadataRoute.Sitemap = HELP_TOPIC_SLUGS.map((slug) => ({
    url: `${SITE_URL}/yardim/${slug}`,
    changeFrequency: "monthly",
    priority: 0.3,
  }));

  const productEntries: MetadataRoute.Sitemap = productIds.map((id) => ({
    url: `${SITE_URL}/products/${id}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...categoryEntries, ...helpEntries, ...productEntries];
}
