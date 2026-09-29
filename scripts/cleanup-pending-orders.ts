// 1) Releases stock reservations whose time is up (checkout also does this
//    on every new order — this catches quiet periods).
// 2) Deletes stale PENDING_PAYMENT orders that never reached a completed
//    payment — the buyer abandoned iyzico's hosted payment page and never
//    returned to /checkout/callback. Cascades to their OrderItems.
//
// Never deleted: an order still holding stock, or one with an iyzico
// payment id — money was taken for it (e.g. a refund that needs manual
// handling), so its record must stay.
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
import { releaseExpiredReservations } from "../src/lib/stock-reservation";

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

  const released = await releaseExpiredReservations(prisma);
  console.log(`Released ${released} expired stock reservation(s).`);

  const { count } = await prisma.order.deleteMany({
    where: {
      status: "PENDING_PAYMENT",
      paidAt: null,
      iyzicoPaymentId: null,
      createdAt: { lt: cutoff },
      OR: [{ reservedUntil: null }, { stockReleasedAt: { not: null } }],
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
