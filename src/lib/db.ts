import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7's client has no bundled query engine of its own — it always
// connects through an explicit driver adapter.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Reuse the client across Next.js dev-server hot reloads so a code edit
// doesn't open a fresh Postgres connection pool every time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
