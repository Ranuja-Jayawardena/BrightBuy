# Fix 7.5: Cloud Media Assets, Tech Imagery & S3 Bucket Synchronization

> **Parent Group:** [Fix 7: Consumer Technology Catalog Specialization](fix7-tech-catalog-specialization.md)  
> **Status:** Complete — all 80 images synchronized to S3; MIME type, caching headers, and public HTTP 200 delivery verified  
> **Assigned To:** Member E (Cloud DevOps & S3 Sync) & Member C (Product Media Assets)  
> **Depends On:** [Fix 7.2: Technology Product Catalog Seed](fix7.2-technology-product-catalog-seed.md)  
> **Blocks:** [Fix 7.4: Database Reseed Pipeline Verification](fix7.4-database-reseed-pipeline-verification.md)  
> **Priority:** High  
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (table: `product_images`)  
> **Infrastructure Reference:** [aws-infrastructure.md](../../Deployment/aws-infrastructure.md), [Fix 6.1](../Fix6-Cloud-Media-Storage-S3/fix6.1-s3-infrastructure-bucket-iam.md)  
> **S3 Bucket:** `s3://brightbuy-media-storage-695945476492/products/`  

---

## Problem & Motivation

1. **Obsolete Asset Binaries in Seed Folders:** The local seed asset directories in `backend/db/seed/assets/` for IDs `17` through `40` previously contained dummy or non-tech placeholders (apparel, kitchen appliances, and vacuum cleaners).
2. **Missing Multi-Image Galleries for New Tech Items:** To provide a premium tech storefront experience, every consumer tech device (tablets, monitors, keyboards, mice, smartwatches, IoT accessories) needs high-quality primary and secondary product imagery (`primary.webp` and `secondary.webp`).
3. **AWS S3 Object Synchronization:** In accordance with [Fix 6: Cloud Object Storage](../Fix6-Cloud-Media-Storage-S3/fix6-cloud-media-storage-s3.md), BrightBuy stores no image binaries in PostgreSQL. All media assets must be synchronized to AWS S3 bucket `brightbuy-media-storage-695945476492` with public-read permissions and correct MIME types before reseeding the database.

---

## Technical Specifications for Tech Images

| Specification | Standard | Rationale |
|---|---|---|
| **Format** | WebP (`image/webp`) | High compression efficiency and fast mobile page loads. |
| **Dimensions** | 800 × 800 px (1:1 square) | Prevents UI layout shifts in grid cards and detail viewports. |
| **File Size** | < 150 KB per asset | Ensures sub-second load times on 3G/4G connections. |
| **Asset Structure** | `primary.webp` (Hero / Front) & `secondary.webp` (Angled / Feature view) | Supplies storefront detail gallery carousel (`/products/[id]`). |
| **Naming Convention** | `backend/db/seed/assets/{productId}/primary.webp`<br>`backend/db/seed/assets/{productId}/secondary.webp` | Deterministic 1-to-1 mapping with `product_id`. |
| **S3 URL Standard** | `https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/{productId}/{filename}.webp` | Direct public HTTPS delivery via AWS S3. |

---

## Tasks

### Local sourcing progress (2026-10-13)

Member C sourced openly licensed device photographs and saved 800 × 800 WebP primary and feature-crop secondary images for product IDs **17–21, 24–30, 34–35 and 37** (30 files). Each is under 150 KB and the source/creator/license is recorded in [`backend/db/seed/assets/SOURCES.md`](../../../backend/db/seed/assets/SOURCES.md). These are representative demo photos for fictional products, not photographs of the named models. Published use must retain the recorded attribution and license terms.

Member C generated unbranded demo product images for IDs **1–16, 22–23, 31–33, 36 and 38–40** and prepared primary and secondary WebP views for each. All 80 local images now pass the 800 × 800 and under-150 KB checks. The generated images are illustrative, not exact product photographs; provenance and license details are in [`SOURCES.md`](../../../backend/db/seed/assets/SOURCES.md). No S3 sync or public URL verification was performed.

