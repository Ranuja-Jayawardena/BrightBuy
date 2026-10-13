# Phase 5.5: Address Management & Checkout UI

> **Parent Phase:** [Phase 5: Shopping Cart & Checkout](phase5-shopping-cart-checkout.md)
> **Status:** Complete
> **Assigned To:** B
> **Depends On:** 5.2, 5.3, 5.4
> **Blocks:** 6.4

---

## Goal

Let customers manage addresses and place an order through a clear checkout flow.

---

## Tasks

- [x] Address management page/section — list, add, edit, delete, set default (city picker from `GET /api/cities`)
- [x] Checkout page (`/checkout`) — choose an address (or add a new one inline), choose delivery mode, see the estimated delivery time
- [x] Order review summary (items, totals) before placing the order
- [x] "Place Order" button → `POST /api/orders`, with clear handling of stock errors
- [x] Order confirmation page — show order details after a successful order

---

## Definition of Done

- A customer can go from cart → checkout → confirmation with a saved or new address.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

---

## Related Fixes & Patches

- **[Fix 1.4: Address Form Cancel Action & UI Feedback](../../Fixes/Fix1-Customer-Account-Storefront/fix1.4-address-form-cancel-feedback.md):** Resolves cancel callback in address creation/editing modal during checkout, cleanly restoring previous state without side-effects.
- **[Fix 4.3: Order Delivery Mode & Courier Tracking Code Fulfillment](../../Fixes/Fix4-Role-Permissions-Operations/fix4.3-order-delivery-mode-fulfillment.md):** Aligns delivery mode selector (Store Pickup vs Home Delivery) with required address inputs and shipping calculations.

## Fix 7 follow-up

Database integrity and concurrency work is tracked separately in [Fix 7](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 7.9: Checkout & Admin Conflict Handling](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7.9-checkout-admin-ui.md)

Read the Fix 7 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
