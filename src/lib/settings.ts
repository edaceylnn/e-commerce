import { prisma } from "@/lib/db";

// Auto-creates the single "global" row with schema defaults on first read —
// no manual seed step needed, and every caller always gets a row back.
// Not prisma's upsert: that's a read then an insert, so two first requests
// at once (a fresh database, the demo right after its nightly reset) both
// insert and one fails on the primary key. An insert that skips an existing
// row can't collide.
export async function getSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: "global" } });
  if (existing) return existing;
  await prisma.settings.createMany({ data: [{ id: "global" }], skipDuplicates: true });
  return prisma.settings.findUniqueOrThrow({ where: { id: "global" } });
}
