# Phase 7.1: Product, Variant & Image Admin APIs

> **Fix 6 status correction (2026-10-13):** Current media contract correction: the multipart image upload section below is historical. Current source exposes presign/confirm, while the old UI upload call is incompatible. Fix 6.3 specifies the remaining safe lifecycle and Fix 6.4 the UI handoff. Historical completion of the other catalog operations is not S3 integration evidence. [Active Fix 6 guidance](../../Fixes/Fix6-Cloud-Media-Storage-S3/fix6-cloud-media-storage-s3.md).

> **Parent Phase:** [Phase 7: Inventory & Admin Dashboard](phase7-inventory-admin-dashboard.md)
> **Status:** Complete
> **Assigned To:** C
> **Depends On:** 3.2, 4.1
> **Blocks:** 7.5
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Let admins create and maintain products, their variants, and their images.

---

## Tasks

- [x] `GET /api/admin/products` — list **all** products (active and inactive) with search and pagination
- [x] `GET /api/admin/products/:id` — full product detail for editing (including inactive variants)
- [x] `POST /api/admin/products` — create a product with category assignments (single transaction)
- [x] `PUT /api/admin/products/:id` — update product details and category assignments
- [x] `DELETE /api/admin/products/:id` — soft-delete (`is_active = false`)
- [x] `POST /api/admin/products/:id/images` — upload images (multipart → BYTEA) with sort order and primary flag; validate file type and size
- [x] `PUT /api/admin/images/:id` — change sort order / primary flag
- [x] `DELETE /api/admin/images/:id` — remove an image
- [x] `POST /api/admin/products/:id/variants` — create a variant with attributes (create missing `variant_attributes` rows)
- [x] `PUT /api/admin/variants/:id` — update price, name, stock, attributes
- [x] `DELETE /api/admin/variants/:id` — soft-delete (`is_active = false`)
- [x] Protect all routes with `requireAuth` + `requireRole('admin')`

---

## API Contracts

### `POST /api/admin/products`
```
Request Body: { product_name, brand?, description?, base_sku, category_ids: [1, 3] }
Response 201: { product: { product_id, product_name, ... } }
Response 409: { error: "SKU already exists" }
```

### `POST /api/admin/products/:id/images`
```
Request: multipart/form-data with image file(s)
Body: { sort_order?, is_primary? }
Response 201: { image: { image_id, sort_order, is_primary } }
```

### `POST /api/admin/products/:id/variants`
```
Request Body: { variant_sku, variant_name?, price, stock_quantity, attributes: [{ attribute_name, attribute_value }] }
Response 201: { variant: { variant_id, variant_sku, ... } }
Response 409: { error: "Variant SKU already exists" }
```

---

## Definition of Done

- An admin can fully create a product (details, categories, images, variants) via the API.

---

## Key Decisions & Notes

- Added admin list/detail (`GET`) and image update (`PUT`) endpoints. The admin UI needs them, but they were missing from the original plan.
- Implemented under `/api/admin` with raw `pg` queries, transaction-wrapped product/category and variant/attribute writes, and route-local multipart parsing for image upload.
- Since migration V27, product and variant update queries rely on PostgreSQL triggers to set `updated_at`; they no longer set it explicitly.

---

## Related Fixes & Patches

- **[Fix 3.2: Product Status Switch & Reactivation Flow](../../Fixes/Fix3-Admin-Catalog-Media/fix3.2-product-status-toggle.md):** Adds `PATCH /api/admin/products/:id/status` allowing bidirectional activation toggling instead of one-way deletion.
- **[Fix 3.4: Product Image Upload, Serving & Frontend Preview](../../Fixes/Fix3-Admin-Catalog-Media/fix3.4-product-image-upload-serving.md):** Hardens multipart image upload processing, binary BYTEA storage, and public image URL consistency.
- **[Fix 6: Cloud Object Storage (AWS S3) & Media Delivery](../../Fixes/Fix6-Cloud-Media-Storage-S3/fix6-cloud-media-storage-s3.md):** Replaces binary BYTEA admin upload buffering with AWS S3 pre-signed direct upload APIs and direct PostgreSQL `image_url` storage.

## Fix 8 follow-up

Database integrity and concurrency work is tracked separately in [Fix 8](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 8.2: Catalog Timestamp Migration Verification](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8.2-catalog-timestamp-verification.md)
- [Fix 8.8: Manual Inventory Adjustment Audit](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8.8-inventory-audit.md)
- [Fix 8.9: Checkout & Admin Conflict Handling](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8.9-checkout-admin-ui.md)

Read the Fix 8 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
