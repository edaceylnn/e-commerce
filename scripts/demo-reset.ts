// Resets the public demo to fresh sample data: wipes every table, runs the
// normal seed (catalog + admin), then adds the shared demo accounts and a
// two months of orders in every state — delivered, on the way, waiting to be
// shipped, cancelled — so the admin panel has something to show and
// something to try. Runs nightly on the demo server (cron):
//   DEMO_MODE=1 npm run demo:reset
//
// Refuses to run unless DEMO_MODE=1: it deletes everything, including the
// invoices that are otherwise undeletable (TRUNCATE doesn't fire the
// row-level immutability triggers — acceptable only for demo data).
//
// Sample orders don't move stock; they're history, not sales to fulfil.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { spawnSync } from "node:child_process";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcrypt";

async function main() {
  if (process.env.DEMO_MODE !== "1") {
    console.error("demo-reset deletes ALL data. Set DEMO_MODE=1 to run it (demo server only).");
    process.exit(1);
  }
  const { prisma } = await import("@/lib/db");
  const { DEMO_ACCOUNTS } = await import("@/lib/demo");
  const { allocateDiscount, toKurus, toLira } = await import("@/lib/invoicing/tax");
  const { issueSaleInvoice } = await import("@/lib/invoicing/invoices");
  const { computeShippingCost, SHIPPING_TAX_RATE } = await import("@/lib/shipping");
  const { recordShipmentScan } = await import("@/lib/shipping/events");
  const { simulatedScan, simulatorTrackingNumber } = await import("@/lib/shipping/simulator");

  // 1. Empty every table (not the migration history) and uploaded images.
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`
  );
  const uploads = path.join(process.cwd(), "public", "uploads", "products");
  for (const file of await readdir(uploads).catch(() => [] as string[])) {
    await rm(path.join(uploads, file), { force: true });
  }
  console.log(`Tablolar boşaltıldı (${tables.length}).`);

  // 2. The normal seed: catalog, reference data, admin.
  const seed = spawnSync("npx", ["prisma", "db", "seed", "--config", "prisma7.config.ts"], { stdio: "inherit" });
  if (seed.status !== 0) throw new Error("seed failed");

  // 3. Demo data. A fixed-seed random generator, so every night's demo
  //    looks the same (relative to today).
  let state = 20260930;
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];
  const HOUR = 3_600_000;
  const DAY = 24 * HOUR;
  const now = Date.now();

  const account = async (email: string, name: string, password: string, role: "ADMIN" | "CUSTOMER") =>
    prisma.user.create({ data: { email, name, role, passwordHash: await bcrypt.hash(password, 10) } });

  await account(DEMO_ACCOUNTS.admin.email, DEMO_ACCOUNTS.admin.name, DEMO_ACCOUNTS.admin.password, "ADMIN");
  const demoCustomer = await account(
    DEMO_ACCOUNTS.customer.email,
    DEMO_ACCOUNTS.customer.name,
    DEMO_ACCOUNTS.customer.password,
    "CUSTOMER"
  );

  const PEOPLE: [string, string, string][] = [
    ["Zeynep Kaya", "İstanbul", "Kadıköy"],
    ["Elif Demir", "Ankara", "Çankaya"],
    ["Merve Şahin", "İzmir", "Karşıyaka"],
    ["Ayşe Yıldız", "Bursa", "Nilüfer"],
    ["Selin Arslan", "Antalya", "Muratpaşa"],
    ["Deniz Aydın", "Eskişehir", "Tepebaşı"],
    ["Ece Koç", "İstanbul", "Beşiktaş"],
    ["Buse Çelik", "Kocaeli", "İzmit"],
  ];
  type Customer = { user: { id: string; name: string }; city: string; district: string };
  const customers: Customer[] = [];
  for (const [i, [name, city, district]] of PEOPLE.entries()) {
    // Unusable password: these customers only exist as order history.
    const user = await prisma.user.create({
      data: { email: `musteri${i + 1}@example.com`, name, passwordHash: "!", role: "CUSTOMER" },
    });
    customers.push({ user, city, district });
  }
  const demoCity = { user: demoCustomer, city: "İstanbul", district: "Kadıköy" };

  const coupon = await prisma.coupon.create({ data: { code: "HOSGELDIN10", type: "PERCENTAGE", value: 10 } });
  await prisma.coupon.create({ data: { code: "YAZ100", type: "FIXED", value: 100, usageLimit: 50 } });

  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", variants: { some: { stock: { gt: 0 } } } },
    include: { variants: { where: { stock: { gt: 0 } } } },
  });
  if (products.length === 0) throw new Error("no active products with stock to build orders from");

  type Plan = "delivered" | "in-transit" | "preparing" | "pending" | "cancelled";

  async function order(customer: Customer, createdAt: Date, plan: Plan, withCoupon: boolean) {
    const address = await prisma.address.create({
      data: {
        userId: customer.user.id,
        fullName: customer.user.name,
        phone: "05550000000",
        line1: `${pick(["Atatürk", "Cumhuriyet", "İnönü", "Gazi"])} Cad. No:${1 + Math.floor(random() * 90)}`,
        city: customer.city,
        district: customer.district,
        postalCode: "34000",
        isDefaultShipping: true,
        isDefaultBilling: true,
      },
    });

    const lines = Array.from({ length: 1 + Math.floor(random() * 3) }, () => {
      const product = pick(products);
      const variant = pick(product.variants);
      const base = Number(variant.priceOverride ?? product.price);
      return {
        productId: product.id,
        variantId: variant.id,
        sku: variant.sku,
        title: product.title,
        thumbnail: product.thumbnail,
        unitPrice: toLira(toKurus(base * (1 - Number(product.discountPercentage) / 100))),
        quantity: random() < 0.8 ? 1 : 2,
        taxRate: Number(product.taxRate),
      };
    });
    const subtotalK = lines.reduce((s, l) => s + toKurus(l.unitPrice) * l.quantity, 0);
    const discountK = withCoupon ? Math.round(subtotalK / 10) : 0;
    const shares = allocateDiscount(
      lines.map((l) => ({ gross: toKurus(l.unitPrice) * l.quantity, campaignEligible: true })),
      discountK,
      withCoupon ? "coupon" : null
    );
    const shippingK = toKurus(computeShippingCost(toLira(subtotalK)));

    const paid = plan !== "pending" && plan !== "cancelled";
    const created = await prisma.order.create({
      data: {
        orderNumber: `BS-${createdAt.toISOString().slice(0, 10).replaceAll("-", "")}-${Math.floor(random() * 0xffffff)
          .toString(16)
          .toUpperCase()
          .padStart(6, "0")}`,
        userId: customer.user.id,
        shippingAddressId: address.id,
        billingAddressId: address.id,
        status: plan === "pending" ? "PENDING_PAYMENT" : plan === "cancelled" ? "IPTAL" : "HAZIRLANIYOR",
        subtotal: toLira(subtotalK),
        discountTotal: toLira(discountK),
        shippingCost: toLira(shippingK),
        shippingTaxRate: SHIPPING_TAX_RATE,
        total: toLira(subtotalK + shippingK - discountK),
        couponId: withCoupon ? coupon.id : null,
        paidAt: paid ? new Date(createdAt.getTime() + 5 * 60_000) : null,
        createdAt,
        items: { create: lines.map((l, i) => ({ ...l, discountAmount: toLira(shares[i]) })) },
        events: {
          create: [
            { type: "STATUS_CHANGE", message: "Sipariş oluşturuldu, stok ayrıldı, ödeme bekleniyor.", createdAt },
            ...(paid
              ? [{ type: "STATUS_CHANGE" as const, message: "Ödeme onaylandı, sipariş hazırlanıyor.", createdAt: new Date(createdAt.getTime() + 5 * 60_000) }]
              : []),
            ...(plan === "cancelled"
              ? [{ type: "STATUS_CHANGE" as const, message: "Sipariş iptal edildi.", createdAt: new Date(createdAt.getTime() + HOUR) }]
              : []),
          ],
        },
      },
    });

    if (plan !== "delivered" && plan !== "in-transit") return;
    // Shipped the next day with the simulator carrier; the scans move the
    // order along exactly as the carrier's webhooks would.
    const shippedAt = new Date(createdAt.getTime() + DAY);
    const scans =
      plan === "delivered"
        ? (["CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"] as const)
        : (["CREATED", "PICKED_UP", "IN_TRANSIT"] as const);
    await prisma.$transaction(async (tx) => {
      const trackingNumber = simulatorTrackingNumber();
      const shipment = await tx.shipment.create({
        data: { orderId: created.id, carrier: "simulator", trackingNumber, createdAt: shippedAt },
      });
      for (const [i, status] of scans.entries()) {
        const at = new Date(shippedAt.getTime() + i * 10 * HOUR);
        const scan = simulatedScan(trackingNumber, status, customer.city, at);
        await recordShipmentScan(tx, shipment.id, {
          externalId: scan.eventId,
          status,
          description: scan.description,
          location: scan.location,
          occurredAt: at,
        });
        // recordShipmentScan stamps its status change "now"; date it to the scan.
        await tx.orderEvent.updateMany({
          where: { orderId: created.id, type: "STATUS_CHANGE", createdAt: { gte: new Date(now - 60_000) } },
          data: { createdAt: at },
        });
        if (status === "PICKED_UP") await issueSaleInvoice(tx, created.id, undefined, at);
      }
    });
  }

  // Everything older than a few days has arrived; the newest wait to be
  // shipped. The demo customer gets one order in each state worth a look.
  const plans: [Customer, number, Plan, boolean][] = [];
  for (let day = 60; day >= 1; day -= 1 + Math.floor(random() * 2)) {
    plans.push([pick(customers), day, day > 4 ? "delivered" : day > 2 ? "in-transit" : "preparing", random() < 0.3]);
  }
  plans.push([pick(customers), 12, "cancelled", false], [pick(customers), 0, "pending", false]);
  plans.push([demoCity, 9, "delivered", true], [demoCity, 2, "in-transit", false], [demoCity, 0, "preparing", false]);

  // Created oldest first: invoice numbers must follow the calendar.
  const dated = plans
    .map(([customer, day, plan, withCoupon]) => ({
      customer,
      plan,
      withCoupon,
      createdAt: new Date(now - day * DAY - (1 + random() * 10) * HOUR),
    }))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const o of dated) await order(o.customer, o.createdAt, o.plan, o.withCoupon);

  const count = await prisma.order.count();
  console.log(`Demo verisi hazır: ${count} sipariş, ${customers.length + 1} müşteri, 2 kupon.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
