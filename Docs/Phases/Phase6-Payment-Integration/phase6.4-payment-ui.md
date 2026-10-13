# Phase 6.4: Payment UI

> **Parent Phase:** [Phase 6: Payment Integration](phase6-payment-integration.md)
> **Status:** Complete
> **Assigned To:** B
> **Depends On:** 6.2, 5.5
> **Blocks:** 10.2

---

## Goal

Let customers pick a payment method at checkout and complete payment.

---

## Tasks

- [x] Payment method selection on the checkout page (Card via Lemon Squeezy / Cash on Delivery)
- [x] After placing the order, call `POST /api/payments/create-session`
- [x] Card: redirect to the returned `checkout_url`
- [x] COD: go straight to the order confirmation page
- [x] Payment success return page — poll/fetch `GET /api/orders/:id` until the status is `paid` (the webhook may arrive a few seconds later)
- [x] Payment failed/cancelled return page with a "Retry payment" option

---

## Definition of Done

- Both the card flow and the COD flow work end-to-end from checkout to confirmation.

---

## Key Decisions & Notes

- New subphase. It was not in the original plan, which left the payment frontend unassigned.

## Fix 7 follow-up

Database integrity and concurrency work is tracked separately in [Fix 7](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 7.9: Checkout & Admin Conflict Handling](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7.9-checkout-admin-ui.md)

Read the Fix 7 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
