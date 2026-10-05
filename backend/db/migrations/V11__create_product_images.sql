CREATE TABLE product_images (
  image_id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  image_data BYTEA NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_product_images_single_primary ON product_images(product_id) WHERE is_primary = true;
CREATE INDEX idx_product_images_product_sort ON product_images(product_id, sort_order);
