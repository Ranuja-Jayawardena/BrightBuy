# Phase 7.5: Admin Layout & Catalog Management UI

> **Parent Phase:** [Phase 7: Inventory & Admin Dashboard](phase7-inventory-admin-dashboard.md)
> **Status:** Complete
> **Assigned To:** B
> **Depends On:** 3.4 (admin route wrapper), 7.1, 7.2 (can start with mocks)
> **Blocks:** 7.6, 9.3

---

## Goal

Build the admin shell and the screens for managing products, variants, images, and categories.

---

## Tasks

- [x] Admin layout (`/admin`) with sidebar navigation: Products, Categories, Orders, Inventory, Employees, Reports
- [x] Reports sidebar entry is a placeholder route that A fills in during Phase 9
- [x] Product management page — table with search, create, edit, and soft-delete actions
- [x] Product edit form — name, brand, description, SKU, category multi-select
- [x] Image manager — drag-and-drop upload, reorder, set primary, delete
- [x] Variant manager (inside product edit) — price, SKU, stock, attributes
- [x] Category management page — tree view with create, edit, re-parent, soft-delete

---

## Definition of Done

- Admins can fully manage the catalog from the UI; the layout is ready for 7.6 and Phase 9 pages.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

---

## Related Fixes & Patches

- **[Fix 3.1: Admin Sidebar Sticky Layout & Viewport Containment](../../Fixes/Fix3-Admin-Catalog-Media/fix3.1-admin-sidebar-sticky-layout.md):** Converts sidebar into a sticky fixed-height navigation bar so it does not scroll out of view when scrolling long product tables.
- **[Fix 3.2: Product Status Switch & Reactivation Flow](../../Fixes/Fix3-Admin-Catalog-Media/fix3.2-product-status-toggle.md):** Replaces one-way delete button with an interactive active/inactive toggle switch.
- **[Fix 3.3: Category Status Switch & Hierarchical Propagation](../../Fixes/Fix3-Admin-Catalog-Media/fix3.3-category-status-toggle.md):** Replaces category delete button with active/inactive toggle switch and warning modal.
- **[Fix 3.4: Product Image Upload, Serving & Frontend Preview](../../Fixes/Fix3-Admin-Catalog-Media/fix3.4-product-image-upload-serving.md):** Fixes product image upload, displays instant local preview, and ensures uploaded images display correctly.

## Fix 8 follow-up

Database integrity and concurrency work is tracked separately in [Fix 8](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 8.9: Checkout & Admin Conflict Handling](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8.9-checkout-admin-ui.md)

Read the Fix 8 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
