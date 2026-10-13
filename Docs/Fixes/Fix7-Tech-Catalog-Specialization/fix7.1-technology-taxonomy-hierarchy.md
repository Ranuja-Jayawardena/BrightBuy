# Fix 7.1: Technology Taxonomy & Category Hierarchy Restructuring

> **Parent Group:** [Fix 7: Consumer Technology Catalog Specialization](fix7-tech-catalog-specialization.md)  
> **Status:** Planned  
> **Assigned To:** Member A (Frontend Storefront & Taxonomy Schema)  
> **Depends On:** —  
> **Blocks:** [Fix 7.2](fix7.2-technology-product-catalog-seed.md), [Fix 7.3](fix7.3-catalog-links-order-seed-integrity.md)  
> **Priority:** High  
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (tables: `categories`, `variant_attributes`)  
> **Target Seed File:** `backend/db/seed/03_taxonomy.sql`  

---

## Problem & Motivation

1. **Non-Tech Categories in Seed Data:** The existing `03_taxonomy.sql` script defines 10 categories, of which 6 belong to non-tech sectors: *Home Appliances*, *Kitchen*, *Cleaning*, *Apparel*, *Men's Clothing*, and *Women's Clothing*.
2. **Incompatible Attribute Set:** Variant attributes currently contain apparel-oriented attributes like *Size* (S, M, L) and *Material* rather than technology-specific attributes like *Storage* (128GB, 256GB, 512GB, 1TB), *RAM* (8GB, 16GB, 32GB), *Connectivity* (Bluetooth, Wi-Fi 6E, 5G), and *Color*.
3. **Storefront Alignment:** As BrightBuy is officially an exclusive electronics and tech retailer, the category browsing UI and navbar dropdowns must present logical tech hierarchies (e.g. Laptops, Smartphones, Audio, Smart Devices, PC Peripherals).

---

## Tasks (Member A)

### 1. Overhaul `backend/db/seed/03_taxonomy.sql`
- [ ] Remove all non-tech category insert statements (*Home Appliances*, *Kitchen*, *Cleaning*, *Apparel*, *Men's Clothing*, *Women's Clothing*).
- [ ] Define clean consumer technology category hierarchy:
  - **Level 1 Parent Categories:**
    - `Electronics`
    - `Computers & Gaming`
    - `Audio & Sound`
    - `Smart Home & Wearables`
    - `Accessories & Storage`
  - **Level 2 Subcategories:**
    - Under `Electronics`: `Smartphones`, `Tablets & E-Readers`, `Cameras & Gear`
    - Under `Computers & Gaming`: `Laptops`, `Desktop Components`, `Displays & Monitors`, `Gaming Peripherals`
    - Under `Audio & Sound`: `Headphones & Earbuds`, `Speakers & Soundbars`
    - Under `Smart Home & Wearables`: `Smartwatches & Fitness`, `Smart Lighting & Security`
    - Under `Accessories & Storage`: `Chargers & Cables`, `External Storage & SSDs`
- [ ] Update variant attributes in `variant_attributes`:
  - Insert: `Storage Capacity`, `RAM Size`, `Color`, `Connectivity`, `Screen Size`.
  - Deprecate: Clothing `Size` and `Material`.

### 2. Publish Taxonomy Contract
- [ ] Publish the exact list of `category_name` and `attribute_name` values in the Key Decisions section below so Member C and Member D can reference them during Fix 7.2 and 7.3.

### 3. Storefront UI Navigation Alignment
- [ ] In `frontend/src/app/categories/page.tsx` and global navigation headers, ensure category breadcrumbs and tree components gracefully render the new tech taxonomy.

---

## Shared Contract: Published Tech Categories & Attributes

### 1. Categories Hierarchy
```sql
-- Root Categories
INSERT INTO categories (category_name, parent_category_id, is_active) VALUES 
('Electronics', NULL, true),
('Computers & Gaming', NULL, true),
('Audio & Sound', NULL, true),
('Smart Home & Wearables', NULL, true),
('Accessories & Storage', NULL, true);

-- Subcategories
INSERT INTO categories (category_name, parent_category_id, is_active) VALUES 
('Smartphones', (SELECT category_id FROM categories WHERE category_name = 'Electronics'), true),
('Tablets & E-Readers', (SELECT category_id FROM categories WHERE category_name = 'Electronics'), true),
('Cameras & Gear', (SELECT category_id FROM categories WHERE category_name = 'Electronics'), true),
('Laptops', (SELECT category_id FROM categories WHERE category_name = 'Computers & Gaming'), true),
('Displays & Monitors', (SELECT category_id FROM categories WHERE category_name = 'Computers & Gaming'), true),
('Gaming Peripherals', (SELECT category_id FROM categories WHERE category_name = 'Computers & Gaming'), true),
('Headphones & Earbuds', (SELECT category_id FROM categories WHERE category_name = 'Audio & Sound'), true),
('Speakers & Soundbars', (SELECT category_id FROM categories WHERE category_name = 'Audio & Sound'), true),
('Smartwatches & Fitness', (SELECT category_id FROM categories WHERE category_name = 'Smart Home & Wearables'), true),
('Smart Lighting & Security', (SELECT category_id FROM categories WHERE category_name = 'Smart Home & Wearables'), true),
('Chargers & Cables', (SELECT category_id FROM categories WHERE category_name = 'Accessories & Storage'), true),
('External Storage & SSDs', (SELECT category_id FROM categories WHERE category_name = 'Accessories & Storage'), true);
```

### 2. Variant Attributes
```sql
INSERT INTO variant_attributes (attribute_name) VALUES 
('Color'),
('Storage Capacity'),
('RAM Size'),
('Connectivity');
```

---

## Affected Files

- `backend/db/seed/03_taxonomy.sql`
- `frontend/src/app/categories/page.tsx`

---

## Definition of Done

1. `03_taxonomy.sql` executes without syntax or foreign key errors.
2. Contains 0 non-tech categories (apparel, kitchen, cleaning).
3. All categories and attributes are available for natural key lookups by Member C (`04_products.sql`) and Member A (`05_catalog_links.sql`).
