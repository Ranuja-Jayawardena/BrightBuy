-- 07_orders.sql: Seed 30+ historical orders
-- Written by Member D (Backend - Orders)

-- Order 1
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'eve@example.com'),
    '2026-05-10T14:07:03.758Z',
    'pending',
    199.98
);

-- Order 2
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'charlie@example.com'),
    '2026-06-03T14:07:03.758Z',
    'cancelled',
    598.00
);

-- Order 3
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'diana@example.com'),
    '2026-06-05T14:07:03.758Z',
    'paid',
    149.99
);

-- Order 4
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'diana@example.com'),
    '2026-05-24T14:07:03.758Z',
    'shipped',
    577.98
);

-- Order 5
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'bob@example.com'),
    '2026-07-07T14:07:03.758Z',
    'cancelled',
    388.49
);

-- Order 6
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'bob@example.com'),
    '2026-06-14T14:07:03.758Z',
    'pending',
    509.97
);

-- Order 7
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'diana@example.com'),
    '2026-05-12T14:07:03.758Z',
    'delivered',
    79.98
);

-- Order 8
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'eve@example.com'),
    '2026-04-15T14:07:03.758Z',
    'delivered',
    448.97
);

-- Order 9
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'diana@example.com'),
    '2026-10-03T14:07:03.758Z',
    'pending',
    698.00
);

-- Order 10
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'diana@example.com'),
    '2026-06-12T14:07:03.758Z',
    'delivered',
    719.96
);

-- Order 11
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'charlie@example.com'),
    '2026-08-09T14:07:03.758Z',
    'paid',
    897.00
);

-- Order 12
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'diana@example.com'),
    '2026-04-18T14:07:03.758Z',
    'delivered',
    149.99
);

-- Order 13
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'alice@example.com'),
    '2026-09-01T14:07:03.758Z',
    'cancelled',
    798.00
);

-- Order 14
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'diana@example.com'),
    '2026-08-26T14:07:03.758Z',
    'pending',
    299.00
);

-- Order 15
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'diana@example.com'),
    '2026-07-12T14:07:03.758Z',
    'delivered',
    179.97
);

-- Order 16
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'diana@example.com'),
    '2026-09-19T14:07:03.758Z',
    'paid',
    2035.00
);

-- Order 17
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'eve@example.com'),
    '2026-06-16T14:07:03.758Z',
    'cancelled',
    69.00
);

-- Order 18
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'alice@example.com'),
    '2026-05-07T14:07:03.758Z',
    'delivered',
    1296.98
);

-- Order 19
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'eve@example.com'),
    '2026-06-05T14:07:03.758Z',
    'delivered',
    1698.00
);

-- Order 20
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'charlie@example.com'),
    '2026-05-31T14:07:03.758Z',
    'paid',
    276.00
);

-- Order 21
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'alice@example.com'),
    '2026-08-08T14:07:03.758Z',
    'pending',
    2897.00
);

-- Order 22
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'eve@example.com'),
    '2026-07-29T14:07:03.758Z',
    'pending',
    317.99
);

-- Order 23
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'bob@example.com'),
    '2026-09-17T14:07:03.758Z',
    'pending',
    1247.97
);

-- Order 24
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'bob@example.com'),
    '2026-05-22T14:07:03.758Z',
    'pending',
    1128.98
);

-- Order 25
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'charlie@example.com'),
    '2026-05-15T14:07:03.758Z',
    'paid',
    799.00
);

-- Order 26
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'bob@example.com'),
    '2026-07-20T14:07:03.758Z',
    'cancelled',
    567.99
);

-- Order 27
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'bob@example.com'),
    '2026-09-28T14:07:03.758Z',
    'paid',
    3466.00
);

-- Order 28
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'alice@example.com'),
    '2026-07-25T14:07:03.758Z',
    'shipped',
    798.00
);

-- Order 29
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'eve@example.com'),
    '2026-06-28T14:07:03.758Z',
    'pending',
    229.97
);

-- Order 30
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'diana@example.com'),
    '2026-04-09T14:07:03.758Z',
    'pending',
    799.00
);

-- Order 31
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'alice@example.com'),
    '2026-05-04T14:07:03.758Z',
    'delivered',
    239.48
);

-- Order 32
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'alice@example.com'),
    '2026-05-03T14:07:03.758Z',
    'pending',
    368.00
);

-- Order 33
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'eve@example.com'),
    '2026-04-11T14:07:03.758Z',
    'pending',
    299.98
);

-- Order 34
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'charlie@example.com'),
    '2026-08-16T14:07:03.758Z',
    'cancelled',
    798.00
);

