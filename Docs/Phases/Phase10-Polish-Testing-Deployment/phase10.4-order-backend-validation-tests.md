# Phase 10.4: Order Backend Validation & Tests

> **Parent Phase:** [Phase 10: Polish, Testing & Deployment](phase10-polish-testing-deployment.md)
> **Status:** Not Started
> **Assigned To:** D
> **Depends On:** Phase 5, 6, and 8 APIs
> **Blocks:** 10.6

---

## Tasks

- [ ] Input validation on all cart, address, order, and payment endpoints
- [ ] Use the shared [error response format](phase10-polish-testing-deployment.md#shared-contract-error-response-format)
- [ ] Unit tests for stock deduction logic (atomic transactions, concurrent orders)
- [ ] Unit tests for order placement (happy path + edge cases)
- [ ] Integration tests for the cart → order → payment flow (card and COD)
- [ ] Integration tests for email triggers on order events

---

## Definition of Done

- All D-owned endpoints validate input and pass their tests.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

