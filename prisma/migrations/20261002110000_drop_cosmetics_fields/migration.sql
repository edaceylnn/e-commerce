-- The product table started as a cosmetics catalog. Drop the attributes no
-- clothing product uses (skin type, SPF, vegan, finish…) — none had an
-- input in the admin — and give the two that are shown on the product page
-- their clothing names. Renamed, not dropped and re-added, so any fabric
-- and care text already entered is kept.
ALTER TABLE "Product" RENAME COLUMN "fullIngredients" TO "composition";
ALTER TABLE "Product" RENAME COLUMN "usageInstructions" TO "careInstructions";

ALTER TABLE "Product" DROP COLUMN "coverage",
DROP COLUMN "expiryInfo",
DROP COLUMN "finish",
DROP COLUMN "isCrueltyFree",
DROP COLUMN "isParabenFree",
DROP COLUMN "isVegan",
DROP COLUMN "origin",
DROP COLUMN "skinConcerns",
DROP COLUMN "skinTypes",
DROP COLUMN "spf",
DROP COLUMN "texture",
DROP COLUMN "usagePurpose",
DROP COLUMN "volumeLabel",
DROP COLUMN "warnings";
