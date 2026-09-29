-- CreateIndex
CREATE INDEX "Product_status_categoryId_idx" ON "Product"("status", "categoryId");

-- Search: accent- and case-insensitive substring matching ("sort" finds
-- "Şort", "takimi" finds "Takımı") on title + description, served by a
-- trigram index so '%word%' doesn't scan every product.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent() isn't IMMUTABLE (its dictionary could change), so it can't be
-- used in an index directly; pinning the dictionary makes a wrapper safe.
CREATE OR REPLACE FUNCTION search_normalize(value text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT lower(public.unaccent('public.unaccent'::regdictionary, value)) $$;

CREATE OR REPLACE FUNCTION search_text(title text, description text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT search_normalize(coalesce(title, '') || ' ' || coalesce(description, '')) $$;

CREATE INDEX "Product_search_text_trgm_idx" ON "Product"
  USING gin (search_text("title", "description") gin_trgm_ops);
