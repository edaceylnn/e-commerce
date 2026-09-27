// Pure, DB-free category metadata — safe to import from Client Components
// (e.g. Navbar's category links) without pulling in the Prisma/pg import
// chain that "@/lib/products" carries.
export const PRODUCT_CATEGORIES = [
  { slug: "loungewear", label: "Loungewear" },
  { slug: "spor", label: "Spor" },
  { slug: "pijama", label: "Pijama" },
] as const;

export type CategorySlug = (typeof PRODUCT_CATEGORIES)[number]["slug"];

// Tuple form for z.enum() in the admin product API routes.
export const CATEGORY_SLUGS = PRODUCT_CATEGORIES.map((c) => c.slug) as [
  CategorySlug,
  ...CategorySlug[],
];
