# Phase 1.5: Catalog Taxonomy Schema

> **Parent Phase:** [Phase 1: Project Foundation & Database](phase1-project-foundation.md)
> **Status:** Complete
> **Assigned To:** A
> **Depends On:** — (needs 1.2 to run locally)
> **Blocks:** 1.8
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Create the tables that classify and describe products (categories, product-category links, and variant attributes), plus their seed data.

---

## Tables Owned

`categories`, `product_categories`, `variant_attributes`, `variant_attribute_values`

---

## Tasks

### Migrations
- [x] `V7__create_categories.sql` — `categories` table with self-referencing `parent_category_id`
- [x] `V8__create_variant_attributes.sql` — `variant_attributes` table, unique `attribute_name`
- [x] `V12__create_product_categories.sql` — junction table, composite PK `(product_id, category_id)`, `ON DELETE CASCADE` from `products`
- [x] `V13__create_variant_attribute_values.sql` — unique `(variant_id, attribute_id)`, `ON DELETE CASCADE` from `product_variants`
- [x] Indexes: `categories(parent_category_id)`, `product_categories(category_id)`

### Seed — `03_taxonomy.sql`
- [x] 10 categories as per the SRS, including parent/child hierarchy
- [x] Variant attributes (e.g. Color, Storage, Size, RAM)
- [x] **Early:** publish the category and attribute names in this doc's notes so others can reference them

### Seed — `05_catalog_links.sql`
- [x] Link all 40 products to categories (products looked up by `base_sku`)
- [x] Attribute values for every variant (variants looked up by `variant_sku`)

### Documentation
- [x] Add any new constraints/indexes to [DB_Schema.md](../../Database/DB_Schema.md)

---

## Definition of Done

- Migrations V7, V8, V12, V13 run cleanly in the full migration sequence.
- Every product belongs to at least one category; every variant has its attribute values.
- No hard-coded IDs from other members' tables.

---

## Key Decisions & Notes

- **Categories Published:** Electronics, Smartphones, Laptops, Audio, Home Appliances, Kitchen, Cleaning, Apparel, Men's Clothing, Women's Clothing.
- **Attributes Published:** Color, Storage, RAM, Size, Material.
- **Dependencies Update:** Indexes `idx_categories_parent_id` and `idx_product_categories_category_id`, plus `ON DELETE CASCADE` behaviors added to `DB_Schema.md`.
- **Consumer Technology Specialization:** See [Fix 7.1: Technology Taxonomy Hierarchy](../../Fixes/Fix7-Tech-Catalog-Specialization/fix7.1-technology-taxonomy-hierarchy.md) and [Fix 7.3: Catalog Links Integrity](../../Fixes/Fix7-Tech-Catalog-Specialization/fix7.3-catalog-links-order-seed-integrity.md) for the restructuring of `03_taxonomy.sql` and `05_catalog_links.sql` to exclusively support consumer technology categories and attributes.

## Fix 8 follow-up

Database integrity and concurrency work is tracked separately in [Fix 8](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 8.7: Category Hierarchy Integrity](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8.7-category-cycle-protection.md)

Read the Fix 8 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
