# Fix 3.3: Category Active/Inactive Switch

> **Parent Group:** [Fix 3: Admin Catalog & Media Management](fix3-admin-catalog-media.md)
> **Status:** Complete
> **Assigned To:** Member B (Frontend Admin Categories UI)
> **Depends On:** —
> **Blocks:** —
> **Priority:** Medium
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (table: `categories`)

---

## Problem Description

In the category management tree (`/admin/categories`), when a category is deactivated via the delete button, it displays as "Inactive" (line-through text and red badge). However, there is no button or switch in the UI to reactivate it again.

---

## Root Cause

- The backend service `updateCategory` in `backend/src/services/adminCategoryService.js` **already supports `is_active`** (`if (body.is_active !== undefined) fields.is_active = body.is_active;`).
- However, `frontend/src/app/admin/categories/page.tsx` only renders a delete button that calls `DELETE /api/admin/categories/:id` (which sets `is_active = false`). It does not provide any UI control to call `PUT /api/admin/categories/:id` with `{ is_active: true }`.

---

## Tasks

### Frontend — Member B
- [x] In `frontend/src/app/admin/categories/page.tsx`:
  - [x] In `renderTree()`, replace or augment the delete icon button with an active/inactive `Switch` toggle component (or Toggle Button).
  - [x] When the switch is clicked:
    - [x] Send `PUT /api/admin/categories/:id` with `{ is_active: !node.is_active }`.
    - [x] Refresh the category tree or update local node state optimistically.
    - [x] Provide a toast or alert confirming status change.

---

## API Contracts

### `PUT /api/admin/categories/:id`
```http
PUT /api/admin/categories/3
Content-Type: application/json
Cookie: access_token=...

{
  "is_active": true
}
```
**Response 200:**
```json
{
  "category": {
    "category_id": 3,
    "category_name": "Audio",
    "parent_category_id": 1,
    "is_active": true
  }
}
```

---

## Affected Files

- `frontend/src/app/admin/categories/page.tsx`

---

## Definition of Done

1. Administrators can toggle any category between active and inactive with a switch control.
2. Inactive categories reactivated via the switch immediately reappear in the storefront categories navigation.
3. Subcategories under inactive parents maintain consistent hierarchy validation.
