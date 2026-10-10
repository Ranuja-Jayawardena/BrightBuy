# Phase 7.2: Category Admin APIs

> **Parent Phase:** [Phase 7: Inventory & Admin Dashboard](phase7-inventory-admin-dashboard.md)
> **Status:** Complete
> **Assigned To:** C
> **Depends On:** 3.2
> **Blocks:** 7.5
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Let admins manage the category tree.

---

## Tasks

- [x] `GET /api/admin/categories` — full tree including inactive categories
- [x] `POST /api/admin/categories` — create a category (optional parent)
- [x] `PUT /api/admin/categories/:id` — update name/parent (prevent circular parent chains)
- [x] `DELETE /api/admin/categories/:id` — soft-delete (`is_active = false`)
- [x] Protect all routes with `requireAuth` + `requireRole('admin')`

---

## API Contracts

### `POST /api/admin/categories`
```
Request Body: { category_name, parent_category_id? }
Response 201: { category: { category_id, category_name, parent_category_id, is_active } }
```

### `PUT /api/admin/categories/:id`
```
Request Body: { category_name?, parent_category_id?, is_active? }
Response 200: { category: { ... } }
Response 400: { error: "Circular category hierarchy" }
```

---

## Definition of Done

- Admins can create, rename, re-parent, and deactivate categories safely.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

- Category responses are assembled into a nested `children` tree while retaining inactive nodes and their relationships.
- Re-parenting uses a recursive ancestor query and returns `400 { error: "Circular category hierarchy" }` when the target is its own descendant.

