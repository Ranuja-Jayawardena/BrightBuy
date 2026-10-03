# Phase 7.1: Product, Variant & Image Admin APIs

> **Parent Phase:** [Phase 7: Inventory & Admin Dashboard](phase7-inventory-admin-dashboard.md)
> **Status:** Not Started
> **Assigned To:** C
> **Depends On:** 3.2, 4.1
> **Blocks:** 7.5
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Let admins create and maintain products, their variants, and their images.

---

## Tasks

- [ ] `GET /api/admin/products` — list **all** products (active and inactive) with search and pagination
- [ ] `GET /api/admin/products/:id` — full product detail for editing (including inactive variants)
- [ ] `POST /api/admin/products` — create a product with category assignments (single transaction)
- [ ] `PUT /api/admin/products/:id` — update product details and category assignments
- [ ] `DELETE /api/admin/products/:id` — soft-delete (`is_active = false`)
- [ ] `POST /api/admin/products/:id/images` — upload images (multipart → BYTEA) with sort order and primary flag; validate file type and size
- [ ] `PUT /api/admin/images/:id` — change sort order / primary flag
- [ ] `DELETE /api/admin/images/:id` — remove an image
- [ ] `POST /api/admin/products/:id/variants` — create a variant with attributes (create missing `variant_attributes` rows)
- [ ] `PUT /api/admin/variants/:id` — update price, name, stock, attributes
- [ ] `DELETE /api/admin/variants/:id` — soft-delete (`is_active = false`)
- [ ] Protect all routes with `requireAuth` + `requireRole('admin')`

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

