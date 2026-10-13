-- 01_identity.sql: Cities, Admin User, and Employees

-- Cities
INSERT INTO cities (city_name, state, is_main_city) VALUES
('Austin', 'Texas', true),
('Dallas', 'Texas', true),
('Houston', 'Texas', true),
('San Antonio', 'Texas', true),
('El Paso', 'Texas', false),
('Fort Worth', 'Texas', false),
('Arlington', 'Texas', false),
('Corpus Christi', 'Texas', false);

-- Users (password: password123)
-- bcrypt hash for password123: $2b$10$mDQ54ZzvBIgQDwro.yyEUuhwE6Fw1Kke7hhiV/baPgW4IIWNC0zai
INSERT INTO users (email, password_hash, role) VALUES
('admin@brightbuy.com', '$2b$10$mDQ54ZzvBIgQDwro.yyEUuhwE6Fw1Kke7hhiV/baPgW4IIWNC0zai', 'admin'),
('employee1@brightbuy.com', '$2b$10$mDQ54ZzvBIgQDwro.yyEUuhwE6Fw1Kke7hhiV/baPgW4IIWNC0zai', 'admin'),
('employee2@brightbuy.com', '$2b$10$mDQ54ZzvBIgQDwro.yyEUuhwE6Fw1Kke7hhiV/baPgW4IIWNC0zai', 'admin');

-- Employees (linked by email)
INSERT INTO employees (user_id, first_name, last_name, phone, role) VALUES
((SELECT user_id FROM users WHERE email = 'admin@brightbuy.com'), 'System', 'Admin', '555-0000', 'super_admin'),
((SELECT user_id FROM users WHERE email = 'employee1@brightbuy.com'), 'John', 'Doe', '555-0001', 'inventory_manager'),
((SELECT user_id FROM users WHERE email = 'employee2@brightbuy.com'), 'Jane', 'Smith', '555-0002', 'order_dispatcher');

