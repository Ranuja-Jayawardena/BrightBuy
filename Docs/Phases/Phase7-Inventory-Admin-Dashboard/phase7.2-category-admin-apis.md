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

---

## Related Fixes & Patches

- **[Fix 3.3: Category Status Switch & Hierarchical Propagation](../../Fixes/Fix3-Admin-Catalog-Media/fix3.3-category-status-toggle.md):** Connects `PUT /api/admin/categories/:id` (`is_active: boolean`) to a reactive toggle switch with hierarchical checks on child categories.

## Fix 8 follow-up

Database integrity and concurrency work is tracked separately in [Fix 8](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 8.7: Category Hierarchy Integrity](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8.7-category-cycle-protection.md)

Read the Fix 8 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
