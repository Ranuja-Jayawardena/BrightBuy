# Phase 5.4: Cart UI & Add-to-Cart Wiring

> **Parent Phase:** [Phase 5: Shopping Cart & Checkout](phase5-shopping-cart-checkout.md)
> **Status:** Complete
> **Assigned To:** B
> **Depends On:** 5.1 (can start with mocks), 4.4
> **Blocks:** 5.5

---

## Goal

Build the cart experience and connect the product page's Add to Cart button to the cart API.

---

## Tasks

- [x] Zustand cart store — items, total, item count; actions call the 5.1 endpoints with `fetch`/Axios
- [x] Wire the "Add to Cart" button on the product detail page (A's `onAddToCart` hook from 4.4) to `POST /api/cart/items`
- [x] Cart item count badge in the navbar
- [x] Cart page or drawer (`/cart`) — product image, variant name, quantity controls, unit price, subtotals, total
- [x] Quantity increment/decrement, capped at available stock
- [x] Remove item, with confirmation
- [x] Empty cart state
- [x] "Proceed to Checkout" button → `/checkout`

---

## Definition of Done

- Customers can add, update, and remove items; the navbar badge and totals stay in sync.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

