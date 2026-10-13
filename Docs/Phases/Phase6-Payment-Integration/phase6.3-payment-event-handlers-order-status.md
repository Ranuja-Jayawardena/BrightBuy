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

## Fix 7 follow-up

Database integrity and concurrency work is tracked separately in [Fix 7](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 7.4: Order Transitions & Payment Event Consistency](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7.4-order-payment-consistency.md)

Read the Fix 7 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
