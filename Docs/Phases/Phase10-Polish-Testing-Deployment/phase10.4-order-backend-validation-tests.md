# Phase 10.4: Order Backend Validation & Tests

> **Parent Phase:** [Phase 10: Polish, Testing & Deployment](phase10-polish-testing-deployment.md)
> **Status:** Complete
> **Assigned To:** D
> **Depends On:** Phase 5, 6, and 8 APIs
> **Blocks:** 10.6

---

## Tasks

- [x] Input validation on all cart, address, order, and payment endpoints
- [x] Use the shared [error response format](phase10-polish-testing-deployment.md#shared-contract-error-response-format)
- [x] Unit tests for stock deduction logic (atomic transactions, concurrent orders)
- [x] Unit tests for order placement (happy path + edge cases)
- [x] Integration tests for the cart → order → payment flow (card and COD)
- [x] Integration tests for email triggers on order events

---

## Definition of Done

- All D-owned endpoints validate input and pass their tests.

---

## Key Decisions & Notes

- **Input validation & error formatting:** Standardized error responses to `{ error, message, statusCode }` across cart, address, order, payment, and delivery endpoints. Added strict positive-integer validation for IDs and quantities, string trimming and max length boundaries for address fields, and guarded against inactive variants and insufficient stock.
- **Stock deduction & concurrency protection:** Verified that `orderModel.createOrder` sorts `variant_id`s in ascending order before acquiring `FOR UPDATE` row locks to prevent deadlocks under concurrent order placement. Ensured atomic rollback leaves stock and cart items untouched if any item in the order has insufficient stock or if the address does not belong to the customer.
- **Automated test suites:** Added 34 new automated tests across two suites:
  - `tests/orderStockAtomic.test.js` (11 tests): Unit tests verifying atomic transactions, stock deductions, main city (5 days) vs. non-main city (7 days) delivery ETA calculation, deadlock prevention lock ordering, and rollback edge cases.
  - `tests/orderFlowIntegration.test.js` (23 tests): Integration tests covering complete COD and Card checkout flows, input validation error shapes, Lemon Squeezy webhook signature verification and processing, and non-blocking email notification triggers on order events.
- **Node 25 test environment:** Updated `package.json` test script with `--localstorage-file=:memory:` to ensure seamless Jest execution on modern Node environments. All 6 Jest test suites (69 tests) and Node product tests pass with 0 ESLint errors.

## Fix 8 follow-up

Database integrity and concurrency work is tracked separately in [Fix 8](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 8.3: Cart Uniqueness & Checkout Concurrency](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8.3-cart-checkout-concurrency.md)
- [Fix 8.4: Order Transitions & Payment Event Consistency](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8.4-order-payment-consistency.md)
- [Fix 8.12: PostgreSQL Integration Tests & Controlled Rollout](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8.12-integration-rollout.md)

Read the Fix 8 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
