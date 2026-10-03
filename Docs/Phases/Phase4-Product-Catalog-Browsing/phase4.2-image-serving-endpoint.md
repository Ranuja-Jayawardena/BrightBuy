# Phase 4.2: Image Serving Endpoint

> **Parent Phase:** [Phase 4: Product Catalog & Browsing](phase4-product-catalog-browsing.md)
> **Status:** Not Started
> **Assigned To:** C
> **Depends On:** Phase 2
> **Blocks:** 4.3, 4.4
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Serve product images stored as `BYTEA` in PostgreSQL, with HTTP caching.

---

## Tasks

- [ ] `GET /api/images/:id` — stream `image_data` from `product_images` with the correct `Content-Type`
- [ ] Add `Cache-Control` and `ETag` headers; return `304 Not Modified` when the ETag matches
- [ ] Never `SELECT *` on `product_images` anywhere else; only this endpoint reads `image_data`

---

## API Contracts

### `GET /api/images/:id`
```
Response 200: Binary image data with headers:
  Content-Type: image/jpeg (or appropriate type)
  Cache-Control: public, max-age=86400
  ETag: "<hash>"
Response 304: Not Modified (if ETag matches)
Response 404: { error: "Image not found" }
```

---

## Definition of Done

- Images render in the browser from `/api/images/:id`, and repeat requests return `304`.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

