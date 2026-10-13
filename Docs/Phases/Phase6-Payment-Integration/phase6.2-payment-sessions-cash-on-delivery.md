# Phase 6.2: Payment Sessions & Cash on Delivery

> **Parent Phase:** [Phase 6: Payment Integration](phase6-payment-integration.md)
> **Status:** Complete
> **Assigned To:** D
> **Depends On:** 5.3
> **Blocks:** 6.3, 6.4

---

## Goal

Start a payment for an order, either through Lemon Squeezy (card) or as Cash on Delivery.

---

## Tasks

- [x] `POST /api/payments/create-session` — check that the order belongs to the customer and is unpaid
- [x] Card: create a Lemon Squeezy checkout session (pass `order_id` as custom data) and return the checkout URL
- [x] Card: create a `payments` row with `payment_status = 'pending'`
- [x] COD: skip Lemon Squeezy and create a `payments` row with `payment_status = 'cod_pending'`
- [x] Reject payments for orders that are already paid or cancelled

---

## API Contracts

### `POST /api/payments/create-session`
```
Request Body: { order_id, payment_method: "card" | "cod" }
Response 200 (card): { checkout_url: "https://checkout.lemonsqueezy.com/...", payment_id }
Response 200 (cod): { message: "COD order confirmed", payment_id }
Response 400: { error: "Order already paid" }
Response 404: { error: "Order not found" }
```

---

## Definition of Done

- Card orders get a working Lemon Squeezy test checkout URL; COD orders are recorded immediately.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

## Fix 7 follow-up

Database integrity and concurrency work is tracked separately in [Fix 7](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 7.4: Order Transitions & Payment Event Consistency](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7.4-order-payment-consistency.md)

Read the Fix 7 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
