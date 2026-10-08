# Phase 4.1: Catalog Read APIs

> **Parent Phase:** [Phase 4: Product Catalog & Browsing](phase4-product-catalog-browsing.md)
> **Status:** Complete
> **Assigned To:** C
> **Depends On:** Phase 2
> **Blocks:** 4.3, 4.4, 7.1
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Expose public, read-only APIs for products and categories using raw SQL (`pg`).

---

## Tasks

- [x] `GET /api/products` — pagination, search, filter by category (via `product_categories`) and brand, sorting
- [x] Category filter includes products from child categories
- [x] `GET /api/products/:id` — product detail with variants, attributes, stock levels, and image **metadata** (no binary data)
- [x] `GET /api/categories` — category tree (parent → children)
- [x] Filter out `is_active = false` products, variants, and categories on every customer-facing endpoint
- [x] Use parameterized queries only (`$1, $2`)

---

## API Contracts

### `GET /api/products`
```
Query Params: ?page=1&limit=12&search=keyword&category_id=5&brand=Samsung&sort=price_asc
Response 200: {
  products: [
    { product_id, product_name, brand, base_sku, primary_image_id,
      min_price, max_price, variant_count, categories: [{ category_id, category_name }] }
  ],
  pagination: { page, limit, total_count, total_pages }
}
```

### `GET /api/products/:id`
```
Response 200: {
  product: {
    product_id, product_name, brand, description, base_sku,
    images: [{ image_id, sort_order, is_primary }],
    variants: [
      { variant_id, variant_sku, variant_name, price, stock_quantity,
        attributes: [{ attribute_name, attribute_value }] }
    ],
    categories: [{ category_id, category_name }]
  }
}
Response 404: { error: "Product not found" }
```

### `GET /api/categories`
```
Response 200: {
  categories: [
    { category_id, category_name, parent_category_id,
      children: [{ category_id, category_name, ... }] }
  ]
}
```

---

## Definition of Done

- All three endpoints match the contracts and return only active data.

---

## Key Decisions & Notes

- **Pure Raw SQL:** Implemented exclusively with raw PostgreSQL queries using `pg` connection pool. No ORMs or query builders used.
- **Child Category Inheritance:** Implemented via a `WITH RECURSIVE category_tree` CTE that traverses the entire active descendant category tree when `category_id` is supplied in `GET /api/products`.
- **Strict Inactive Filtering:** Filtered out `is_active = false` on products, variants, and categories across all customer endpoints.
- **Image Metadata Decoupling:** `GET /api/products/:id` selects strictly `image_id, sort_order, is_primary` metadata without querying `BYTEA` `image_data`.
- **Architecture Layers:** Clean separation into `models/` (raw SQL queries), `services/` (business logic & response contract mapping), `controllers/` (Express HTTP route handlers), and `routes/`. Mounted under `/api/products` and `/api/categories` in `index.js`.

