# Fix 6.2: Database Schema Migration & S3 Seed Cutover

> **Parent Group:** [Fix 6: Cloud Object Storage (AWS S3) & Media Delivery](fix6-cloud-media-storage-s3.md)  
> **Status:** Complete  
> **Assigned To:** Member C (DB Product Tables) & Member E (DevOps & Flyway Migrations)  
> **Depends On:** [Fix 6.1: AWS S3 Infrastructure](fix6.1-s3-infrastructure-bucket-iam.md)  
> **Blocks:** [Fix 6.3: Backend S3 Service](fix6.3-backend-s3-service-upload-apis.md)  
> **Priority:** High  
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (table: `product_images`)  
> **Flyway Target:** `backend/db/migrations/V26__replace_image_data_with_image_url.sql`  

---

## Problem & Motivation

The original schema defined in `V11__create_product_images.sql` enforces `image_data BYTEA NOT NULL`. Storing raw binary blobs in the relational database creates severe database bloat, slows down queries, and degrades server performance.

With lecturer approval for AWS S3, we are executing a complete cutover:
1. **Drop the `image_data BYTEA` column completely** from `product_images`.
2. Add `image_url VARCHAR(500) NOT NULL` pointing directly to AWS S3.
3. Update `backend/db/seed/04_products.sql` to insert clean S3 URLs instead of base64 blobs.

---

## Tasks

### 1. Flyway Migration Creation (`V26__replace_image_data_with_image_url.sql`) — Member C & E
- [x] Create `backend/db/migrations/V26__replace_image_data_with_image_url.sql`:
  ```sql
  -- V26: Replace PostgreSQL BYTEA binary image storage with AWS S3 image URLs

  -- Step 1: Add image_url column
  ALTER TABLE product_images
    ADD COLUMN image_url VARCHAR(500);

  -- Step 2: Populate image_url for existing rows using product_id S3 convention
  UPDATE product_images
  SET image_url = 'https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/' || product_id || '/primary.webp'
  WHERE image_url IS NULL;

  -- Step 3: Enforce NOT NULL on image_url
  ALTER TABLE product_images
    ALTER COLUMN image_url SET NOT NULL;

  -- Step 4: Drop the heavy binary image_data column completely
  ALTER TABLE product_images
    DROP COLUMN image_data;
  ```

### 2. Update Database Seed Script (`04_products.sql`) — Member C
- [x] In `backend/db/seed/04_products.sql`:
  - Replace the old insert pattern:
    ```sql
    -- OLD (DEPRECATED):
    INSERT INTO product_images (product_id, image_data, sort_order, is_primary) VALUES
    (1, decode('iVBORw0KGgo...', 'base64'), 0, true);
    ```
  - With clean, lightweight S3 URL inserts:
    ```sql
    -- NEW (S3 STANDARD):
    INSERT INTO product_images (product_id, image_url, sort_order, is_primary) VALUES
    (1, 'https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/1/primary.webp', 0, true),
    (2, 'https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/2/primary.webp', 0, true);
    ```
  - This reduces `04_products.sql` file size by over 95% and accelerates database container bootstrapping.

### 3. Schema Documentation Sync — Member C
- [x] Update [Docs/Database/DB_Schema.md](../../Database/DB_Schema.md):
  - In `Table product_images`:
    - `image_url varchar(500) [not null]`
    - Remove `image_data bytea` completely.

---

## Definition of Done

1. Migration `V26__replace_image_data_with_image_url.sql` runs cleanly on both dev and production databases.
2. `product_images` table contains only `image_id`, `product_id`, `image_url`, `sort_order`, `is_primary`, `created_at`.
3. The heavy `image_data BYTEA` column is completely removed from the database.
4. Database seed script `04_products.sql` executes in seconds with zero binary strings.
