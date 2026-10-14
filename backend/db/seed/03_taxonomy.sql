-- Seed categories (Consumer Technology Specialization)

-- Level 1: Root Parent Categories
INSERT INTO categories (category_name, parent_category_id, is_active) VALUES 
('Electronics', NULL, true),
('Computers & Gaming', NULL, true),
('Audio & Sound', NULL, true),
('Smart Home & Wearables', NULL, true),
('Accessories & Storage', NULL, true);

-- Level 2: Subcategories
-- Under 'Electronics'
INSERT INTO categories (category_name, parent_category_id, is_active) VALUES 
('Smartphones', (SELECT category_id FROM categories WHERE category_name = 'Electronics'), true),
('Tablets & E-Readers', (SELECT category_id FROM categories WHERE category_name = 'Electronics'), true),
('Cameras & Gear', (SELECT category_id FROM categories WHERE category_name = 'Electronics'), true);

-- Under 'Computers & Gaming'
INSERT INTO categories (category_name, parent_category_id, is_active) VALUES 
('Laptops', (SELECT category_id FROM categories WHERE category_name = 'Computers & Gaming'), true),
('Desktop Components', (SELECT category_id FROM categories WHERE category_name = 'Computers & Gaming'), true),
('Displays & Monitors', (SELECT category_id FROM categories WHERE category_name = 'Computers & Gaming'), true),
('Gaming Peripherals', (SELECT category_id FROM categories WHERE category_name = 'Computers & Gaming'), true);

-- Under 'Audio & Sound'
INSERT INTO categories (category_name, parent_category_id, is_active) VALUES 
('Headphones & Earbuds', (SELECT category_id FROM categories WHERE category_name = 'Audio & Sound'), true),
('Speakers & Soundbars', (SELECT category_id FROM categories WHERE category_name = 'Audio & Sound'), true);

-- Under 'Smart Home & Wearables'
INSERT INTO categories (category_name, parent_category_id, is_active) VALUES 
('Smartwatches & Fitness', (SELECT category_id FROM categories WHERE category_name = 'Smart Home & Wearables'), true),
('Smart Lighting & Security', (SELECT category_id FROM categories WHERE category_name = 'Smart Home & Wearables'), true);

-- Under 'Accessories & Storage'
INSERT INTO categories (category_name, parent_category_id, is_active) VALUES 
('Chargers & Cables', (SELECT category_id FROM categories WHERE category_name = 'Accessories & Storage'), true),
('External Storage & SSDs', (SELECT category_id FROM categories WHERE category_name = 'Accessories & Storage'), true);

-- Seed variant attributes for consumer tech
INSERT INTO variant_attributes (attribute_name) VALUES 
('Color'),
('Storage Capacity'),
('RAM Size'),
('Connectivity'),
('Screen Size')
ON CONFLICT (attribute_name) DO NOTHING;
