import { prisma } from "@/lib/db";

// Auto-creates the single "global" row with schema defaults on first read —
// no manual seed step needed, and every caller always gets a row back.
export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global" },
  });
}
