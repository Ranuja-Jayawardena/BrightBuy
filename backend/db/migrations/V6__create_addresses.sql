CREATE TABLE addresses (
    address_id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city_id INT NOT NULL REFERENCES cities(city_id),
    zip_code VARCHAR(10) NOT NULL,
    is_default BOOLEAN DEFAULT false
);

CREATE INDEX idx_addresses_customer_id ON addresses(customer_id);
CREATE UNIQUE INDEX idx_addresses_default ON addresses(customer_id) WHERE is_default = true;
