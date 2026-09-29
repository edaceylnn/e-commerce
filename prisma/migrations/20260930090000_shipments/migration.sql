-- Shipments: the tracking number moves from "Order" to its own "Shipment"
-- table (with carrier, status and tracking events). Existing tracking
-- numbers are carried over before the old column is dropped.

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'DELIVERED');

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'CREATED',
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_carrier_trackingNumber_key" ON "Shipment"("carrier", "trackingNumber");

-- CreateIndex
CREATE INDEX "ShipmentEvent_shipmentId_idx" ON "ShipmentEvent"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentEvent_shipmentId_externalId_key" ON "ShipmentEvent"("shipmentId", "externalId");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry existing tracking numbers over. The carrier was never recorded, so
-- they land under "diger"; a delivered order's shipment is DELIVERED.
INSERT INTO "Shipment" ("id", "orderId", "carrier", "trackingNumber", "status", "deliveredAt", "createdAt", "updatedAt")
SELECT
    'mig_' || md5(o."id"),
    o."id",
    'diger',
    o."trackingNumber",
    CASE WHEN o."status" = 'TESLIM_EDILDI' THEN 'DELIVERED'::"ShipmentStatus" ELSE 'PICKED_UP'::"ShipmentStatus" END,
    CASE WHEN o."status" = 'TESLIM_EDILDI' THEN o."updatedAt" ELSE NULL END,
    o."updatedAt",
    o."updatedAt"
FROM "Order" o
WHERE o."trackingNumber" IS NOT NULL AND o."trackingNumber" <> ''
ON CONFLICT DO NOTHING;

INSERT INTO "ShipmentEvent" ("id", "shipmentId", "externalId", "status", "description", "occurredAt")
SELECT 'mig_' || md5(s."id"), s."id", 'migrated', s."status", 'Önceki sistemden taşındı', s."createdAt"
FROM "Shipment" s
WHERE s."id" LIKE 'mig_%';

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "trackingNumber";
