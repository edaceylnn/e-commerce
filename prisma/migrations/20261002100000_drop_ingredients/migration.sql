-- The cosmetics-era ingredient catalog ("which products contain
-- Niacinamide"): never used by this clothing store, and empty. Fabric
-- composition lives on Product.fullIngredients as text.

-- DropForeignKey
ALTER TABLE "ProductIngredient" DROP CONSTRAINT "ProductIngredient_ingredientId_fkey";

-- DropForeignKey
ALTER TABLE "ProductIngredient" DROP CONSTRAINT "ProductIngredient_productId_fkey";

-- DropTable
DROP TABLE "Ingredient";

-- DropTable
DROP TABLE "ProductIngredient";

