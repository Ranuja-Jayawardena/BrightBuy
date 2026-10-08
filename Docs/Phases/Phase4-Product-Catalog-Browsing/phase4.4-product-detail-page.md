# Phase 4.4: Product Detail Page

> **Parent Phase:** [Phase 4: Product Catalog & Browsing](phase4-product-catalog-browsing.md)
> **Status:** Complete
> **Assigned To:** A
> **Depends On:** 4.1, 4.2, 3.4 (auth store + redirect wrapper)
> **Blocks:** 5.4 (B wires the Add to Cart call)

---

## Goal

Build the product detail page with an image gallery and variant selection.

---

## Tasks

- [x] Product detail page (`/products/[id]`) — name, brand, description, categories
- [x] Image gallery — multiple images from `product_images` ordered by `sort_order`, primary image first
- [x] Variant selector — choose by attributes (e.g. Color + Storage); updates price, SKU, and stock
- [x] Stock availability indicator (in stock / low stock / out of stock)
- [x] "Add to Cart" button — disabled when stock is zero; guests are redirected to `/login?redirect=...`
- [x] Expose an `onAddToCart(variantId, quantity)` hook point so B can wire the cart API in 5.4
- [x] 404 state for missing/inactive products
- [x] Responsive layout from mobile to desktop

---

## Definition of Done

- Selecting variants updates price/stock correctly; guests are redirected when they click Add to Cart.

---

## Key Decisions & Notes

- Used Zustand's `useAuthStore` to check authentication on "Add to Cart" click.
- Variants are resolved dynamically based on selected attributes.
- Image gallery defaults to `is_primary` and allows toggling through thumbnails via `/api/images/:id`.
_Record any implementation decisions, trade-offs, or deviations from the plan here._

