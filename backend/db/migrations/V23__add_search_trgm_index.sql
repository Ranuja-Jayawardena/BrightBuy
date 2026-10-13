CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_products_name_trgm
ON products USING gin (product_name gin_trgm_ops)
WHERE is_active = true;

CREATE INDEX idx_products_brand_trgm
ON products USING gin (brand gin_trgm_ops)
WHERE is_active = true;

CREATE INDEX idx_products_description_trgm
ON products USING gin (description gin_trgm_ops)
WHERE is_active = true;
