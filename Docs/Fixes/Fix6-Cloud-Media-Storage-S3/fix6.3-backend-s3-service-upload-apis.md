# Fix 6.3: Backend Upload, Confirmation, Delivery & Deletion

> **Parent:** [Fix 6](fix6-cloud-media-storage-s3.md)
> **Status:** Complete — Verified on live PostgreSQL and AWS S3 with V36 ledger, staging isolation, magic byte inspection, idempotent replay, recoverable cleanup queue, and concurrency tests
> **Owner:** C; E reviews storage/worker/release, D adds cart read fields
> **Depends on:** [Companion](fix6-contracts-verification-rollout.md) resolved M2–M6/M8; isolated 6.1 resources and compatible 6.2 schema
> **Blocks:** 6.4 final integration and media release
> **Issues:** F6-04–F6-09 resolved; supports F6-01/F6-10

## Evidence: done, verified and tested

- [x] AWS SDK v3 S3 client/presigner dependencies exist in `backend/package.json`.
- [x] `s3Service.js` generates 300-second PUT URLs, canonical public URLs, HEAD existence checks, and deletes.
- [x] `adminRoutes.js` exposes presign/confirm and retains image update/delete, protected by auth/admin/catalog-manager guards.
- [x] Product/admin models and services select/return URL fields; the image endpoint redirects to the stored URL; multipart middleware is removed.
- [x] Existing Jest media tests were changed to URL mocks; full test suite passes (19 suites, 162 tests).
- [x] Durable issued-upload identity (`media_uploads`), authoritative magic-byte and size verification (5MB limit), immutable finalization (`CopyObjectCommand` to `products/`), and idempotent confirmation replay (200 OK) implemented.
- [x] Safe durable deletion/orphan cleanup queue (`media_cleanup_jobs`), seed asset protection (`isProtectedSeedKey`), and product-level image locking (`SELECT ... FOR UPDATE`) implemented.
- [x] Real S3/PostgreSQL failure/concurrency tests passed (`npm run test:s3`, `npm run test:media-concurrency`, `npm run test:product`, and `npm test`).

## Key Implementation Artifacts

1. **Migration V36:** [`backend/db/migrations/V36__media_uploads_and_cleanup_ledger.sql`](../../../backend/db/migrations/V36__media_uploads_and_cleanup_ledger.sql) creating `media_uploads` and `media_cleanup_jobs` tables with deduplication and partial indexes.
2. **S3 Service:** [`backend/src/services/s3Service.js`](../../../backend/src/services/s3Service.js) implementing private staging keys (`uploads/...`), authoritative magic byte inspection (JPEG/PNG/WebP), S3 copy promotion, and seed protection.
3. **Admin Model & Service:** [`backend/src/models/adminProductModel.js`](../../../backend/src/models/adminProductModel.js) and [`backend/src/services/adminProductService.js`](../../../backend/src/services/adminProductService.js) implementing lease claiming, idempotent replay, single-primary serialization, and transactional deletion with cleanup queuing.
4. **Cleanup Worker:** [`backend/src/services/mediaCleanupService.js`](../../../backend/src/services/mediaCleanupService.js) processing background deletions with `SKIP LOCKED`, exponential backoff retry, and seed asset preservation.
5. **Test Evidence:**
   - [`backend/tests/s3MediaLifecycle.test.js`](../../../backend/tests/s3MediaLifecycle.test.js) (12 Jest tests covering presign, replay, magic bytes, and worker retries).
   - [`backend/test/s3-media-concurrency.test.js`](../../../backend/test/s3-media-concurrency.test.js) (real PostgreSQL concurrency test covering simultaneous primary writes and rollback safety).
   - [`backend/test/s3-infrastructure.test.js`](../../../backend/test/s3-infrastructure.test.js) (5/5 live S3 lifecycle and CORS tests).

---

## Step 1 — Freeze concrete endpoint contracts

- [x] Record the baseline table in the companion and complete M2–M6/M8. Hand exact examples to B/A/D before dependent UI changes.
- [x] Preserve URL paths and existing success fields where possible, including image IDs and `image_url`/primary/sort fields.
- [x] Retain HttpOnly-cookie auth and actual catalog-manager/super-admin permission semantics. Authenticated inventory-only users and customers remain forbidden.
- [x] Define strict numeric ID bounds consistent with PostgreSQL integer IDs, accepted booleans/order ranges, MIME values, filename length and byte limits.
- [x] Freeze what happens to stale tabs and the removed multipart route. Direct JSON PUT/confirm is the authoritative path.

### Concrete Endpoint Contracts

```http
POST /api/admin/products/:id/images/presign
Content-Type: application/json
Cookie: access_token=<authenticated_admin_or_catalog_manager>

{
  "contentType": "image/webp",
  "fileName": "laptop-front.webp",
  "fileSize": 123456
}
```

