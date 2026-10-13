# Fix 1.2: Dynamic Brand Filtering & Seed Catalog Alignment

> **Parent Group:** [Fix 1: Customer Account & Storefront UX](fix1-customer-account-storefront.md)
> **Status:** Complete
> **Assigned To:** Member C (Backend Catalog & Seed Data) & Member A (Storefront Filter UI)
> **Depends On:** —
> **Blocks:** —
> **Priority:** Medium
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (table: `products`)

---

## Problem Description

1. In the storefront product catalog filter sidebar, popular brand filter buttons (e.g., "Samsung", "Apple", "Sony", "Nike", "Adidas", "LG") return 0 products when selected.
2. The storefront hardcodes a static list of brands that does not match the actual products seeded in the database (`PowerPulse`, `NovaTech`, `Lumina`, `Zenith`, `Sonus`, etc.).

---

## Root Cause

- In `frontend/src/app/products/page.tsx`, `const BRANDS = ["Samsung", "Apple", "Sony", "Nike", "Adidas", "LG"];` is hardcoded.
- In `backend/db/seed/04_products.sql`, the 40 seeded products use generic/fictional brand names and none of the brands in the hardcoded list exist in the database.
- There is no dynamic backend endpoint to query the unique brands present in the catalog.

---

## Tasks

### Backend & Seed Data — Member C
- [x] Align the displayed brands with the existing product seed by sourcing filter options from active catalog products. The seed's fictional brands retain their matching products, variants, and categories.
- [x] Implement `GET /api/products/brands` in `backend/src/controllers/productController.js`:
  - Query:
    ```sql
    SELECT DISTINCT brand
    FROM products
    WHERE brand IS NOT NULL AND is_active = true
    ORDER BY brand ASC;
    ```
  - Return `{ brands: string[] }`.
- [x] Expose route in `backend/src/routes/productRoutes.js`.

### Storefront UI — Member A
- [x] Update `frontend/src/app/products/page.tsx`:
  - Remove hardcoded `BRANDS` constant.
  - Fetch available brands dynamically from `/api/products/brands` on component mount (with graceful fallback to loaded catalog brands).
  - Render brand filter chips/list dynamically with count or clean labels.
  - Preserve active filter state in query params (`?brand=Apple`).

**Decision:** The hardcoded popular brand names were unrelated to the seeded fictional products. The storefront now lists the distinct active product brands returned by the API. Renaming products to real manufacturers would misrepresent the demo catalog and require reseeding existing databases.

---

## API Contracts

### `GET /api/products/brands`
```http
GET /api/products/brands
```
**Response 200:**
```json
{
  "brands": [
    "ApexGear",
    "Heritage",
    "Lumina"
  ]
}
```

---

## Affected Files

- `backend/src/models/productModel.js`
- `backend/src/services/productService.js`
- `backend/src/controllers/productController.js`
- `backend/src/routes/productRoutes.js`
- `frontend/src/app/products/page.tsx`
- `frontend/src/services/catalogService.ts`

---

## Definition of Done

1. Seed data contains products for all displayed brands.
2. Clicking any brand filter displays only products matching that brand.
3. Adding a new brand via admin product creation automatically appears in the storefront brand filter.
