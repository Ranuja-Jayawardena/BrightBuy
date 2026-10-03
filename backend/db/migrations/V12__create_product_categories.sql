CREATE TABLE product_categories (
  category_id int REFERENCES categories(category_id) NOT NULL,
  product_id int REFERENCES products(product_id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (product_id, category_id)
);

CREATE INDEX idx_product_categories_category_id ON product_categories(category_id);
