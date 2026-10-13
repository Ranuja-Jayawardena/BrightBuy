# Fix 2.1: Price Range Filtering & Composite Indexing

> **Parent Group:** [Fix 2: Search & Filter Performance](fix2-search-filter-performance.md)
> **Status:** In Progress (C backend complete; A UI pending)
> **Assigned To:** Member C (Backend Models & DB Migration) & Member A (Storefront Filter UI)
> **Depends On:** —
> **Blocks:** —
> **Priority:** High
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (tables: `products`, `product_variants`)

---

## Problem Description

Customers currently have no way to filter products by price range (e.g., $50 to $200). Furthermore, the database table `product_variants` only has an index on `product_id`, so range queries against variant prices would require sequential table scans across all variant rows.

---

## Technical Solution & DB Indexing

### 1. Database Index
Create a Flyway migration `V22__add_product_price_index.sql`:
```sql
-- Partial composite index for price range queries on active variants
CREATE INDEX idx_product_variants_active_price 
ON product_variants (product_id, price) 
WHERE is_active = true;

CREATE INDEX idx_product_variants_price_active 
ON product_variants (price) 
WHERE is_active = true;
```
This enables PostgreSQL to efficiently evaluate:
```sql
EXISTS (
  SELECT 1 
  FROM product_variants pv 
  WHERE pv.product_id = p.product_id 
    AND pv.is_active = true 
    AND pv.price >= $min_price 
    AND pv.price <= $max_price
)
```

### 2. Query Builder in `productModel.js`
In `backend/src/models/productModel.js`, support `min_price` and `max_price`:
- Validate numeric non-negative values.
- Append condition to both `countQuery` and `dataQuery`:
  - If `min_price` is present: `AND v.max_price >= $min_price` (or via `EXISTS`).
  - If `max_price` is present: `AND v.min_price <= $max_price`.

---

## Tasks

### Backend & DB — Member C
- [x] Create Flyway migration `backend/db/migrations/V22__add_product_price_index.sql`.
- [x] Update `backend/src/models/productModel.js` to accept `min_price` and `max_price` filter parameters.
- [x] Validate `req.query.min_price` and `req.query.max_price` through the product service used by `productController.js`.
- [x] Update `Docs/Database/DB_Schema.md` with the new indexes.

### Storefront UI — Member A
- [ ] In `frontend/src/components/catalog/ProductFilterSidebar.tsx`:
  - Add a Price Range filter component with Min and Max input fields and/or a dual slider.
  - Debounce input updates or provide an "Apply" button.
  - Sync with URL query parameters (`?min_price=25&max_price=150`).
- [ ] In `frontend/src/app/products/page.tsx`:
  - Pass `min_price` and `max_price` from URL query to `productService.getProducts()`.
  - Display active price filter pill with clear button.

---

## API Contracts

### `GET /api/products?min_price=50&max_price=250`
```http
GET /api/products?min_price=50&max_price=250&page=1&limit=12
```
**Response 200:**
```json
{
  "products": [
    {
      "product_id": 1,
      "product_name": "Wireless Noise-Canceling Headphones",
      "brand": "Sonus",
      "min_price": "149.99",
      "max_price": "199.99",
      "variant_count": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total_count": 14,
    "total_pages": 2
  }
}
```

---

## Affected Files

- `backend/db/migrations/V22__add_product_price_index.sql`
- `backend/src/models/productModel.js`
- `backend/src/controllers/productController.js`
- `frontend/src/app/products/page.tsx`
- `frontend/src/components/catalog/ProductFilterSidebar.tsx`
- `Docs/Database/DB_Schema.md`

---

## Definition of Done

1. Flyway migration runs cleanly and creates the index.
2. Filtering by min and max prices returns only products with variants in that range.
3. Pagination count accurately reflects price-filtered results.
4. Storefront displays responsive price inputs with seamless URL sync.

## Implementation Note

The API includes products only when at least one active variant falls within the requested range. Product card min/max prices and variant counts are calculated from those matching variants. The storefront controls remain assigned to Member A. The migration file is ready but has not been applied to a database in this checkout.
