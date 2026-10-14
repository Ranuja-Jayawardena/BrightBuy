# Fix 2.2: Search Autocomplete & pg_trgm GIN Indexing

> **Parent Group:** [Fix 2: Search & Filter Performance](fix2-search-filter-performance.md)
> **Status:** Complete
> **Assigned To:** Member C (Backend Models & Search Index) & Member A (Storefront Search Dropdown UI)
> **Depends On:** —
> **Blocks:** —
> **Priority:** High
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (tables: `products`, `categories`)

---

## Problem Description

Currently, the search bar has no autocomplete suggestions. When typing in the search bar, users must complete typing and press enter blindly. Additionally, the backend search query performs a full sequential scan using `ILIKE '%...%'` across `product_name`, `brand`, and `description`, which will degrade severely as catalog size expands.

---

## Technical Solution & Database Strategy

### 1. PostgreSQL `pg_trgm` Extension & GIN Indexes
PostgreSQL provides the `pg_trgm` extension for trigram matching, which supports fast indexed substring search and similarity matching:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_products_name_trgm 
ON products USING gin (product_name gin_trgm_ops);

CREATE INDEX idx_products_brand_trgm 
ON products USING gin (brand gin_trgm_ops);

-- The main catalog search also uses description ILIKE, so index it too.
CREATE INDEX idx_products_description_trgm
ON products USING gin (description gin_trgm_ops);
```

### 2. Suggestions API Query
```sql
SELECT 
  p.product_id,
  p.product_name,
  p.brand,
  (
    SELECT c.category_name 
    FROM product_categories pc 
    JOIN categories c ON c.category_id = pc.category_id 
    WHERE pc.product_id = p.product_id AND c.is_active = true 
    LIMIT 1
  ) AS category_name
FROM products p
WHERE p.is_active = true 
  AND (p.product_name ILIKE $1 OR p.brand ILIKE $1)
ORDER BY 
  similarity(p.product_name, $2) DESC,
  p.product_name ASC
LIMIT 6;
```

---

## Tasks

### Backend & DB — Member C
- [x] Create Flyway migration `backend/db/migrations/V23__add_search_trgm_index.sql`.
- [x] Implement `getSuggestions(query)` in `backend/src/models/productModel.js`.
- [x] Implement `GET /api/products/suggestions` in `backend/src/controllers/productController.js`:
  - Validate minimum query length (>= 2 characters).
  - Return `{ suggestions: { product_id, product_name, brand, category_name }[] }`.
- [x] Wire route into `backend/src/routes/productRoutes.js`.
- [x] Update `Docs/Database/DB_Schema.md`.

### Storefront UI — Member A
- [x] In `frontend/src/components/Navbar.tsx` and/or storefront search input:
  - Add debounced input hook (250ms).
  - Fetch suggestions from `/api/products/suggestions?q={query}` when query >= 2 chars.
  - Display elegant floating suggestions dropdown menu (product title, brand, category tag).
  - Keyboard navigation support (Arrow Up, Arrow Down, Enter to select, Escape to close).
  - Clicking a suggestion navigates directly to `/products/[id]` or triggers search.

---

## API Contracts

### `GET /api/products/suggestions?q=phon`
```http
GET /api/products/suggestions?q=phon
```
**Response 200:**
```json
{
  "suggestions": [
    {
      "product_id": 1,
      "product_name": "Wireless Noise-Canceling Headphones",
      "brand": "Sonus",
      "category_name": "Audio"
    },
    {
      "product_id": 5,
      "product_name": "Lumina Pro 5G Smartphone",
      "brand": "Lumina",
      "category_name": "Smartphones"
    }
  ]
}
```

---

## Affected Files

- `backend/db/migrations/V23__add_search_trgm_index.sql`
- `backend/src/models/productModel.js`
- `backend/src/controllers/productController.js`
- `backend/src/routes/productRoutes.js`
- `frontend/src/components/Navbar.tsx`
- `frontend/src/app/products/page.tsx`
- `Docs/Database/DB_Schema.md`

---

## Definition of Done

1. Migration runs and creates `pg_trgm` extension and GIN indexes without error.
2. Typing 2 or more letters in search bar displays relevant autocomplete suggestions in < 50ms.
3. Clicking a suggestion navigates to the target product.

## Implementation Note

The backend route is ready and covered by request tests. The `V23` migration adds partial GIN indexes for active product names, brands, and descriptions; it has not been applied to a database in this checkout. Member A's dropdown and the UI latency check remain open.

## Fix 8 follow-up

Database integrity and concurrency work is tracked separately in [Fix 8](../Fix8-Database-Integrity-Concurrency/fix8-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 8.10: Storefront & Report Regression Verification](../Fix8-Database-Integrity-Concurrency/fix8.10-storefront-report-regression.md)

Read the Fix 8 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
