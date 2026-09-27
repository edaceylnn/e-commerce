// Deletes stale PENDING_PAYMENT orders that never reached a completed
// payment — the buyer abandoned iyzico's hosted payment page and never
// returned to /checkout/callback. Cascades to their OrderItems.
//
// Orders that fail before a token is even issued are already cleaned up
// synchronously in src/app/api/checkout/create/route.ts — this script only
// has to catch the "buyer walked away" case, so it's safe to run on a
// generous schedule (e.g. a daily cron/systemd timer):
//   npm run cleanup:pending-orders
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEFAULT_CUTOFF_HOURS = 24;

async function main() {
  const configuredHours = Number(process.env.PENDING_ORDER_CLEANUP_HOURS);
  const cutoffHours =
    Number.isFinite(configuredHours) && configuredHours > 0
      ? configuredHours
      : DEFAULT_CUTOFF_HOURS;
  const cutoff = new Date(Date.now() - cutoffHours * 60 * 60 * 1000);

  const { count } = await prisma.order.deleteMany({
    where: {
      status: "PENDING_PAYMENT",
      paidAt: null,
      createdAt: { lt: cutoff },
    },
  });

  console.log(
    `Deleted ${count} stale pending order(s) created before ${cutoff.toISOString()}.`
  );
}

main()
  .catch((err) => {
    console.error("cleanup-pending-orders failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