-- Order 35
INSERT INTO orders (customer_id, order_date, status, total_amount) VALUES (
    (SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'eve@example.com'),
    '2026-05-01T14:07:03.758Z',
    'shipped',
    199.98
);


-- Order Items
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 34),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'KIT-001-BLK'),
    2,
    99.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 33),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'AUD-001-BLK'),
    2,
    299
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 32),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'ELC-002-STD'),
    1,
    149.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 31),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'MCL-001-WHT-M'),
    2,
    49.5
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 31),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'CLN-001-WHT'),
    1,
    399
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 31),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'ELC-001-WHT'),
    2,
    39.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 30),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'AUD-001-BLK'),
    1,
    299
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 30),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'ELC-001-WHT'),
    1,
    39.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 30),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'MCL-001-WHT-M'),
    1,
    49.5
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 29),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'ELC-002-STD'),
    1,
    149.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 29),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'HAP-001-WHT'),
    2,
    179.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 28),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'ELC-001-WHT'),
    2,
    39.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 27),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'KIT-001-BLK'),
    2,
    99.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 27),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'HAP-001-WHT'),
    1,
    179.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 27),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'APP-001-BLK'),
    1,
    69
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 26),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'AUD-001-BLK'),
    1,
    299
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 26),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'CLN-001-WHT'),
    1,
    399
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 25),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'HAP-001-WHT'),
    2,
    179.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 25),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'HAP-001-WHT'),
    2,
    179.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 24),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'MCL-001-WHT-M'),
    2,
    49.5
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 24),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'CLN-001-WHT'),
    2,
    399
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 23),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'ELC-002-STD'),
    1,
    149.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 22),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'CLN-001-WHT'),
    2,
    399
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 21),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'AUD-001-BLK'),
    1,
    299
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 20),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'KIT-001-BLK'),
    1,
    99.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 20),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'ELC-001-WHT'),
    2,
    39.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 19),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'AUD-001-BLK'),
    2,
    299
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 19),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'LAP-001-16G-512'),
    1,
    1299
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 19),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'APP-001-BLK'),
    2,
    69
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 18),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'APP-001-BLK'),
    1,
    69
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 17),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'KIT-001-BLK'),
    2,
    99.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 17),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'AUD-001-BLK'),
    1,
    299
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 17),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'CLN-001-WHT'),
    2,
    399
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 16),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'CLN-001-WHT'),
    1,
    399
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 16),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'LAP-001-16G-512'),
    1,
    1299
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 15),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'APP-001-BLK'),
    2,
    69
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 15),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'APP-001-BLK'),
    2,
    69
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 14),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'SPH-001-BLK-128'),
    2,
    799
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 14),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'LAP-001-16G-512'),
    1,
    1299
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 13),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'APP-001-BLK'),
    2,
    69
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 13),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'HAP-001-WHT'),
    1,
    179.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 12),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'ELC-002-STD'),
    2,
    149.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 12),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'ELC-002-STD'),
    1,
    149.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 12),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'CLN-001-WHT'),
    2,
    399
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 11),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'HAP-001-WHT'),
    1,
    179.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 11),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'SPH-001-BLK-128'),
    1,
    799
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 11),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'ELC-002-STD'),
    1,
    149.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 10),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'SPH-001-BLK-128'),
    1,
    799
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 9),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'KIT-001-BLK'),
    1,
    99.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 9),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'APP-001-BLK'),
    1,
    69
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 9),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'CLN-001-WHT'),
    1,
    399
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 8),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'APP-001-BLK'),
    1,
    69
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 8),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'LAP-001-16G-512'),
    2,
    1299
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 8),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'SPH-001-BLK-128'),
    1,
    799
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 7),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'CLN-001-WHT'),
    2,
    399
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 6),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'ELC-001-WHT'),
    2,
    39.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 6),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'ELC-002-STD'),
    1,
    149.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 5),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'SPH-001-BLK-128'),
    1,
    799
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 4),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'ELC-001-WHT'),
    1,
    39.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 4),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'ELC-002-STD'),
    1,
    149.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 4),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'MCL-001-WHT-M'),
    1,
    49.5
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 3),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'AUD-001-BLK'),
    1,
    299
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 3),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'APP-001-BLK'),
    1,
    69
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 2),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'ELC-002-STD'),
    2,
    149.99
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 1),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'CLN-001-WHT'),
    2,
    399
);
INSERT INTO order_items (order_id, variant_id, quantity, unit_price) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 0),
    (SELECT variant_id FROM product_variants WHERE variant_sku = 'KIT-001-BLK'),
    2,
    99.99
);


