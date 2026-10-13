-- V34: Inventory Adjustment Audit Immutability Trigger & Integrity Constraints
-- Fix 8.8: Enforce append-only audit immutability and reason integrity on inventory_adjustments (Members C & E)

-- 1. Check constraints on inventory_adjustments table
ALTER TABLE inventory_adjustments
    ADD CONSTRAINT chk_inventory_adjustments_reason_non_empty CHECK (length(trim(reason)) > 0),
    ADD CONSTRAINT chk_inventory_adjustments_prev_qty_non_negative CHECK (previous_quantity >= 0),
    ADD CONSTRAINT chk_inventory_adjustments_new_qty_non_negative CHECK (new_quantity >= 0),
    ADD CONSTRAINT chk_inventory_adjustments_quantity_changed CHECK (previous_quantity <> new_quantity);

-- 2. Trigger function to enforce append-only immutability (disallow UPDATE and DELETE)
CREATE OR REPLACE FUNCTION trg_fn_prevent_inventory_adjustment_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'inventory_adjustments records are immutable and cannot be updated or deleted'
        USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger binding: reject any UPDATE or DELETE statements on inventory_adjustments
DROP TRIGGER IF EXISTS trg_inventory_adjustments_immutable ON inventory_adjustments;
CREATE TRIGGER trg_inventory_adjustments_immutable
    BEFORE UPDATE OR DELETE ON inventory_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_prevent_inventory_adjustment_tampering();
