-- 06_carts.sql

-- Carts
INSERT INTO carts (customer_id) VALUES
((SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'alice@example.com')),
((SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'bob@example.com'));

-- Cart Items
-- Note: Member C (Phase 1.6) owns product_variants and their SKUs.
-- Once those are seeded, uncomment and update the following lines to seed cart items.
/*
INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES
(
    (SELECT cart_id FROM carts c JOIN customers cu ON c.customer_id = cu.customer_id JOIN users u ON cu.user_id = u.user_id WHERE u.email = 'alice@example.com'),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'SKU-1001-S'),
    2
),
(
    (SELECT cart_id FROM carts c JOIN customers cu ON c.customer_id = cu.customer_id JOIN users u ON cu.user_id = u.user_id WHERE u.email = 'bob@example.com'),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'SKU-2002-M'),
    1
);
*/
