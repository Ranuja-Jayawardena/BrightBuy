-- Migration V26: Populate complete apparel variant matrix for existing databases
INSERT INTO product_variants (product_id, variant_sku, variant_name, price, stock_quantity, is_active)
VALUES
  ((SELECT product_id FROM products WHERE base_sku = 'MCL-001'), 'MCL-001-WHT-S', 'White / Size S', 49.50, 20, true),
  ((SELECT product_id FROM products WHERE base_sku = 'MCL-001'), 'MCL-001-WHT-L', 'White / Size L', 49.50, 20, true),
  ((SELECT product_id FROM products WHERE base_sku = 'MCL-001'), 'MCL-001-BLU-S', 'Sky Blue / Size S', 49.50, 17, true),
  ((SELECT product_id FROM products WHERE base_sku = 'MCL-001'), 'MCL-001-BLU-M', 'Sky Blue / Size M', 49.50, 17, true),
  ((SELECT product_id FROM products WHERE base_sku = 'MCL-002'), 'MCL-002-KHK-34', 'Khaki / 34W 32L', 59.50, 15, true),
  ((SELECT product_id FROM products WHERE base_sku = 'MCL-002'), 'MCL-002-NVY-32', 'Navy / 32W 32L', 59.50, 3, true),
  ((SELECT product_id FROM products WHERE base_sku = 'MCL-003'), 'MCL-003-CHL-S', 'Charcoal / Size S', 79.00, 14, true),
  ((SELECT product_id FROM products WHERE base_sku = 'MCL-003'), 'MCL-003-CHL-L', 'Charcoal / Size L', 79.00, 14, true),
  ((SELECT product_id FROM products WHERE base_sku = 'MCL-003'), 'MCL-003-CAM-S', 'Camel Tan / Size S', 79.00, 7, true),
  ((SELECT product_id FROM products WHERE base_sku = 'MCL-003'), 'MCL-003-CAM-M', 'Camel Tan / Size M', 79.00, 7, true),
  ((SELECT product_id FROM products WHERE base_sku = 'MCL-004'), 'MCL-004-BLK-S', 'Stealth Black / Size S', 65.00, 16, true),
  ((SELECT product_id FROM products WHERE base_sku = 'MCL-004'), 'MCL-004-BLK-M', 'Stealth Black / Size M', 65.00, 16, true),
  ((SELECT product_id FROM products WHERE base_sku = 'MCL-004'), 'MCL-004-BLU-S', 'Electric Blue / Size S', 65.00, 0, true),
  ((SELECT product_id FROM products WHERE base_sku = 'MCL-004'), 'MCL-004-BLU-L', 'Electric Blue / Size L', 65.00, 0, true),
  ((SELECT product_id FROM products WHERE base_sku = 'WCL-001'), 'WCL-001-CRM-M', 'Cream Ivory / Size M', 64.00, 15, true),
  ((SELECT product_id FROM products WHERE base_sku = 'WCL-001'), 'WCL-001-CRM-L', 'Cream Ivory / Size L', 64.00, 15, true),
  ((SELECT product_id FROM products WHERE base_sku = 'WCL-001'), 'WCL-001-BLS-S', 'Blush Pink / Size S', 64.00, 12, true),
  ((SELECT product_id FROM products WHERE base_sku = 'WCL-001'), 'WCL-001-BLS-L', 'Blush Pink / Size L', 64.00, 12, true),
  ((SELECT product_id FROM products WHERE base_sku = 'WCL-002'), 'WCL-002-IND-30', 'Dark Indigo / Size 30', 68.00, 20, true),
  ((SELECT product_id FROM products WHERE base_sku = 'WCL-002'), 'WCL-002-BLK-28', 'Washed Black / Size 28', 68.00, 3, true),
  ((SELECT product_id FROM products WHERE base_sku = 'WCL-003'), 'WCL-003-OAT-S', 'Oatmeal Heather / Size S', 119.00, 10, true),
  ((SELECT product_id FROM products WHERE base_sku = 'WCL-003'), 'WCL-003-OAT-L', 'Oatmeal Heather / Size L', 119.00, 10, true),
  ((SELECT product_id FROM products WHERE base_sku = 'WCL-003'), 'WCL-003-GRY-S', 'Dove Gray / Size S', 119.00, 7, true),
  ((SELECT product_id FROM products WHERE base_sku = 'WCL-003'), 'WCL-003-GRY-M', 'Dove Gray / Size M', 119.00, 7, true),
  ((SELECT product_id FROM products WHERE base_sku = 'WCL-004'), 'WCL-004-BLK-M', 'Classic Black / Size M', 48.00, 27, true),
  ((SELECT product_id FROM products WHERE base_sku = 'WCL-004'), 'WCL-004-BLK-L', 'Classic Black / Size L', 48.00, 27, true),
  ((SELECT product_id FROM products WHERE base_sku = 'WCL-004'), 'SGE-S', 'Sage Green / Size S', 48.00, 0, true),
  ((SELECT product_id FROM products WHERE base_sku = 'WCL-004'), 'SGE-L', 'Sage Green / Size L', 48.00, 0, true)
