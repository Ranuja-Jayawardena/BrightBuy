-- 02_customers.sql

-- Customer Users
INSERT INTO users (email, password_hash, role) VALUES
('alice@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjGQiqwSBC', 'customer'),
('bob@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjGQiqwSBC', 'customer'),
('charlie@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjGQiqwSBC', 'customer'),
('diana@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjGQiqwSBC', 'customer'),
('eve@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjGQiqwSBC', 'customer');

-- Customers Profiles
INSERT INTO customers (user_id, first_name, last_name, phone) VALUES
((SELECT user_id FROM users WHERE email = 'alice@example.com'), 'Alice', 'Smith', '555-0101'),
((SELECT user_id FROM users WHERE email = 'bob@example.com'), 'Bob', 'Jones', '555-0102'),
((SELECT user_id FROM users WHERE email = 'charlie@example.com'), 'Charlie', 'Brown', '555-0103'),
((SELECT user_id FROM users WHERE email = 'diana@example.com'), 'Diana', 'Prince', '555-0104'),
((SELECT user_id FROM users WHERE email = 'eve@example.com'), 'Eve', 'Adams', '555-0105');

-- Customer Addresses
INSERT INTO addresses (customer_id, address_line1, address_line2, city_id, zip_code, is_default) VALUES
((SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'alice@example.com'), '123 Apple St', NULL, (SELECT city_id FROM cities WHERE city_name = 'Austin'), '73301', true),
((SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'alice@example.com'), '456 Apple Ave', 'Apt 1', (SELECT city_id FROM cities WHERE city_name = 'Dallas'), '75201', false),
((SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'bob@example.com'), '789 Banana Blvd', NULL, (SELECT city_id FROM cities WHERE city_name = 'Houston'), '77001', true),
((SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'charlie@example.com'), '101 Cherry Ct', NULL, (SELECT city_id FROM cities WHERE city_name = 'San Antonio'), '78201', true),
((SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'diana@example.com'), '202 Date Dr', 'Suite 5', (SELECT city_id FROM cities WHERE city_name = 'El Paso'), '79901', true),
((SELECT customer_id FROM customers c JOIN users u ON c.user_id = u.user_id WHERE u.email = 'eve@example.com'), '303 Elderberry Ln', NULL, (SELECT city_id FROM cities WHERE city_name = 'Fort Worth'), '76101', true);
