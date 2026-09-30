-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('SALE', 'RETURN');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingTaxRate" DECIMAL(5,2) NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 20;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "number" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerIdentity" TEXT NOT NULL,
    "buyerAddress" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "netTotal" DECIMAL(12,2) NOT NULL,
    "vatTotal" DECIMAL(12,2) NOT NULL,
    "grandTotal" DECIMAL(12,2) NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "originalInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "orderItemId" TEXT,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL,
    "gross" DECIMAL(12,2) NOT NULL,
    "net" DECIMAL(12,2) NOT NULL,
    "vat" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "series" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("series")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLine_orderItemId_idx" ON "InvoiceLine"("orderItemId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Backfill the checkout snapshot for existing orders ─────────────────
-- VAT rate: the product's current rate (nothing older was recorded).
UPDATE "OrderItem" oi SET "taxRate" = p."taxRate" FROM "Product" p WHERE p."id" = oi."productId";

-- Discount share: which lines a campaign covered wasn't recorded, so older
-- discounts are spread over all lines by amount (largest line takes the
-- rounding). The discount is taken from what was actually charged, so an
-- invoice adds up to the paid total.
WITH lines AS (
  SELECT oi."id", oi."orderId",
         oi."unitPrice" * oi."quantity" AS gross,
         GREATEST(o."subtotal" + o."shippingCost" - o."total", 0) AS disc,
         sum(oi."unitPrice" * oi."quantity") OVER (PARTITION BY oi."orderId") AS sub,
         row_number() OVER (PARTITION BY oi."orderId" ORDER BY oi."unitPrice" * oi."quantity" DESC, oi."id") AS rn
  FROM "OrderItem" oi JOIN "Order" o ON o."id" = oi."orderId"
  WHERE o."subtotal" + o."shippingCost" - o."total" > 0
), shares AS (
  SELECT "id", "orderId", rn, LEAST(disc, sub) AS disc, round(LEAST(disc, sub) * gross / NULLIF(sub, 0), 2) AS share
  FROM lines
)
UPDATE "OrderItem" oi
SET "discountAmount" = s.share
  + CASE WHEN s.rn = 1 THEN s.disc - (SELECT sum(x.share) FROM shares x WHERE x."orderId" = s."orderId") ELSE 0 END
FROM shares s WHERE s."id" = oi."id";

-- ── Issued invoices are immutable ───────────────────────────────────────
-- Only the status may change, and only ISSUED → CANCELLED (with its date
-- and reason). Nothing is ever deleted. Enforced here so no code path —
-- admin action, script or future feature — can rewrite a legal record.
CREATE FUNCTION invoice_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Invoice % cannot be deleted', OLD."number";
  END IF;
  IF (NEW."orderId", NEW."type", NEW."number", NEW."issuedAt", NEW."buyerName", NEW."buyerIdentity",
      NEW."buyerAddress", NEW."buyerEmail", NEW."netTotal", NEW."vatTotal", NEW."grandTotal",
      NEW."provider", NEW."providerRef", NEW."originalInvoiceId")
     IS DISTINCT FROM
     (OLD."orderId", OLD."type", OLD."number", OLD."issuedAt", OLD."buyerName", OLD."buyerIdentity",
      OLD."buyerAddress", OLD."buyerEmail", OLD."netTotal", OLD."vatTotal", OLD."grandTotal",
      OLD."provider", OLD."providerRef", OLD."originalInvoiceId") THEN
    RAISE EXCEPTION 'Invoice % is issued and cannot be changed', OLD."number";
  END IF;
  IF OLD."status" = 'CANCELLED' AND NEW."status" IS DISTINCT FROM OLD."status" THEN
    RAISE EXCEPTION 'Invoice % is cancelled and cannot be reinstated', OLD."number";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_immutable
BEFORE UPDATE OR DELETE ON "Invoice"
FOR EACH ROW EXECUTE FUNCTION invoice_immutable();

CREATE FUNCTION invoice_line_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Invoice lines cannot be changed or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_line_immutable
BEFORE UPDATE OR DELETE ON "InvoiceLine"
FOR EACH ROW EXECUTE FUNCTION invoice_line_immutable();
