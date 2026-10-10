# Phase 6.3: Payment Event Handlers & Order Status

> **Parent Phase:** [Phase 6: Payment Integration](phase6-payment-integration.md)
> **Status:** Complete
> **Assigned To:** D
> **Depends On:** 6.1, 6.2
> **Blocks:** 8.2

---

## Goal

Update payments and orders when Lemon Squeezy reports a successful or failed payment.

---

## Tasks

- [x] Implement `handlePaymentSuccess` in `paymentService.js` — save `transaction_id`, set `payment_status = 'completed'`, move the order from `pending` → `paid` (one transaction)
- [x] Implement `handlePaymentFailure` — set `payment_status = 'failed'`; leave the order `pending` so the customer can retry
- [x] Ignore events for orders that are already paid (safe to receive twice)
- [x] Follow the exact function signatures in the [interface contract](phase6-payment-integration.md#shared-contract-webhook--payment-handler-interface)

---

## Definition of Done

- A completed Lemon Squeezy test payment marks the order `paid` end-to-end.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

