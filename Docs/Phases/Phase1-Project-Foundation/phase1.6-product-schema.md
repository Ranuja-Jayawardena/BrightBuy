# Phase 1.6: Product Schema

> **Parent Phase:** [Phase 1: Project Foundation & Database](phase1-project-foundation.md)
> **Status:** Not Started
> **Assigned To:** C
> **Depends On:** — (needs 1.2 to run locally)
> **Blocks:** 1.8
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Create the core product tables (products, variants, images) and seed the 40-product catalog.

---

## Tables Owned

`products`, `product_variants`, `product_images`

---

## Tasks

### Migrations
- [ ] `V9__create_products.sql` — `products` table, unique `base_sku`
- [ ] `V10__create_product_variants.sql` — unique `variant_sku`, CHECK `price >= 0`, CHECK `stock_quantity >= 0`
- [ ] `V11__create_product_images.sql` — `image_data BYTEA`, `ON DELETE CASCADE` from `products`
- [ ] Ensure at most one primary image per product (partial unique index on `product_images(product_id) WHERE is_primary`)
- [ ] Indexes: `product_variants(product_id)`, `product_images(product_id, sort_order)`, index supporting product name search

### Seed — `04_products.sql`
- [ ] 40 products across the 10 categories (as per SRS)
- [ ] Variants for each product with prices and stock levels (include some low-stock and zero-stock variants for testing)
- [ ] At least one image per product stored as BYTEA (e.g. via `decode('<base64>', 'base64')` or a small seed helper script)
- [ ] **Early:** publish the full `base_sku` / `variant_sku` list in this doc's notes so A, B, and D can write their seed files in parallel

### Documentation
- [ ] Add any new constraints/indexes to [DB_Schema.md](../../Database/DB_Schema.md)

---

## Definition of Done

- Migrations V9–V11 run cleanly in the full migration sequence.
- 40 active products with variants and images exist after seeding.
- SKU list is published for other members.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

