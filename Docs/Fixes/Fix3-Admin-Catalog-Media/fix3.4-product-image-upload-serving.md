# Fix 3.4: Product Image Upload & Route Serving Fix

> **Fix 6 status correction (2026-10-13):** Historical BYTEA completion: the multipart endpoint/middleware and binary-body tests below describe the previous implementation. Current S3 backend removes that upload endpoint while the admin UI still calls it; upload integration is open in F6-01. Preserve this history, but follow Fix 6.3/6.4 for current contracts and acceptance. [Active Fix 6 guidance](../Fix6-Cloud-Media-Storage-S3/fix6-cloud-media-storage-s3.md).

> **Parent Group:** [Fix 3: Admin Catalog & Media Management](fix3-admin-catalog-media.md)
> **Status:** Complete
> **Assigned To:** Member C (Backend Middleware & Image Routes) & Member B (Admin Products UI)
> **Depends On:** —
> **Blocks:** —
> **Priority:** High
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (table: `product_images`)

---

## Problem Description

1. Uploading product images from the admin product edit page (`/admin/products/[id]`) fails or does not display the uploaded image.
2. Even when an image is saved in the database, the admin preview renders a broken image box.
3. During product creation (`/admin/products/new`), there is no image upload field available.

---

## Root Cause

1. **Incorrect Image URL Path:**
   - In `frontend/src/app/admin/products/[id]/page.tsx` line 402, the image tag points to:
     `<img src={'/api/products/images/${img.image_id}'} />`
   - In `backend/src/index.js` line 90, the image serving router is mounted at:
     `app.use('/api/images', imageRoutes);`
   - Requesting `/api/products/images/:id` results in an immediate **404 Not Found**, making all uploaded images appear broken.
2. **Custom Multipart Parser Edge Cases:**
   - `backend/src/middleware/multipartImageUpload.js` extracts boundaries with `contentType.match(/boundary=([^;]+)/i)` without stripping optional quotes (`boundary="..."`).
   - Using string conversions (`latin1`) and `part.replace(/\r\n$/, '')` can corrupt binary image files ending with CRLF sequences.
3. **Missing Product Creation Media Upload:**
   - `frontend/src/app/admin/products/new/page.tsx` contains no image upload UI; images can only be attached after product creation.

---

## Tasks

### Backend — Member C
- [x] In `backend/src/middleware/multipartImageUpload.js`:
  - Sanitize boundary extraction: `const boundary = boundaryMatch[1].replace(/^["']|["']$/g, '');`.
  - Fix multipart binary buffer slicing to preserve exact binary bytes without string trimming corruption.
  - Test upload of PNG, JPEG, and WebP binary files.
- [x] In `backend/src/routes/productRoutes.js`:
  - Add route alias `GET /images/:id` (redirecting or forwarding to `imageController.getImage`) so both `/api/images/:id` and `/api/products/images/:id` resolve cleanly.

### Frontend — Member B
- [x] In `frontend/src/app/admin/products/[id]/page.tsx`:
  - [x] Update image src to standard path: `/api/images/${img.image_id}`.
  - [x] Show proper loading spinner during image upload.
  - [x] Add primary image badge, sort order inputs, and deletion confirmation modal.
- [x] In `frontend/src/app/cart/page.tsx`:
  - [x] Update cart item image src from `/api/products/images/...` to `/api/images/...`.
- [x] (Optional Enhancement) In `frontend/src/app/admin/products/new/page.tsx`:
  - [x] Add informational notice explaining that product media galleries are configured after initial product creation, or allow primary image attachment on create.

---

## API Contracts

### `POST /api/admin/products/:id/images`
```http
POST /api/admin/products/5/images
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXyZ
Cookie: access_token=...

------WebKitFormBoundaryXyZ
Content-Disposition: form-data; name="image"; filename="phone-front.png"
Content-Type: image/png

<binary bytes>
------WebKitFormBoundaryXyZ
Content-Disposition: form-data; name="is_primary"

true
------WebKitFormBoundaryXyZ--
```
**Response 201:**
```json
{
  "image": {
    "image_id": 42,
    "product_id": 5,
    "sort_order": 0,
    "is_primary": true,
    "created_at": "2026-10-12T13:10:00.000Z"
  }
}
```

---

## Affected Files

- `backend/src/middleware/multipartImageUpload.js`
- `backend/src/routes/productRoutes.js`
- `frontend/src/app/admin/products/[id]/page.tsx`
- `frontend/src/app/cart/page.tsx`
- `frontend/src/app/admin/products/new/page.tsx`

---

## Definition of Done

1. Uploading PNG, JPEG, and WebP images succeeds without corruption or 400 errors.
2. Uploaded images display immediately in the product gallery and storefront.
3. Setting an image as primary or deleting an image works reliably.

## Verification

- Backend multipart tests cover PNG, JPEG, and WebP byte preservation, quoted boundaries, and malformed body rejection.
- Route tests confirm `/api/images/:id` and `/api/products/images/:id` serve identical image bytes.
- Backend suite: 116 tests passing.

---

## Cloud Storage Migration

- **[Fix 6: Cloud Object Storage (AWS S3) & Media Delivery](../Fix6-Cloud-Media-Storage-S3/fix6-cloud-media-storage-s3.md):** Replaces PostgreSQL BYTEA image storage with AWS S3 cloud storage, direct pre-signed URL uploads, and clean `image_url` schema.

## Fix 8 follow-up

Database integrity and concurrency work is tracked separately in [Fix 8](../Fix8-Database-Integrity-Concurrency/fix8-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 8.10: Storefront & Report Regression Verification](../Fix8-Database-Integrity-Concurrency/fix8.10-storefront-report-regression.md)

Read the Fix 8 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