ON CONFLICT (variant_sku) DO NOTHING;

-- Fix the WCL-004 SKUs if needed:
UPDATE product_variants SET variant_sku = 'WCL-004-SGE-S' WHERE variant_sku = 'SGE-S';
UPDATE product_variants SET variant_sku = 'WCL-004-SGE-L' WHERE variant_sku = 'SGE-L';

WITH var_attrs (sku, attr, val) AS (
  VALUES
    ('MCL-001-WHT-S', 'Color', 'White'),
    ('MCL-001-WHT-S', 'Size', 'S'),
    ('MCL-001-WHT-L', 'Color', 'White'),
    ('MCL-001-WHT-L', 'Size', 'L'),
    ('MCL-001-BLU-S', 'Color', 'Sky Blue'),
    ('MCL-001-BLU-S', 'Size', 'S'),
    ('MCL-001-BLU-M', 'Color', 'Sky Blue'),
    ('MCL-001-BLU-M', 'Size', 'M'),
    ('MCL-002-KHK-34', 'Color', 'Khaki'),
    ('MCL-002-KHK-34', 'Size', '34W 32L'),
    ('MCL-002-NVY-32', 'Color', 'Navy'),
    ('MCL-002-NVY-32', 'Size', '32W 32L'),
    ('MCL-003-CHL-S', 'Color', 'Charcoal'),
    ('MCL-003-CHL-S', 'Size', 'S'),
    ('MCL-003-CHL-L', 'Color', 'Charcoal'),
    ('MCL-003-CHL-L', 'Size', 'L'),
    ('MCL-003-CAM-S', 'Color', 'Camel Tan'),
    ('MCL-003-CAM-S', 'Size', 'S'),
    ('MCL-003-CAM-M', 'Color', 'Camel Tan'),
    ('MCL-003-CAM-M', 'Size', 'M'),
    ('MCL-004-BLK-S', 'Color', 'Stealth Black'),
    ('MCL-004-BLK-S', 'Size', 'S'),
    ('MCL-004-BLK-M', 'Color', 'Stealth Black'),
    ('MCL-004-BLK-M', 'Size', 'M'),
    ('MCL-004-BLU-S', 'Color', 'Electric Blue'),
    ('MCL-004-BLU-S', 'Size', 'S'),
    ('MCL-004-BLU-L', 'Color', 'Electric Blue'),
    ('MCL-004-BLU-L', 'Size', 'L'),
    ('WCL-001-CRM-M', 'Color', 'Cream Ivory'),
    ('WCL-001-CRM-M', 'Size', 'M'),
    ('WCL-001-CRM-L', 'Color', 'Cream Ivory'),
    ('WCL-001-CRM-L', 'Size', 'L'),
    ('WCL-001-BLS-S', 'Color', 'Blush Pink'),
    ('WCL-001-BLS-S', 'Size', 'S'),
    ('WCL-001-BLS-L', 'Color', 'Blush Pink'),
    ('WCL-001-BLS-L', 'Size', 'L'),
    ('WCL-002-IND-30', 'Color', 'Dark Indigo'),
    ('WCL-002-IND-30', 'Size', '30'),
    ('WCL-002-BLK-28', 'Color', 'Washed Black'),
    ('WCL-002-BLK-28', 'Size', '28'),
    ('WCL-003-OAT-S', 'Color', 'Oatmeal Heather'),
    ('WCL-003-OAT-S', 'Size', 'S'),
    ('WCL-003-OAT-L', 'Color', 'Oatmeal Heather'),
    ('WCL-003-OAT-L', 'Size', 'L'),
    ('WCL-003-GRY-S', 'Color', 'Dove Gray'),
    ('WCL-003-GRY-S', 'Size', 'S'),
    ('WCL-003-GRY-M', 'Color', 'Dove Gray'),
    ('WCL-003-GRY-M', 'Size', 'M'),
    ('WCL-004-BLK-M', 'Color', 'Classic Black'),
    ('WCL-004-BLK-M', 'Size', 'M'),
    ('WCL-004-BLK-L', 'Color', 'Classic Black'),
    ('WCL-004-BLK-L', 'Size', 'L'),
    ('WCL-004-SGE-S', 'Color', 'Sage Green'),
    ('WCL-004-SGE-S', 'Size', 'S'),
    ('WCL-004-SGE-L', 'Color', 'Sage Green'),
    ('WCL-004-SGE-L', 'Size', 'L')
)
INSERT INTO variant_attribute_values (variant_id, attribute_id, attribute_value)
SELECT pv.variant_id, va.attribute_id, va_val.val
FROM var_attrs va_val
JOIN product_variants pv ON pv.variant_sku = va_val.sku
JOIN variant_attributes va ON va.attribute_name = va_val.attr
ON CONFLICT (variant_id, attribute_id) DO NOTHING;
