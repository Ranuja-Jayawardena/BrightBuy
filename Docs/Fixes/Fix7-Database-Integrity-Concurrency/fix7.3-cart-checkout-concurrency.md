# Fix 7.3: Cart Uniqueness & Checkout Concurrency

> **Parent:** [Fix 7](fix7-database-integrity-concurrency.md)
> **Status:** Not Started
> **Assigned To:** D
> **Priority:** Critical
> **Depends On:** [7.1](fix7.1-contracts-preflight.md) D3/D8, migration allocation and lock order
> **Blocks:** 7.4 shared stock-lock contract, 7.8 lock integration, 7.9, 7.10, 7.12

## Read and preserve

[Phase 1.4](../../Phases/Phase1-Project-Foundation/phase1.4-customer-cart-schema.md), [5.1 cart API](../../Phases/Phase5-Shopping-Cart-Checkout/phase5.1-cart-apis.md), [5.3 order API](../../Phases/Phase5-Shopping-Cart-Checkout/phase5.3-order-placement-history-apis.md), and [Fix 4.1 staff restrictions](../Fix4-Role-Permissions-Operations/fix4.1-staff-cart-purchase-restriction.md).

Implementation files: backend/src/models/cartModel.js, models/orderModel.js, controllers/cartController.js, controllers/orderController.js, and their routes. B owns frontend/src/store/useCartStore.ts, services/api.ts and checkout UI integration in 7.9; hand off the contract first.

Keep GET /api/cart, POST /api/cart/items, PUT/DELETE /api/cart/items/:id and POST /api/orders route contracts except explicitly approved additive retry/version fields. Preserve customer ownership and the existing duplicate-item 409 behavior; do not silently turn adding an existing item into quantity addition.

## Failure cases

1. Two getOrCreateCart calls can both insert because carts.customer_id is not unique.
2. Two checkout calls can read the same cart before variant locks; both can create orders when stock is sufficient.
3. A cart edit between initial read and DELETE can disappear without being purchased.
4. A network retry after commit can otherwise produce an ambiguous result or act on a newly refilled cart.

## Implementation tasks

- [ ] Audit duplicate carts and references before a new UNIQUE(customer_id) migration. If dirty, stop enforcement and obtain a reviewed repair; do not drop cart items or silently sum quantities.
- [ ] Make cart creation atomic under that constraint. Ensure read/get-or-create concurrency also returns the same cart ID.
- [ ] Establish a per-customer/cart lock before reading checkout contents. Every add/update/remove operation must acquire the same logical gate and use one transaction/client; locking only checkout is insufficient.
- [ ] Re-read item existence, cart ownership, quantity, and relevant product/variant availability after obtaining the gate. Preserve existing authorization and final stock checks. Maintain a stable resource-lock order across D/C operations.
- [ ] Keep order, item snapshots, delivery snapshot, stock deduction, and clearing the purchased cart in one transaction. Concurrent edits should either be included before checkout or survive/reject after checkout according to D3, never be acknowledged and silently lost.
- [ ] Implement the D3 request identity contract with a database uniqueness rule and durable mapping to the created order. Same customer/key and same normalized request returns the original outcome; changed inputs with that key conflict. Bind replay lookup to the authenticated customer.
- [ ] Document replay response status/shape, key retention, cart-version behavior, and compatibility for old clients. If temporary keyless clients are supported, state their reduced retry guarantees and still enforce cart serialization.
- [ ] Prevent duplicate order-confirmation jobs on replay. Only the transaction that creates the order should cause the creation event; stable email event identity provides a further guard.
- [ ] Use bounded handling for database deadlock/serialization errors. Never retry external side effects blindly, and never hold locks during email/provider network calls.
- [ ] Map expected duplicate/conflict outcomes via D8 and hand B the exact contract.

## Real PostgreSQL acceptance matrix

Use independent pg clients and a barrier so both requests reach the contested path. Assert final rows, not just HTTP results.

| Scenario | Required result |
| --- | --- |
| Concurrent first cart reads/creates | One cart row, same customer mapping, no unhandled unique error |
| Same cart checkout, ample stock | One order for that checkout/cart state and one stock deduction |
| Same request key replay after commit/restart | Original order returned, cart refill untouched, no second email event |
| Same key with changed address/mode/customer | Explicit conflict or ownership rejection; no data leak |
| Two customers buying last unit | One succeeds; stock never negative; loser has no partial order |
| Add/update/remove while checkout waits | Documented serial outcome; no silently lost acknowledged edit |
| Checkout failure after some writes | Full rollback of order/items/delivery/stock/cart/request mapping |
| Existing item added concurrently twice | One item, expected conflict response, unchanged quantity semantics |
| Staff/other customer's requests | Existing 403/ownership protections preserved |

## Definition of Done

- [ ] Matrix passes against PostgreSQL, plus existing orderStockAtomic/orderFlowIntegration/memberDFixes tests.
- [ ] Migration preflight, lock order, and D3/D8 response examples are recorded and accepted by B.
- [ ] Cart uniqueness does not get confused with checkout idempotency: both behaviors are independently verified.

