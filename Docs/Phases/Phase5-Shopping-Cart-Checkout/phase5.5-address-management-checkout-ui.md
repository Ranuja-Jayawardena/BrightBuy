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

