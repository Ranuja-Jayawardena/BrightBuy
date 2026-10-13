# Fix 6.3: Backend S3 Service & Pre-signed Upload APIs

> **Parent Group:** [Fix 6: Cloud Object Storage (AWS S3) & Media Delivery](fix6-cloud-media-storage-s3.md)  
> **Status:** Complete
> **Assigned To:** Member C (Backend Catalog & Image APIs)  
> **Depends On:** [Fix 6.1: AWS S3 Infrastructure](fix6.1-s3-infrastructure-bucket-iam.md), [Fix 6.2: Schema Migration](fix6.2-s3-schema-migration-seed-cutover.md)  
> **Blocks:** [Fix 6.4: Frontend Image Delivery & UI](fix6.4-storefront-admin-image-delivery-ui.md)  
> **Priority:** High  
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (table: `product_images`)  

---

## Problem & Motivation

1. **Eliminate Server Memory Load:** The old multipart upload pipeline (`multipartImageUpload.js`) buffered raw binary image chunks into Node.js memory on our EC2 instance before writing to PostgreSQL.
2. **Direct Browser-to-Cloud Uploads:** With AWS S3, standard production architecture generates **Pre-signed S3 Upload URLs**. The browser uploads files directly to AWS S3, bypassing our Express server entirely.
3. **Pure S3 Queries:** Product queries will return `image_url` directly. Node.js never reads, streams, or processes binary image bytes.

---

## Tasks (Member C)

### 1. Dependencies & S3 Service Foundation
- [x] Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` to `backend/package.json`.
- [x] Create `backend/src/services/s3Service.js`:
  - Initialize `S3Client({ region: process.env.AWS_REGION || 'us-east-1' })`. (Credentials resolve automatically from the EC2 IAM Instance Profile in production).
  - Export `generatePresignedUploadUrl({ productId, contentType, fileName })`:
    - Generate key: `products/${productId}/${crypto.randomUUID()}.${ext}`.
    - Set expiration: 300 seconds (5 minutes).
    - Construct `publicUrl`: `https://${bucketName}.s3.${region}.amazonaws.com/${key}`.
    - Return `{ uploadUrl, fileKey, publicUrl }`.
  - Export `deleteS3Object(fileKey)`:
    - Deletes image object from S3 bucket on product/image deletion.

### 2. Admin Pre-signed Upload Endpoints (`adminProductController.js`)
- [x] Implement `POST /api/admin/products/:id/images/presign`:
  - Validates staff/admin role (`requireStaffOrAdmin`).
  - Validates `contentType` (`image/jpeg`, `image/png`, `image/webp`).
  - Calls `s3Service.generatePresignedUploadUrl`.
  - Returns `{ uploadUrl, fileKey, publicUrl }`.
- [x] Implement `POST /api/admin/products/:id/images/confirm`:
  - Accepts `{ image_url, sort_order, is_primary }`.
  - Inserts row directly into `product_images (product_id, image_url, sort_order, is_primary)`.
  - Manages single-primary logic.

### 3. Catalog Queries & Legacy Route Clean-up
- [x] Update `productModel.js` and `adminProductModel.js`:
  - Ensure queries select `image_id, image_url, sort_order, is_primary`.
- [x] Deprecate / Replace `imageModel.js`:
  - Remove `findImageDataById` and pure BYTEA binary streaming.
  - In `imageController.js`: `GET /api/images/:id` looks up `image_url` and returns an immediate `302 Found` redirect to the S3 URL (preserving compatibility for any legacy callers).
- [x] Remove `backend/src/middleware/multipartImageUpload.js` (no longer needed).
- [x] Update Jest unit test suite (`backend/tests/productBackend.test.js`) to assert `image_url` strings instead of binary Buffers.

---

## API Contracts

### `POST /api/admin/products/:id/images/presign`
```http
POST /api/admin/products/12/images/presign
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "contentType": "image/webp",
  "fileName": "sneakers-front.webp"
}
```
**Response (200 OK):**
```json
{
  "uploadUrl": "https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/12/550e8400-e29b-41d4-a716-446655440000.webp?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "fileKey": "products/12/550e8400-e29b-41d4-a716-446655440000.webp",
  "publicUrl": "https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/12/550e8400-e29b-41d4-a716-446655440000.webp"
}
```

### `POST /api/admin/products/:id/images/confirm`
```http
POST /api/admin/products/12/images/confirm
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "image_url": "https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/12/550e8400-e29b-41d4-a716-446655440000.webp",
  "sort_order": 0,
  "is_primary": true
}
```
**Response (201 Created):**
```json
{
  "image": {
    "image_id": 41,
    "product_id": 12,
    "image_url": "https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/12/550e8400-e29b-41d4-a716-446655440000.webp",
    "sort_order": 0,
    "is_primary": true
  }
}
```

---

## Definition of Done

1. AWS SDK v3 installed and integrated via `s3Service.js`.
2. Admin images are uploaded directly to S3 via pre-signed URLs.
3. Database queries select `image_url` directly; `BYTEA` streaming logic is completely removed.
4. All unit tests pass with updated S3 URL mocks.
