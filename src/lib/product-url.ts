import { slugify } from "@/lib/slugify";

// Product URLs are /products/<id>-<slug>: the id finds the product, the slug
// (from the title, never stored) is only for people and search engines. So a
// rename needs no migration, and the page redirects any stale or bare-id URL
// (old links, /products/1) to the current one.
export function productPath(product: { id: number; title: string }): string {
  const slug = slugify(product.title);
  return `/products/${slug ? `${product.id}-${slug}` : product.id}`;
}

// The id at the front of a /products/[id] segment, or null when there isn't one.
export function parseProductParam(param: string): number | null {
  const match = /^(\d+)(?:-|$)/.exec(param);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) ? id : null;
}
