# Fix 7.3: Catalog Links, Attribute Values & Order History Referential Integrity

> **Parent Group:** [Fix 7: Consumer Technology Catalog Specialization](fix7-tech-catalog-specialization.md)  
> **Status:** Complete  
> **Assigned To:** Member A (Catalog Links & Attribute Values) & Member D (Order History Seeds)  
> **Depends On:** [Fix 7.1: Technology Taxonomy Hierarchy](fix7.1-technology-taxonomy-hierarchy.md), [Fix 7.2: Technology Product Catalog Seed](fix7.2-technology-product-catalog-seed.md)  
> **Blocks:** [Fix 7.4: Database Reseed Pipeline Verification](fix7.4-database-reseed-pipeline-verification.md)  
> **Priority:** High  
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (tables: `product_categories`, `variant_attribute_values`, `orders`, `order_items`)  
> **Target Seed Files:** `backend/db/seed/05_catalog_links.sql`, `backend/db/seed/07_orders.sql`  

---

## Problem & Motivation

1. **Junction Table Desynchronization:** In `05_catalog_links.sql`, product-to-category associations (`product_categories`) and variant attribute values (`variant_attribute_values`) currently map obsolete non-tech products (`HAP-*`, `KIT-*`, `CLN-*`, `APP-*`, `MCL-*`, `WCL-*`) to deprecated categories and apparel attributes (`Size`, `Material`). Updating products and categories requires matching junction mappings.
2. **Order History Seed Integrity:** In `07_orders.sql`, demo past orders and order items link to variants via natural key lookup:
   ```sql
   (SELECT variant_id FROM product_variants WHERE variant_sku = 'MCL-001-WHT-M')
   ```
   If obsolete apparel and appliance SKUs are removed without updating `07_orders.sql`, these subqueries return `NULL`, causing `NOT NULL` check violations on `order_items.variant_id` and aborting the seed execution.

---

## Tasks

### 1. Update `backend/db/seed/05_catalog_links.sql` — Member A
- [x] Update `product_categories` mapping table:
  - Map all 40 tech products to their respective tech categories defined in Fix 7.1 and Fix 7.2.
  - Ensure every product has at least one category assignment.
- [x] Update `variant_attribute_values` mapping table:
  - Assign valid technology attributes (`Storage Capacity`, `RAM Size`, `Color`, `Connectivity`, `Screen Size`) to the corresponding variants.
  - Purge references to apparel sizes and materials.

### 2. Update `backend/db/seed/07_orders.sql` — Member D
- [x] Audit all `order_items` inserts in `07_orders.sql` referencing deprecated non-tech SKUs:
  - Replaced all 35 deprecated SKU occurrences with verified tech variant SKUs from Fix 7.2 (`AUD-003-BLK`, `ELC-001-WHT`, `DSP-003-25-BLK`, `PER-003-BLK`, `IOT-002-5M-RGB`):
    - `APP-001-BLK` → `IOT-002-5M-RGB` (LuminaGlow Smart Lightstrip 5M)
    - `CLN-001-WHT` → `DSP-003-25-BLK` (Titan 240Hz Esports Display 25-inch)
    - `KIT-001-BLK` → `AUD-003-BLK` (BassBoom 360 Bluetooth Speaker)
    - `HAP-001-WHT` → `PER-003-BLK` (StreamCam 4K Studio Webcam)
    - `MCL-001-WHT-M` → `ELC-001-WHT` (AeroSound Pods Pro Glacier White)
- [x] Verify that order totals, item counts, and timestamps remain mathematically consistent:
  - All 35 orders verified: item line sums equal `orders.total_amount`.
  - All 35 payments verified: `payments.amount` matches order total.
  - Complete elimination of foreign key / `NULL` lookup risks against technology catalog.

---

## Shared Contract: Linkage & SKU Alignment

### Sample Product Category Mapping (`05_catalog_links.sql`)
```sql
WITH product_cats(sku, cat) AS (
    VALUES
    ('TAB-001', 'Tablets & E-Readers'),
    ('DSP-001', 'Displays & Monitors'),
    ('PER-001', 'Gaming Peripherals'),
    ('WTR-001', 'Smartwatches & Fitness'),
    ('IOT-001', 'Smart Lighting & Security'),
    ('STR-001', 'External Storage & SSDs')
)
INSERT INTO product_categories (product_id, category_id)
SELECT p.product_id, c.category_id
FROM product_cats pc
JOIN products p ON p.base_sku = pc.sku
JOIN categories c ON c.category_name = pc.cat;
```

### Sample Order Items Reference Alignment (`07_orders.sql`)
```sql
INSERT INTO order_items (order_id, variant_id, quantity, unit_price, total_price)
VALUES 
(
  (SELECT order_id FROM orders WHERE order_number = 'ORD-2026-0001'),
  (SELECT variant_id FROM product_variants WHERE variant_sku = 'TAB-001-128-GRY'),
  1,
  799.00,
  799.00
);
```

---

## Affected Files

- `backend/db/seed/05_catalog_links.sql`
- `backend/db/seed/07_orders.sql`

---

## Definition of Done

1. `05_catalog_links.sql` executes without error; every product has a valid tech category, and tech variants have their attribute values.
2. `07_orders.sql` runs cleanly without `NULL` variant lookups or broken foreign key constraints.
3. Complete seed data pipeline produces a cohesive customer order history featuring tech items.