-- Payments
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 34),
    'cod',
    'cod_pending',
    199.98,
    'TXN-873877'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 33),
    'cod',
    'failed',
    598.00,
    'TXN-619570'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 32),
    'card',
    'completed',
    149.99,
    'TXN-109372'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 31),
    'card',
    'completed',
    577.98,
    'TXN-956883'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 30),
    'cod',
    'failed',
    388.49,
    'TXN-213116'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 29),
    'cod',
    'cod_pending',
    509.97,
    'TXN-801235'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 28),
    'card',
    'completed',
    79.98,
    'TXN-961809'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 27),
    'cod',
    'completed',
    448.97,
    'TXN-621777'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 26),
    'cod',
    'cod_pending',
    698.00,
    'TXN-549237'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 25),
    'card',
    'completed',
    719.96,
    'TXN-704544'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 24),
    'cod',
    'completed',
    897.00,
    'TXN-838648'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 23),
    'cod',
    'completed',
    149.99,
    'TXN-120675'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 22),
    'card',
    'failed',
    798.00,
    'TXN-842863'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 21),
    'card',
    'pending',
    299.00,
    'TXN-672519'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 20),
    'card',
    'completed',
    179.97,
    'TXN-743623'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 19),
    'card',
    'completed',
    2035.00,
    'TXN-367049'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 18),
    'cod',
    'failed',
    69.00,
    'TXN-155420'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 17),
    'card',
    'completed',
    1296.98,
    'TXN-62561'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 16),
    'cod',
    'completed',
    1698.00,
    'TXN-431765'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 15),
    'cod',
    'completed',
    276.00,
    'TXN-783602'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 14),
    'card',
    'pending',
    2897.00,
    'TXN-704302'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 13),
    'cod',
    'cod_pending',
    317.99,
    'TXN-410609'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 12),
    'card',
    'pending',
    1247.97,
    'TXN-489120'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 11),
    'card',
    'pending',
    1128.98,
    'TXN-736068'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 10),
    'card',
    'completed',
    799.00,
    'TXN-551707'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 9),
    'card',
    'failed',
    567.99,
    'TXN-114221'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 8),
    'card',
    'completed',
    3466.00,
    'TXN-213258'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 7),
    'cod',
    'completed',
    798.00,
    'TXN-900826'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 6),
    'cod',
    'cod_pending',
    229.97,
    'TXN-742270'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 5),
    'card',
    'pending',
    799.00,
    'TXN-557843'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 4),
    'card',
    'completed',
    239.48,
    'TXN-830441'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 3),
    'card',
    'pending',
    368.00,
    'TXN-889606'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 2),
    'cod',
    'cod_pending',
    299.98,
    'TXN-668873'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 1),
    'cod',
    'failed',
    798.00,
    'TXN-689467'
);
INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 0),
    'cod',
    'completed',
    199.98,
    'TXN-448119'
);


-- Deliveries
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 34),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Fort Worth'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 33),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'San Antonio'),
    '70000',
    'cancelled'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 32),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'El Paso'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 31),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'El Paso'),
    '70000',
    'in_transit'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 30),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Houston'),
    '70000',
    'cancelled'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 29),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Houston'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 28),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'El Paso'),
    '70000',
    'delivered'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 27),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Fort Worth'),
    '70000',
    'delivered'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 26),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'El Paso'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 25),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'El Paso'),
    '70000',
    'delivered'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 24),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'San Antonio'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 23),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'El Paso'),
    '70000',
    'delivered'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 22),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Austin'),
    '70000',
    'cancelled'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 21),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'El Paso'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 20),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'El Paso'),
    '70000',
    'delivered'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 19),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'El Paso'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 18),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Fort Worth'),
    '70000',
    'cancelled'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 17),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Austin'),
    '70000',
    'delivered'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 16),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Fort Worth'),
    '70000',
    'delivered'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 15),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'San Antonio'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 14),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Austin'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 13),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Fort Worth'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 12),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Houston'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 11),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Houston'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 10),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'San Antonio'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 9),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Houston'),
    '70000',
    'cancelled'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 8),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Houston'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 7),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Austin'),
    '70000',
    'in_transit'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 6),
    'store_pickup',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Fort Worth'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 5),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'El Paso'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 4),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Austin'),
    '70000',
    'delivered'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 3),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Austin'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 2),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Fort Worth'),
    '70000',
    'pending'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 1),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'San Antonio'),
    '70000',
    'cancelled'
);
INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status) VALUES (
    (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1 OFFSET 0),
    'home_delivery',
    '123 Random St',
    (SELECT city_id FROM cities WHERE city_name = 'Fort Worth'),
    '70000',
    'in_transit'
);

