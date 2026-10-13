# Fix 1.3: Apparel Variant Matrix Completeness

> **Parent Group:** [Fix 1: Customer Account & Storefront UX](fix1-customer-account-storefront.md)
> **Status:** Complete
> **Assigned To:** Member C (Backend Seed Data) & Member A (Storefront Product Page UI)
> **Depends On:** —
> **Blocks:** —
> **Priority:** Medium
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (tables: `product_variants`, `variant_attributes`, `variant_attribute_values`)

---

## Problem Description

On several clothing products (such as `WCL-003` - Women's Clothing), selecting legitimate combinations like "Dove Gray" + "Size M" results in a disabled *"Unavailable Combination"* state. Customers are confused why color and size chips are clickable if the variant cannot be purchased.

---

## Root Cause

1. **Seed Data Incompleteness:** In `backend/db/seed/04_products.sql` and `05_catalog_links.sql`, only partial combinations were seeded:
   - `WCL-003-OAT-M`: Oatmeal Heather / Size M
   - `WCL-003-GRY-L`: Dove Gray / Size L
   - There are no rows for (Dove Gray + Size M) or (Oatmeal Heather + Size L).
2. **UI Option Availability:** In `frontend/src/app/products/[id]/page.tsx`, the attribute options are derived as flat sets across all variants. The UI does not indicate which combinations are unavailable before the user clicks them.

---

## Tasks

### Backend & Seed Data — Member C
- [x] In `backend/db/seed/04_products.sql`:
  - Add missing apparel variant combinations for clothing products (`WCL-001`, `WCL-002`, `WCL-003`, `WCL-004`, `MCL-001`, etc.) so each advertised color exists in standard sizes (S, M, L).
- [x] In `backend/db/seed/05_catalog_links.sql`:
  - Insert corresponding `variant_attribute_values` mapping all new SKUs to their respective Color and Size attributes.

### Storefront UI — Member A
- [x] In `frontend/src/app/products/[id]/page.tsx`:
  - Improve the attribute selector UX: When a user selects a color (e.g. "Dove Gray"), compute which sizes actually exist for that color.
  - Visually disable or style (e.g., strikethrough/opacity-40) options that would lead to an unavailable combination, or auto-switch to a valid combination.

---

## Affected Files

- `backend/db/seed/04_products.sql`
- `backend/db/seed/05_catalog_links.sql`
- `frontend/src/app/products/[id]/page.tsx`

---

## Definition of Done

1. Standard clothing items have complete variant coverage for all advertised colors and sizes in the seed database.
2. Selecting any visible combination works seamlessly, displays its price and stock, and allows adding to cart.
3. If any combination is genuinely out of stock or unmanufactured, the UI clearly reflects availability before clicking.

## Key Decisions & Notes

- Added 28 apparel variants. Tops, outerwear, and leggings now have S/M/L for both colors; trousers and jeans retain their numeric sizes and cover both colors in each advertised size.
- New variants use the product's existing price. Electric Blue jackets and Sage Green leggings remain out of stock, matching their existing variants.
- Selecting an option that does not pair with another selected attribute switches to a real variant. The selector fades sold out options and combinations unavailable with the current selection.
- These changes update fresh seed data. Databases already seeded need a reseed or a separate data migration to acquire the additional variants.
