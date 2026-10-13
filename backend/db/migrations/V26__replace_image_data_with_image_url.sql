-- V26: Replace PostgreSQL BYTEA binary image storage with AWS S3 image URLs
-- Member E (DevOps & Flyway Migrations) & Member C (DB Product Tables)

-- Step 1: Add image_url column
ALTER TABLE product_images
  ADD COLUMN image_url VARCHAR(500);

-- Step 2: Populate image_url for existing rows using product_id S3 convention
UPDATE product_images
SET image_url = CASE
  WHEN is_primary = true THEN 'https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/' || product_id || '/primary.webp'
  ELSE 'https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/' || product_id || '/secondary.webp'
END
WHERE image_url IS NULL;

-- Step 3: Enforce NOT NULL on image_url
ALTER TABLE product_images
  ALTER COLUMN image_url SET NOT NULL;

-- Step 4: Drop the heavy binary image_data column completely
ALTER TABLE product_images
  DROP COLUMN image_data;
