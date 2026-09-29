// Real-database tests for shipment scans: dedupe via the unique index,
// the row lock under concurrent webhooks, and order status sync.
// Run with `npm run test:db` (node:test via tsx — see
// src/lib/stock-reservation.integration.ts for why not Jest).
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { PrismaClient } from "@/generated/prisma/client";
import { recordShipmentScan, type ShipmentScan } from "./events";

const TAG = "shipping-db-test";

describe("shipment scans (real database)", () => {
  let prisma: PrismaClient;
  let userId: string;
  let orderId: string;
  let shipmentId: string;
  let seq = 0;

  const scan = (externalId: string, status: ShipmentScan["status"], minute: number): ShipmentScan => ({
    externalId,
    status,
    description: status,
    occurredAt: new Date(Date.UTC(2026, 8, 30, 10, minute)),
  });
  const record = (s: ShipmentScan) => prisma.$transaction((tx) => recordShipmentScan(tx, shipmentId, s));
  const state = async () => {
    const [shipment, order] = await Promise.all([
      prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId }, include: { events: true } }),
      prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { events: true } }),
    ]);
    return { shipment: shipment.status, events: shipment.events.length, order: order.status, orderEvents: order.events.length };
  };

  before(async () => {
    prisma = (await import("@/lib/db")).prisma;
    const user = await prisma.user.create({
      data: { email: `${TAG}-${Date.now()}@example.com`, passwordHash: "x", name: "Test" },
    });
    userId = user.id;
  });

  beforeEach(async () => {
    const address = await prisma.address.create({
      data: { userId, fullName: "Test", phone: "5550000000", line1: "Test", city: "İzmir", district: "Konak", postalCode: "35000" },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `${TAG}-${Date.now()}-${seq++}`,
        userId,
        shippingAddressId: address.id,
        billingAddressId: address.id,
        subtotal: 100,
        total: 100,
        status: "HAZIRLANIYOR",
        paidAt: new Date(),
      },
    });
    orderId = order.id;
    shipmentId = (
      await prisma.shipment.create({ data: { orderId, carrier: "simulator", trackingNumber: `${TAG}-${seq}-${Date.now()}` } })
    ).id;
  });

  after(async () => {
    if (!prisma) return;
    if (userId) {
      await prisma.order.deleteMany({ where: { userId } });
      await prisma.address.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it("ships, then delivers the order as scans arrive", async () => {
    await record(scan("a", "CREATED", 0));
    assert.equal((await state()).order, "HAZIRLANIYOR");
    await record(scan("b", "PICKED_UP", 5));
    assert.deepEqual(await state(), { shipment: "PICKED_UP", events: 2, order: "KARGOLANDI", orderEvents: 1 });
    await record(scan("c", "DELIVERED", 30));
    const s = await state();
    assert.equal(s.shipment, "DELIVERED");
    assert.equal(s.order, "TESLIM_EDILDI");
    const shipment = await prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId } });
    assert.ok(shipment.deliveredAt);
  });

  it("ignores a redelivered webhook", async () => {
    assert.equal((await record(scan("same", "PICKED_UP", 5))).recorded, true);
    assert.deepEqual(await record(scan("same", "PICKED_UP", 5)), { recorded: false });
    const s = await state();
    assert.equal(s.events, 1);
    assert.equal(s.orderEvents, 1); // the order timeline isn't duplicated either
  });

  it("keeps the newest status when an older scan arrives late", async () => {
    await record(scan("out", "OUT_FOR_DELIVERY", 20));
    await record(scan("transit", "IN_TRANSIT", 10));
    assert.equal((await state()).shipment, "OUT_FOR_DELIVERY");
  });

  it("applies concurrent webhooks for one parcel without losing any", async () => {
    await Promise.all([
      record(scan("p", "PICKED_UP", 1)),
      record(scan("t", "IN_TRANSIT", 2)),
      record(scan("o", "OUT_FOR_DELIVERY", 3)),
      record(scan("d", "DELIVERED", 4)),
      record(scan("d", "DELIVERED", 4)),
    ]);
    const s = await state();
    assert.equal(s.events, 4);
    assert.equal(s.shipment, "DELIVERED");
    assert.equal(s.order, "TESLIM_EDILDI");
  });

  it("leaves a cancelled order alone", async () => {
    await prisma.order.update({ where: { id: orderId }, data: { status: "IPTAL" } });
    await record(scan("d", "DELIVERED", 4));
    assert.equal((await state()).order, "IPTAL");
  });
});
