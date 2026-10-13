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

---

## Related Fixes & Patches

- **[Fix 4.1: Staff Cart & Purchase Policy Enforcement](../../Fixes/Fix4-Role-Permissions-Operations/fix4.1-staff-cart-purchase-restriction.md):** Suppresses the cart navbar icon for administrative and employee accounts, and pops up an informational policy modal when staff attempts to add items to cart.
- **[Fix 3.4: Product Image Upload, Serving & Frontend Preview](../../Fixes/Fix3-Admin-Catalog-Media/fix3.4-product-image-upload-serving.md):** Connects cart line item image thumbnails to `/api/images/:id` so product photos appear in the shopping bag.

## Fix 8 follow-up

Database integrity and concurrency work is tracked separately in [Fix 8](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 8.9: Checkout & Admin Conflict Handling](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8.9-checkout-admin-ui.md)

Read the Fix 8 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
