-- V30__order_transitions_and_payment_uniqueness.sql
-- Fix 8.4 (Decisions D1, D2, D8): Order Transitions & Payment Event Consistency
-- Enforces 1:1 payments per order, transaction identity, state transition machine, and durable webhook/audit logging.

-- 1. Enforce 1:1 payment per order (D1)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'idx_payments_order_id_unique'
    ) THEN
        ALTER TABLE payments ADD CONSTRAINT idx_payments_order_id_unique UNIQUE (order_id);
    END IF;
END $$;

-- 2. Enforce transaction_id uniqueness for non-null provider transactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_transaction_id_unique
    ON payments (transaction_id)
    WHERE transaction_id IS NOT NULL;

-- 3. Durable Webhook Event Deduplication table
CREATE TABLE IF NOT EXISTS webhook_events (
    event_id VARCHAR(255) PRIMARY KEY,
    event_name VARCHAR(100) NOT NULL,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
    transaction_id VARCHAR(100),
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_order_id
    ON webhook_events (order_id);

-- 4. Payment Reconciliation & Audit Logs table
CREATE TABLE IF NOT EXISTS payment_reconciliation_logs (
    log_id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(order_id) ON DELETE SET NULL,
    event_id VARCHAR(255),
    event_name VARCHAR(100),
    transaction_id VARCHAR(100),
    discrepancy_type VARCHAR(100) NOT NULL,
    expected_value TEXT,
    received_value TEXT,
    payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_order_id
    ON payment_reconciliation_logs (order_id);

-- 5. Strict Finite State Machine Trigger for Order Status Transitions (D2)
CREATE OR REPLACE FUNCTION enforce_order_status_transition()
RETURNS trigger AS $$
BEGIN
    -- If status is not changing, allow it (e.g. updating total_amount, updated_at, etc.)
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Allowed transitions:
    -- pending   -> paid, shipped (COD dispatch), cancelled
    -- paid      -> shipped, cancelled (refund)
    -- shipped   -> delivered, cancelled
    -- delivered -> terminal
    -- cancelled -> terminal
    IF OLD.status = 'pending' AND NEW.status IN ('paid', 'shipped', 'cancelled') THEN
        RETURN NEW;
    ELSIF OLD.status = 'paid' AND NEW.status IN ('shipped', 'cancelled') THEN
        RETURN NEW;
    ELSIF OLD.status = 'shipped' AND NEW.status IN ('delivered', 'cancelled') THEN
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'Invalid order status transition from % to %', OLD.status, NEW.status
            USING ERRCODE = 'P0001';
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_order_status_transition ON orders;
CREATE TRIGGER trg_enforce_order_status_transition
BEFORE UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION enforce_order_status_transition();
