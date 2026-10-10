CREATE TABLE inventory_adjustments (
    adjustment_id SERIAL PRIMARY KEY,
    variant_id INTEGER NOT NULL REFERENCES product_variants(variant_id),
    employee_id INTEGER NOT NULL REFERENCES employees(employee_id),
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inventory_adjustments_variant_id ON inventory_adjustments(variant_id);
