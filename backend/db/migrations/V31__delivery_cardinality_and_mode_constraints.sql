-- V31__delivery_cardinality_and_mode_constraints.sql
-- Fix 8.5 (Decisions D4, D8): Delivery Cardinality & Value Constraints
-- Enforces 1:1 deliveries per order, nonnegative amounts and prices, and mode/status consistency.

-- 1. Clean up legacy statuses before adding constraints
UPDATE deliveries SET delivery_status = 'shipped' WHERE delivery_status = 'in_transit';
UPDATE deliveries SET delivery_status = 'collected' WHERE delivery_mode = 'store_pickup' AND delivery_status = 'delivered';

-- 2. Enforce 1:1 delivery per order (D4)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'idx_deliveries_order_id_unique'
    ) THEN
        ALTER TABLE deliveries ADD CONSTRAINT idx_deliveries_order_id_unique UNIQUE (order_id);
    END IF;
END $$;

-- 3. Value Non-negativity Checks (unit_price >= 0 and amount >= 0)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_order_items_unit_price_nonnegative'
    ) THEN
        ALTER TABLE order_items ADD CONSTRAINT chk_order_items_unit_price_nonnegative CHECK (unit_price >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_payments_amount_nonnegative'
    ) THEN
        ALTER TABLE payments ADD CONSTRAINT chk_payments_amount_nonnegative CHECK (amount >= 0);
    END IF;
END $$;

-- 4. Delivery Status & Mode Consistency Check
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_deliveries_mode_status'
    ) THEN
        ALTER TABLE deliveries ADD CONSTRAINT chk_deliveries_mode_status CHECK (
            (delivery_mode = 'home_delivery' AND delivery_status IN ('pending', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled')) OR
            (delivery_mode = 'store_pickup' AND delivery_status IN ('pending', 'processing', 'ready_for_pickup', 'collected', 'cancelled'))
        );
    END IF;
END $$;
