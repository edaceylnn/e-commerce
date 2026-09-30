import type { Prisma } from "@/generated/prisma/client";

// Product ids are assigned, not generated — the seeded catalog's ids were
// kept for URL stability (see prisma/seed.ts) — so a new product gets the
// next free one. Two products created at once would both pick the same
// max + 1; the advisory lock makes them take turns until the transaction
// ends.
export async function nextProductId(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('product-id'))`;
  const max = await tx.product.aggregate({ _max: { id: true } });
  return (max._max.id ?? 0) + 1;
}
