-- V29__cart_uniqueness_and_checkout_concurrency.sql
-- Enforce single active cart per customer (D3) and durable idempotency for checkout

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'idx_carts_customer_id_unique'
    ) THEN
        ALTER TABLE carts ADD CONSTRAINT idx_carts_customer_id_unique UNIQUE (customer_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS order_idempotency_keys (
    key_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    idempotency_key VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_order_idempotency_customer_key UNIQUE (customer_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_order_idempotency_lookup
    ON order_idempotency_keys (customer_id, idempotency_key);
