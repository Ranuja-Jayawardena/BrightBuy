CREATE TABLE deliveries (
    delivery_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id),
    delivery_mode VARCHAR(30) NOT NULL CHECK (delivery_mode IN ('home_delivery', 'store_pickup')),
    delivery_address_line1 VARCHAR(255) NOT NULL,
    delivery_address_line2 VARCHAR(255),
    delivery_city_id INTEGER NOT NULL REFERENCES cities(city_id),
    delivery_zip_code VARCHAR(10) NOT NULL,
    estimated_delivery_days INTEGER,
    tracking_number VARCHAR(100),
    delivery_status VARCHAR(30) NOT NULL DEFAULT 'pending',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deliveries_order_id ON deliveries(order_id);
