-- Seed categories
-- 1. Electronics
INSERT INTO categories (category_name, parent_category_id, is_active) VALUES ('Electronics', NULL, true);

-- 2. Smartphones
INSERT INTO categories (category_name, parent_category_id, is_active) 
VALUES ('Smartphones', (SELECT category_id FROM categories WHERE category_name = 'Electronics'), true);

-- 3. Laptops
INSERT INTO categories (category_name, parent_category_id, is_active) 
VALUES ('Laptops', (SELECT category_id FROM categories WHERE category_name = 'Electronics'), true);

-- 4. Audio
INSERT INTO categories (category_name, parent_category_id, is_active) 
VALUES ('Audio', (SELECT category_id FROM categories WHERE category_name = 'Electronics'), true);

-- 5. Home Appliances
INSERT INTO categories (category_name, parent_category_id, is_active) VALUES ('Home Appliances', NULL, true);

-- 6. Kitchen
INSERT INTO categories (category_name, parent_category_id, is_active) 
VALUES ('Kitchen', (SELECT category_id FROM categories WHERE category_name = 'Home Appliances'), true);

-- 7. Cleaning
INSERT INTO categories (category_name, parent_category_id, is_active) 
VALUES ('Cleaning', (SELECT category_id FROM categories WHERE category_name = 'Home Appliances'), true);

-- 8. Apparel
INSERT INTO categories (category_name, parent_category_id, is_active) VALUES ('Apparel', NULL, true);

-- 9. Men's Clothing
INSERT INTO categories (category_name, parent_category_id, is_active) 
VALUES ('Men''s Clothing', (SELECT category_id FROM categories WHERE category_name = 'Apparel'), true);

-- 10. Women's Clothing
INSERT INTO categories (category_name, parent_category_id, is_active) 
VALUES ('Women''s Clothing', (SELECT category_id FROM categories WHERE category_name = 'Apparel'), true);

-- Seed variant attributes
INSERT INTO variant_attributes (attribute_name) VALUES ('Color');
INSERT INTO variant_attributes (attribute_name) VALUES ('Storage');
INSERT INTO variant_attributes (attribute_name) VALUES ('RAM');
INSERT INTO variant_attributes (attribute_name) VALUES ('Size');
INSERT INTO variant_attributes (attribute_name) VALUES ('Material');