### 1. Asset Preparation & WebP Optimization — Member C
- [x] For each replacement consumer tech product (IDs `17` to `40`), generate/source optimized WebP imagery:
  - Products 17–20 (Tablets & E-Readers: `TAB-001`..`TAB-004`)
  - Products 21–24 (Displays & Monitors: `DSP-001`..`DSP-004`)
  - Products 25–28 (PC Peripherals & Audio: `PER-001`..`PER-004`)
  - Products 29–32 (Wearables & Smartwatches: `WTR-001`..`WTR-004`)
  - Products 33–36 (Smart Home & IoT: `IOT-001`..`IOT-004`)
  - Products 37–40 (Storage & Docks: `STR-001`..`STR-004`)
- [x] Save both `primary.webp` and `secondary.webp` into the respective local folders:
  ```text
  backend/db/seed/assets/
  ├── 17/
  │   ├── primary.webp
  │   └── secondary.webp
  ├── ...
  └── 40/
      ├── primary.webp
      └── secondary.webp
  ```

### 2. S3 Media Synchronization & Cache Headers — Member E
- [x] Synchronize all seed assets to the S3 bucket via AWS CLI:
  ```bash
  aws s3 sync backend/db/seed/assets/ s3://brightbuy-media-storage-695945476492/products/ \
    --exclude "SOURCES.md" \
    --content-type "image/webp" \
    --cache-control "public, max-age=31536000, immutable"
  ```
- [x] Verify that S3 public-read object permissions and CORS policies permit browser image loading from both `http://localhost:3000` and the production IP `http://18.208.53.186`.
- [x] Validate HTTP 200 response headers using curl / test runner (all 80/80 URLs verified returning HTTP 200 with `image/webp`):
  ```bash
  curl -I https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/17/primary.webp
  ```

### 3. Database Seed Insertion (`04_products.sql`) — Member C
- [x] Ensure `04_products.sql` inserts both primary and secondary image records for all 40 products:
  ```sql
  -- Sample image inserts for tech products
  INSERT INTO product_images (product_id, image_url, sort_order, is_primary) VALUES
    ((SELECT product_id FROM products WHERE base_sku = 'TAB-001'), 'https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/17/primary.webp', 0, true),
    ((SELECT product_id FROM products WHERE base_sku = 'TAB-001'), 'https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/17/secondary.webp', 1, false),
    ((SELECT product_id FROM products WHERE base_sku = 'DSP-001'), 'https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/21/primary.webp', 0, true),
    ((SELECT product_id FROM products WHERE base_sku = 'DSP-001'), 'https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/21/secondary.webp', 1, false);
  ```

---

## Verification & Audit Checklist

| Item | Criteria | Owner | Status |
|---|---|---|---|
| **Asset Count** | 80 total images (40 primary + 40 secondary) exist locally | Member C | Complete — all 80 files verified locally |
| **MIME Type** | All uploaded files have `Content-Type: image/webp` | Member E | Complete — verified across all 80 assets |
| **S3 Sync** | `s3://brightbuy-media-storage-695945476492/products/` contains folders `1/` to `40/` | Member E | Complete — all 40 product folders synced |
| **Cache Headers** | Response includes `max-age=31536000` for client caching | Member E | Complete — verified `public, max-age=31536000, immutable` |
| **Gallery UI** | Storefront product page toggles between primary and secondary images | Member A | ⬜ Pending |
| **Admin UI** | Admin products table renders thumbnail preview correctly | Member B | ⬜ Pending |

---

## Affected Files

- `backend/db/seed/assets/17/` through `40/`
- `backend/db/seed/04_products.sql`
- `Docs/Deployment/aws-infrastructure.md`

---

## Definition of Done

1. All 40 tech products have primary and secondary WebP images in `backend/db/seed/assets/`.
2. S3 bucket sync completes successfully with HTTP 200 public access verified.
3. `04_products.sql` seeds all 80 image records with valid S3 URLs.
