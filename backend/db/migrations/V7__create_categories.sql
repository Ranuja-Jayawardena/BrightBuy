CREATE TABLE categories (
  category_id serial PRIMARY KEY,
  category_name varchar(100) NOT NULL,
  parent_category_id int REFERENCES categories(category_id),
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_categories_parent_id ON categories(parent_category_id);
