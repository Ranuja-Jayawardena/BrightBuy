# Fix 7.4: Database Reseed Orchestration, Flyway Verification & Storefront Validation

> **Parent Group:** [Fix 7: Consumer Technology Catalog Specialization](fix7-tech-catalog-specialization.md)  
> **Status:** Planned  
> **Assigned To:** Member E (DevOps + Architecture), Member A (Storefront Verification), Member B (Admin UI Verification)  
> **Depends On:** [Fix 7.1](fix7.1-technology-taxonomy-hierarchy.md), [Fix 7.2](fix7.2-technology-product-catalog-seed.md), [Fix 7.3](fix7.3-catalog-links-order-seed-integrity.md), [Fix 7.5](fix7.5-cloud-media-assets-s3-sync.md)  
> **Blocks:** Production Deployment Sync  
> **Priority:** High  
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)  
> **Infrastructure Reference:** [docker-compose.yml](../../../docker-compose.yml), [aws-infrastructure.md](../../Deployment/aws-infrastructure.md)  

---

## Problem & Motivation

Once seed scripts `03_taxonomy.sql`, `04_products.sql`, `05_catalog_links.sql`, and `07_orders.sql` are updated to exclusively feature consumer technology items, and asset files are synchronized to AWS S3 via [Fix 7.5](fix7.5-cloud-media-assets-s3-sync.md), the full migration and seed sequence must be systematically executed and verified in Docker and on staging.

Any broken natural key lookups, missing attribute definitions, or orphan image URLs must be detected and caught before pushing changes. Furthermore, the frontend storefront (Member A) and admin portal (Member B) must be smoke-tested to guarantee that the UI renders the specialized tech catalog smoothly.

---

## Tasks

### 1. Database Reseed Execution & Pipeline Verification — Member E
- [ ] Ensure S3 asset sync is verified per [Fix 7.5](fix7.5-cloud-media-assets-s3-sync.md) before reseeding:
  ```bash
  aws s3 sync backend/db/seed/assets/ s3://brightbuy-media-storage-695945476492/products/ --content-type "image/webp"
  ```
- [ ] Test the full local database initialization and seed sequence:
  ```bash
  # Step 1: Wipe and re-create database container
  docker-compose down -v
  docker-compose up -d postgres

  # Step 2: Execute Flyway migrations V1 through V26
  # Step 3: Run seed scripts in strict order:
  # 01_identity.sql -> 02_customers.sql -> 03_taxonomy.sql -> 
  # 04_products.sql -> 05_catalog_links.sql -> 06_carts.sql -> 07_orders.sql
  ```
- [ ] Verify zero foreign key violations and zero syntax errors during seed execution.
- [ ] Validate REST API endpoints against reseeded database:
  - `GET /api/categories`: Returns 100% tech categories with proper hierarchy.
  - `GET /api/products`: Returns 40 active tech products.
  - `GET /api/products/brands`: Returns dynamic list of tech brands (*Lumina*, *Aura*, *Zenith*, *Titan*, *Sonus*, *PowerPulse*, *NovaTech*, etc.).
  - `GET /api/products/suggestions?q=lap`: Returns tech suggestion items.

### 2. Storefront UI Validation — Member A
- [ ] Verify `/products` catalog page:
  - Dynamic brand filter pills show tech manufacturers.
  - Price range slider and preset filters work accurately with new tech price ranges.
  - Search autocomplete suggestions return tech products.
- [ ] Verify `/categories` page:
  - Category cards and sidebar display the new tech hierarchy (*Laptops*, *Smartphones*, *Audio & Sound*, *Tablets*, *Displays*).
- [ ] Verify `/products/[id]` detail page:
  - Technical attribute chips (Storage, RAM, Color) select smoothly.
  - Product images resolve to active S3 URLs.

### 3. Admin Dashboard Verification — Member B
- [ ] Verify `/admin/products`:
  - Displays all 40 tech products with base SKUs, brands, and categories.
  - Active/Inactive status toggle functions normally per Fix 3.2.
- [ ] Verify `/admin/categories`:
  - Reflects the reorganized tech category tree with active toggle per Fix 3.3.

---

## Verification Checklist

| Check | Expected Result | Status |
|---|---|---|
| Migration & Seed Execution | Clean exit 0, all 7 seed scripts pass | ⬜ Pending |
| Total Active Products | Exactly 40 products in database | ⬜ Pending |
| Non-Tech Items Remaining | Exactly 0 (no apparel, kitchenware, or appliances) | ⬜ Pending |
| S3 Image Delivery | S3 image URLs render HTTP 200 without broken links | ⬜ Pending |
| Brand Discovery Endpoint | Dynamic brand query returns active tech brands | ⬜ Pending |
| Storefront Filter Matrix | Category & price filtering operate without console errors | ⬜ Pending |

---

## Affected Files

- `docker-compose.yml`
- `docker-compose.prod.yml`
- `backend/db/seed/*.sql`
- `Docs/Deployment/aws-infrastructure.md`

---

## Definition of Done

1. Reseed pipeline executes cleanly and deterministically in Docker and AWS environments.
2. All 40 products in the catalog represent consumer technology items.
3. Storefront browsing, filtering, search, and checkout function seamlessly with the new tech catalog.
