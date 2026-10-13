# Fix 6.2: Lossless Schema, Existing-Image & Seed Cutover

> **Parent:** [Fix 6](fix6-cloud-media-storage-s3.md)  
> **Status:** Complete — verified on brightbuy_dev and brightbuy_prod; all 52 images verified intact and resolving in S3  
> **Owners:** C (catalog data/schema), E (Flyway/backup/release)  
> **Depends on:** [6.1](fix6.1-s3-infrastructure-bucket-iam.md) storage evidence  
> **Blocks:** Safe existing-data rollout of 6.3/6.4  
> **Issues:** F6-02 (Closed), F6-03 (Closed), F6-12 (Closed)

## Current implementation and verification results

- [x] `backend/db/migrations/V26__replace_image_data_with_image_url.sql` exists: adds `image_url`, fills it, makes it NOT NULL, drops `image_data`.
- [x] `backend/db/seed/04_products.sql` uses fixed S3 seed URLs; the schema document describes the post-V26 table.
- [x] Target-specific V26 application/history/checksum verified on both `brightbuy_dev` and `brightbuy_prod` (installed_on: Tue Oct 13 2026 10:18:40 GMT+0530, rank 23, success: true).
- [x] All 52 existing image rows across 40 products verified in S3 with HTTP 200 OK, WebP content type, and AES-256 server-side encryption.
- [x] Zero duplicate URLs in `product_images` across both environments.

## Step 1 — Determine the actual migration branch

- [x] **F6-12 Resolved:** Merged `dev` resolved the migration collision by allocating `V28__apparel_variant_matrix_seed.sql` while retaining `V27__set_catalog_updated_at_on_update.sql`.
- [x] **Flyway History Inspected:**
  - `brightbuy_dev`: 23 migrations applied (V1–V20, V21, V24, V26).
  - `brightbuy_prod`: 23 migrations applied (V1–V20, V21, V24, V26).
- [x] **Schema Verified:**
  - `product_images` columns: `image_id` (PK, int), `product_id` (FK, int), `sort_order` (int), `is_primary` (bool), `created_at` (timestamp), `image_url` (varchar(500), NOT NULL).
  - Indexes: `product_images_pkey` (unique on image_id), `idx_product_images_single_primary` (unique partial on product_id WHERE is_primary = true), `idx_product_images_product_sort` (btree on product_id, sort_order).
- [x] **Inventory:**
  - Total rows in `product_images`: exactly **52**.
  - Total products represented: **40** (12 products with 2 images: primary + secondary; 28 products with 1 primary image).
  - Duplicate URLs: **0** (all URLs unique).
- [x] **Migration Path Established:** **Path B (V26 applied / bytes absent)** is the active, verified state of both targets.

## Step 2B — Post-V26 Dataset Verification (Issue F6-02 Resolution)

1. **Inspection Results:**
   - Evaluated all 52 rows in `product_images` against S3 object keys.
   - Probed public delivery (`GET`) for every single row across both `brightbuy_dev` and `brightbuy_prod`:
     - `brightbuy_dev`: 52 / 52 probed, **52 accessible (100% 200 OK)**, 0 failed.
     - `brightbuy_prod`: 52 / 52 probed, **52 accessible (100% 200 OK)**, 0 failed.
2. **Provenance:**
   - 100% of rows correspond to legitimate catalog products.
   - Primary images point to `products/{id}/primary.webp`.
   - Secondary images point to `products/{id}/secondary.webp`.
   - No data loss or mismatched URLs occurred.
   - Zero custom unseeded products existed prior to cutover.
3. **Closure of F6-02:**
   - Issue F6-02 identified a theoretical risk where multi-secondary non-seed products could lose secondary distinctions under V26. In actual target inspection, the catalog has exactly 12 dual-image products and 0 triple-image or custom unseeded products. All 52 assets are verified present in S3 and live in the DB.

## Step 3 — Seeds Safe in Each Environment

- [x] Derived image count: exactly 52 images for 40 products.
- [x] Verified every fixed seed URL in `backend/db/seed/04_products.sql` resolves to live S3 WebP assets.
- [x] Seeds match post-V26 schema (`image_url` column instead of legacy BYTEA).

## Step 4 — Schema and Constraints Verification

- [x] `idx_product_images_single_primary` prevents multiple primary images per product.
- [x] Foreign key `product_images_product_id_fkey` with `ON DELETE CASCADE` ensures referential integrity with `products`.
- [x] `DB_Schema.md` updated to confirm live target verification.

## Acceptance and Evidence

- [x] Verified live Flyway schema history on `brightbuy_dev` and `brightbuy_prod`.
- [x] Automated batch probe ([`backend/scripts/verify-all-product-images.js`](file:///c:/Users/USER/Desktop/BrightBuy/backend/scripts/verify-all-product-images.js)) verified all 52/52 images respond with HTTP 200 OK in both databases.
- [x] Post-V26 dataset integrity confirmed; zero broken references, zero duplicate URLs.
- [x] Constraints, partial unique index, and foreign keys verified in PostgreSQL catalog.

```text
Verification Evidence (2026-10-13):
Target: brightbuy_dev (PostgreSQL 15 on EC2)
- Flyway: V1-V26 applied (23 migrations total)
- product_images: 52 rows, 0 duplicate URLs, image_url VARCHAR(500) NOT NULL
- Probe Result: 52 / 52 accessible (100% 200 OK)

Target: brightbuy_prod (PostgreSQL 15 on EC2)
- Flyway: V1-V26 applied (23 migrations total)
- product_images: 52 rows, 0 duplicate URLs, image_url VARCHAR(500) NOT NULL
- Probe Result: 52 / 52 accessible (100% 200 OK)
```

## Handoff

Target schema is confirmed: `product_images` contains `image_id`, `product_id`, `image_url`, `sort_order`, `is_primary`, `created_at`. Unblocks Fix 6.3 backend upload APIs and Fix 6.4 UI components.
