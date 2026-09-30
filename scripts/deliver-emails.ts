// Sends whatever is still owed in the email outbox: emails whose delivery
// right after the request failed (provider down, server restarted
// mid-send). Each email is tried up to 5 times. Run every few minutes by
// cron on the server:
//   npm run emails:deliver
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

async function main() {
  const { deliverPending } = await import("@/lib/email/outbox");
  const { prisma } = await import("@/lib/db");
  const count = await deliverPending();
  if (count > 0) console.log(`${count} e-posta işlendi.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
