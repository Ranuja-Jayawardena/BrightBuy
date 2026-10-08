# Phase 4.2: Image Serving Endpoint

> **Parent Phase:** [Phase 4: Product Catalog & Browsing](phase4-product-catalog-browsing.md)
> **Status:** Complete
> **Assigned To:** C
> **Depends On:** Phase 2
> **Blocks:** 4.3, 4.4
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Serve product images stored as `BYTEA` in PostgreSQL, with HTTP caching.

---

## Tasks

- [x] `GET /api/images/:id` — stream `image_data` from `product_images` with the correct `Content-Type`
- [x] Add `Cache-Control` and `ETag` headers; return `304 Not Modified` when the ETag matches
- [x] Never `SELECT *` on `product_images` anywhere else; only this endpoint reads `image_data`

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

- **MIME Detection via Magic Bytes:** Since `product_images` does not have a dedicated `mime_type` column, `imageService.detectMimeType` reads binary file signatures (magic bytes) to accurately identify PNG (`image/png`), JPEG (`image/jpeg`), GIF (`image/gif`), WebP (`image/webp`), and BMP (`image/bmp`), falling back to `application/octet-stream`.
- **ETag & 304 Handling:** Strong ETags are generated using an MD5 hash over the raw binary data. If the client sends a matching `If-None-Match` header, the server returns `304 Not Modified` with an empty body to save bandwidth.
- **Strict `image_data` Isolation:** `findImageDataById` in `imageModel.js` is the sole query in the codebase reading `image_data`. All other endpoints (`productModel.js`) only query metadata (`image_id`, `sort_order`, `is_primary`).


