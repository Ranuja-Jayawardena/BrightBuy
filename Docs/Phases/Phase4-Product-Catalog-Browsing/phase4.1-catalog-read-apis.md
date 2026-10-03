# Phase 4.1: Catalog Read APIs

> **Parent Phase:** [Phase 4: Product Catalog & Browsing](phase4-product-catalog-browsing.md)
> **Status:** Not Started
> **Assigned To:** C
> **Depends On:** Phase 2
> **Blocks:** 4.3, 4.4, 7.1
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Expose public, read-only APIs for products and categories using raw SQL (`pg`).

---

## Tasks

- [ ] `GET /api/products` — pagination, search, filter by category (via `product_categories`) and brand, sorting
- [ ] Category filter includes products from child categories
- [ ] `GET /api/products/:id` — product detail with variants, attributes, stock levels, and image **metadata** (no binary data)
- [ ] `GET /api/categories` — category tree (parent → children)
- [ ] Filter out `is_active = false` products, variants, and categories on every customer-facing endpoint
- [ ] Use parameterized queries only (`$1, $2`)

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

_Record any implementation decisions, trade-offs, or deviations from the plan here._

