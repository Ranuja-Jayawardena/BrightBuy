CREATE INDEX idx_product_variants_active_price
ON product_variants (product_id, price)
WHERE is_active = true;

CREATE INDEX idx_product_variants_price_active
ON product_variants (price)
WHERE is_active = true;