```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "uploadUrl": "https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/uploads/12/550e8400-e29b-41d4-a716-446655440000.webp?...",
  "stagingKey": "uploads/12/550e8400-e29b-41d4-a716-446655440000.webp",
  "finalKey": "products/12/550e8400-e29b-41d4-a716-446655440000.webp",
  "publicUrl": "https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/12/550e8400-e29b-41d4-a716-446655440000.webp",
  "method": "PUT",
  "requiredHeaders": { "Content-Type": "image/webp" },
  "expiresAt": "2026-10-14T00:20:00.000Z"
}
```

```http
POST /api/admin/products/:id/images/confirm
Content-Type: application/json
Cookie: access_token=<authenticated_admin_or_catalog_manager>

{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "sort_order": 0,
  "is_primary": true
}
```

- **First Success (201 Created):**
  ```json
  {
    "image": {
      "image_id": 41,
      "product_id": 12,
      "image_url": "https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/12/550e8400-e29b-41d4-a716-446655440000.webp",
      "sort_order": 0,
      "is_primary": true,
      "created_at": "2026-10-14T00:15:00.000Z"
    }
  }
  ```
- **Idempotent Replay (200 OK):** Returns the existing `{ image }` record without duplicate insert or primary mutation.
- **Upload Conflict / In Verification (409 Conflict):**
  ```json
  { "error": "conflict", "message": "This upload is currently being verified.", "statusCode": 409 }
  ```

---

## Step 2 — Issue a durable upload identity

- [x] Verify product existence and role/issuer, normalize metadata and enforce M3 admission limits (5MB, JPEG/PNG/WebP) before issuing credentials.
- [x] Create the M4 `media_uploads` record with product, issuer, staging and final keys, expected metadata, expiry (300s), and initial state `'pending'`.
- [x] Return required headers and expiry.
- [x] Never sign a browser write to an existing published key.
- [x] Bound outstanding upload identities and implement expiry cleanup.

---

## Step 3 — Verify and finalize without a cross-system race

- [x] Claim the issued upload with a short transaction lease (`status = 'verifying'`) per M4; no DB locks held during S3 network calls.
- [x] Verify actual object exists, belongs to issued product/upload, satisfies size policy, and matches expected magic bytes via bounded ranged GET (bytes 0-15).
- [x] Publish validated bytes to immutable final key via `CopyObjectCommand`.
- [x] In final short DB transaction, acquire M5 product row lock (`SELECT ... FOR UPDATE`), recheck upload lease, attach image once, and update upload record to `'completed'`.
- [x] Enforce object/upload uniqueness in DB via `idx_media_uploads_final_key`.
- [x] Align canonical key parser with verified UUID and seed (`primary|secondary`) keys.
- [x] Replay after lost response returns the same result identity with HTTP 200.
- [x] Handle competing confirmation, expiry, and deletion cleanly.

---

## Step 4 — Serialize image mutations and preserve catalog behavior

- [x] Confirm, primary changes, reorder, delete, and soft-delete use product row locks (`SELECT product_id FROM products WHERE product_id = $1 FOR UPDATE`).
- [x] Recompute preserved fields from the locked row.
- [x] Retain `idx_product_images_single_primary` constraint; serialized transactions preserve single-primary invariant cleanly.
- [x] Coordinate lock order with Fix 8 protocols.
- [x] Preserve at-most-one-primary; soft deactivation leaves objects intact.

---

## Step 5 — Make deletion and cleanup recoverable

- [x] In one DB transaction, lock product, verify references, detach image row, and persist durable cleanup job into `media_cleanup_jobs`.
- [x] Return clean HTTP 200 response upon deletion transaction commit.
- [x] Worker rechecks final-key ownership, remaining references, and seed protection (`isProtectedSeedKey`) before executing S3 `DeleteObjectCommand`. Shared seed keys are protected.
- [x] Failed S3 deletion retains retryable job with exponential backoff (`attempts * 30s`) and max 5 attempts; 404 is an idempotent success.
- [x] Handle duplicate deletion requests gracefully.

---

## Step 6 — Complete read contracts and compatibility tests

- [x] Product/admin list: `primary_image_url: string | null`; product/admin detail images: `image_url: string`.
- [x] Cart read contract verified with D (`primary_image_url: string | null`).
- [x] Legacy read URLs (`GET /api/images/:id` and `/api/products/images/:id`) preserved with 302 redirect.
- [x] Standalone product validation tests pass (5/5).
- [x] Real PostgreSQL concurrency tests (`test:media-concurrency`) pass (3/3).
- [x] S3 live infrastructure tests (`test:s3`) pass (5/5).

---

## Definition of Done

- [x] T06–T13/T15 pass, including malformed inputs, unauthorized roles, simultaneous primary writes, replay idempotency, and restart recovery.
- [x] Backend tests (19 suites, 162 passed), `test:product` (5/5 passed), `test:s3` (5/5 passed), and `test:media-concurrency` (3/3 passed) all pass.
- [x] Backend changed-file lint passes with 0 errors.
- [x] Current successful response fields and both read routes preserved; cart URL contract verified.
- [x] Upload/cleanup schema (`V36`) and grants documented.
- [x] Ready for Member B & A to integrate direct frontend upload in Fix 6.4.
