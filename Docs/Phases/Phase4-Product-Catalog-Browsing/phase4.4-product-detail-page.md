# Phase 4.4: Product Detail Page

> **Parent Phase:** [Phase 4: Product Catalog & Browsing](phase4-product-catalog-browsing.md)
> **Status:** Not Started
> **Assigned To:** A
> **Depends On:** 4.1, 4.2, 3.4 (auth store + redirect wrapper)
> **Blocks:** 5.4 (B wires the Add to Cart call)

---

## Goal

Build the product detail page with an image gallery and variant selection.

---

## Tasks

- [ ] Product detail page (`/products/[id]`) — name, brand, description, categories
- [ ] Image gallery — multiple images from `product_images` ordered by `sort_order`, primary image first
- [ ] Variant selector — choose by attributes (e.g. Color + Storage); updates price, SKU, and stock
- [ ] Stock availability indicator (in stock / low stock / out of stock)
- [ ] "Add to Cart" button — disabled when stock is zero; guests are redirected to `/login?redirect=...`
- [ ] Expose an `onAddToCart(variantId, quantity)` hook point so B can wire the cart API in 5.4
- [ ] 404 state for missing/inactive products
- [ ] Responsive layout from mobile to desktop

---

## Definition of Done

- Selecting variants updates price/stock correctly; guests are redirected when they click Add to Cart.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

