-- ETTN: each invoice's universal id on the e-Arşiv system. Existing
-- invoices get one too (adding a column doesn't fire the update trigger).
ALTER TABLE "Invoice" ADD COLUMN "ettn" UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX "Invoice_ettn_key" ON "Invoice"("ettn");

-- The ETTN is part of the issued document: it can't change either.
CREATE OR REPLACE FUNCTION invoice_immutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Invoice % cannot be deleted', OLD."number";
  END IF;
  IF (NEW."orderId", NEW."type", NEW."number", NEW."ettn", NEW."issuedAt", NEW."buyerName", NEW."buyerIdentity",
      NEW."buyerAddress", NEW."buyerEmail", NEW."netTotal", NEW."vatTotal", NEW."grandTotal",
      NEW."provider", NEW."providerRef", NEW."originalInvoiceId")
     IS DISTINCT FROM
     (OLD."orderId", OLD."type", OLD."number", OLD."ettn", OLD."issuedAt", OLD."buyerName", OLD."buyerIdentity",
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
