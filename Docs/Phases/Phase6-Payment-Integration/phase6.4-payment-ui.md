# Phase 6.4: Payment UI

> **Parent Phase:** [Phase 6: Payment Integration](phase6-payment-integration.md)
> **Status:** Not Started
> **Assigned To:** B
> **Depends On:** 6.2, 5.5
> **Blocks:** 10.2

---

## Goal

Let customers pick a payment method at checkout and complete payment.

---

## Tasks

- [ ] Payment method selection on the checkout page (Card via Lemon Squeezy / Cash on Delivery)
- [ ] After placing the order, call `POST /api/payments/create-session`
- [ ] Card: redirect to the returned `checkout_url`
- [ ] COD: go straight to the order confirmation page
- [ ] Payment success return page — poll/fetch `GET /api/orders/:id` until the status is `paid` (the webhook may arrive a few seconds later)
- [ ] Payment failed/cancelled return page with a "Retry payment" option

---

## Definition of Done

- Both the card flow and the COD flow work end-to-end from checkout to confirmation.

---

## Key Decisions & Notes

- New subphase. It was not in the original plan, which left the payment frontend unassigned.

