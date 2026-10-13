# Fix 3.2: Product Active/Inactive Switch & Reactivation API

> **Parent Group:** [Fix 3: Admin Catalog & Media Management](fix3-admin-catalog-media.md)
> **Status:** Complete
> **Assigned To:** Member C (Backend Admin Product Service & Model) & Member B (Admin Products UI)
> **Depends On:** —
> **Blocks:** —
> **Priority:** High
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (table: `products`)

---

## Problem Description

In the admin products management table (`/admin/products`), when an admin clicks the delete button on a product, it marks the product as "Inactive" (soft delete). However:
1. There is no way to reactivate the product once it has been deactivated.
2. Having a permanent red trash icon for soft-deactivation is counterintuitive when inventory items often transition in and out of active circulation.

---

## Root Cause

1. In `backend/src/services/adminProductService.js`, `updateProduct()` only accepts `product_name`, `brand`, `description`, `base_sku`, and `category_ids`. It ignores `is_active`.
2. The only way to modify `is_active` in the backend is `DELETE /api/admin/products/:id` (`softDeleteProduct`), which only sets `is_active = false`. There is no SQL statement anywhere to set `is_active = true`.
3. In `frontend/src/app/admin/products/page.tsx`, the action column renders a red delete button with no toggle control.

---

## Tasks

### Backend — Member C
- [x] In `backend/src/models/adminProductModel.js`:
  - Update `updateProduct` query to support updating `is_active`.
  - Or add `setProductActiveStatus(productId, isActive)`.
- [x] In `backend/src/services/adminProductService.js`:
  - Allow `is_active` (boolean) in `updateProduct(productId, body)`.
  - Or implement `setProductStatus(productId, isActive)`.
- [x] In `backend/src/routes/adminRoutes.js`:
  - Ensure `PUT /api/admin/products/:id` supports `{ is_active: boolean }` and/or add `PATCH /api/admin/products/:id/status`.

### Frontend — Member B
- [x] In `frontend/src/app/admin/products/page.tsx`:
  - Replace the red delete button with a shadcn/ui `Switch` toggle component (or an Active/Inactive toggle button).
  - Handle toggle click with an optimistic update and call `PUT /api/admin/products/:id` with `{ is_active: newStatus }`.
  - Provide toast/alert feedback on status toggle success and revert on error.

---

## API Contracts

### `PUT /api/admin/products/:id` (or `PATCH /api/admin/products/:id/status`)
```http
PUT /api/admin/products/12
Content-Type: application/json
Cookie: access_token=...

{
  "is_active": true
}
```
**Response 200:**
```json
{
  "product": {
    "product_id": 12,
    "product_name": "Lumina Pro 5G",
    "is_active": true,
    "updated_at": "2026-10-12T13:00:00.000Z"
  }
}
```

---

## Affected Files

- `backend/src/models/adminProductModel.js`
- `backend/src/services/adminProductService.js`
- `backend/src/controllers/adminProductController.js`
- `backend/src/routes/adminRoutes.js`
- `frontend/src/app/admin/products/page.tsx`
- `frontend/src/app/admin/products/[id]/page.tsx`

---

## Definition of Done

1. Deactivating an active product marks it inactive and removes it from the public storefront catalog.
2. Toggling an inactive product back to active reactivates it immediately and restores it to the public catalog.
3. The admin products table displays a responsive toggle switch with immediate visual feedback.

## Fix 8 follow-up

Database integrity and concurrency work is tracked separately in [Fix 8](../Fix8-Database-Integrity-Concurrency/fix8-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 8.2: Catalog Timestamp Migration Verification](../Fix8-Database-Integrity-Concurrency/fix8.2-catalog-timestamp-verification.md)
- [Fix 8.8: Manual Inventory Adjustment Audit](../Fix8-Database-Integrity-Concurrency/fix8.8-inventory-audit.md)

Read the Fix 8 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
