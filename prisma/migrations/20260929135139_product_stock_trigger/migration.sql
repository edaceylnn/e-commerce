-- Single source of truth for stock.
--
-- For a product with variants, "Product"."stock" must equal the sum of its
-- variants' stock: the storefront's "Tükendi", the admin list, filters and
-- critical-stock views all read it. Keeping that true used to be each
-- writer's job (checkout, refunds, cancellations, manual movements, admin
-- save…) and one forgotten call left the total stale. The database now owns
-- the rule, so no code path can forget it.
--
-- Products without variants are unaffected: their own stock is the truth.

-- 1) Whenever a product's stock is written, a product that has variants
--    gets the variants' sum instead of whatever value was sent.
CREATE FUNCTION product_stock_from_variants() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ProductVariant" WHERE "productId" = NEW."id") THEN
    NEW."stock" := (SELECT COALESCE(SUM("stock"), 0) FROM "ProductVariant" WHERE "productId" = NEW."id");
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_stock_from_variants
BEFORE UPDATE OF "stock" ON "Product"
FOR EACH ROW EXECUTE FUNCTION product_stock_from_variants();

-- 2) Whenever a variant is added, removed, restocked or sold, touch its
--    product's stock so rule 1 recomputes the sum.
CREATE FUNCTION touch_product_stock() RETURNS trigger AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE "Product" SET "stock" = "stock" WHERE "id" = OLD."productId";
  END IF;
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW."productId" IS DISTINCT FROM OLD."productId") THEN
    UPDATE "Product" SET "stock" = "stock" WHERE "id" = NEW."productId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER touch_product_stock
AFTER INSERT OR DELETE OR UPDATE OF "stock", "productId" ON "ProductVariant"
FOR EACH ROW EXECUTE FUNCTION touch_product_stock();

-- Bring existing rows in line with the rule.
UPDATE "Product" SET "stock" = "stock";
