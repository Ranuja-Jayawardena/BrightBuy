# Phase 1.5: Catalog Taxonomy Schema

> **Parent Phase:** [Phase 1: Project Foundation & Database](phase1-project-foundation.md)
> **Status:** Not Started
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
- [ ] `V7__create_categories.sql` — `categories` table with self-referencing `parent_category_id`
- [ ] `V8__create_variant_attributes.sql` — `variant_attributes` table, unique `attribute_name`
- [ ] `V12__create_product_categories.sql` — junction table, composite PK `(product_id, category_id)`, `ON DELETE CASCADE` from `products`
- [ ] `V13__create_variant_attribute_values.sql` — unique `(variant_id, attribute_id)`, `ON DELETE CASCADE` from `product_variants`
- [ ] Indexes: `categories(parent_category_id)`, `product_categories(category_id)`

### Seed — `03_taxonomy.sql`
- [ ] 10 categories as per the SRS, including parent/child hierarchy
- [ ] Variant attributes (e.g. Color, Storage, Size, RAM)
- [ ] **Early:** publish the category and attribute names in this doc's notes so others can reference them

### Seed — `05_catalog_links.sql`
- [ ] Link all 40 products to categories (products looked up by `base_sku`)
- [ ] Attribute values for every variant (variants looked up by `variant_sku`)

### Documentation
- [ ] Add any new constraints/indexes to [DB_Schema.md](../../Database/DB_Schema.md)

---

## Definition of Done

- Migrations V7, V8, V12, V13 run cleanly in the full migration sequence.
- Every product belongs to at least one category; every variant has its attribute values.
- No hard-coded IDs from other members' tables.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

