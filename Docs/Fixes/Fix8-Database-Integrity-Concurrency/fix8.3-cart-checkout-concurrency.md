# Fix 8.3: Cart Uniqueness & Checkout Concurrency

> **Parent:** [Fix 8](fix8-database-integrity-concurrency.md)
> **Status:** Complete
> **Assigned To:** D
> **Priority:** Critical
> **Depends On:** [8.1](fix8.1-contracts-preflight.md) D3/D8, migration allocation and lock order
> **Blocks:** 8.4 shared stock-lock contract, 8.8 lock integration, 8.9, 8.10, 8.12

## Read and preserve

[Phase 1.4](../../Phases/Phase1-Project-Foundation/phase1.4-customer-cart-schema.md), [5.1 cart API](../../Phases/Phase5-Shopping-Cart-Checkout/phase5.1-cart-apis.md), [5.3 order API](../../Phases/Phase5-Shopping-Cart-Checkout/phase5.3-order-placement-history-apis.md), and [Fix 4.1 staff restrictions](../Fix4-Role-Permissions-Operations/fix4.1-staff-cart-purchase-restriction.md).

Implementation files: `backend/src/models/cartModel.js`, `models/orderModel.js`, `controllers/cartController.js`, `controllers/orderController.js`, and their routes. B owns `frontend/src/store/useCartStore.ts`, `services/api.ts` and checkout UI integration in 8.9; hand off the contract first.

Keep `GET /api/cart`, `POST /api/cart/items`, `PUT/DELETE /api/cart/items/:id` and `POST /api/orders` route contracts except explicitly approved additive retry/version fields. Preserve customer ownership and the existing duplicate-item 409 behavior; do not silently turn adding an existing item into quantity addition.

## Failure cases Resolved

1. **Two `getOrCreateCart` calls both inserting:** Resolved with `V29` database constraint `UNIQUE(customer_id)` on `carts` and atomic `ON CONFLICT (customer_id) DO UPDATE SET customer_id = EXCLUDED.customer_id RETURNING cart_id`.
2. **Two checkout calls reading the same cart concurrently:** Resolved with Step 1 of the canonical transaction lock order: `SELECT cart_id FROM carts WHERE customer_id = $1 FOR UPDATE`. The second checkout blocks, then sees an empty cart and aborts cleanly without double-deduction.
3. **Cart edit between initial read and DELETE disappearing:** Resolved by enforcing the same logical gate on `addItem`, `updateItemQuantity`, and `removeItem` (`SELECT cart_id FROM carts WHERE cart_id = $1 FOR UPDATE`). Mutations serialize against checkout and cannot be wiped out unpurchased.
4. **Network retry after commit acting on refilled cart:** Resolved by D3 Request Identity Contract (`X-Idempotency-Key` and `order_idempotency_keys` durable mapping). Replays return original order with HTTP 200 without duplicate email jobs or deducting refilled items.

## Implementation tasks

- [x] Audit duplicate carts and references before a new UNIQUE(customer_id) migration. If dirty, stop enforcement and obtain a reviewed repair; do not drop cart items or silently sum quantities. (Verified: 0 duplicate carts exist; clean baseline confirmed).
- [x] Make cart creation atomic under that constraint. Ensure read/get-or-create concurrency also returns the same cart ID. (`getOrCreateCart` with atomic upsert).
- [x] Establish a per-customer/cart lock before reading checkout contents. Every add/update/remove operation must acquire the same logical gate and use one transaction/client; locking only checkout is insufficient. (`SELECT cart_id FROM carts WHERE cart_id = $1 FOR UPDATE`).
- [x] Re-read item existence, cart ownership, quantity, and relevant product/variant availability after obtaining the gate. Preserve existing authorization and final stock checks. Maintain a stable resource-lock order across D/C operations.
- [x] Keep order, item snapshots, delivery snapshot, stock deduction, and clearing the purchased cart in one transaction. Concurrent edits should either be included before checkout or survive/reject after checkout according to D3, never be acknowledged and silently lost.
- [x] Implement the D3 request identity contract with a database uniqueness rule and durable mapping to the created order. Same customer/key and same normalized request returns the original outcome; changed inputs with that key conflict. Bind replay lookup to the authenticated customer. (`order_idempotency_keys` table).
- [x] Document replay response status/shape, key retention, cart-version behavior, and compatibility for old clients. If temporary keyless clients are supported, state their reduced retry guarantees and still enforce cart serialization.
- [x] Prevent duplicate order-confirmation jobs on replay. Only the transaction that creates the order should cause the creation event; stable email event identity provides a further guard.
- [x] Use bounded handling for database deadlock/serialization errors. Never retry external side effects blindly, and never hold locks during email/provider network calls. (Retries for 40P01/40001 with exponential jitter).
- [x] Map expected duplicate/conflict outcomes via D8 and hand B the exact contract.

## Real PostgreSQL acceptance matrix

Verified against live PostgreSQL database with independent pg clients and Jest test suite `tests/cartCheckoutConcurrency.test.js`:

| Scenario | Required result | Verified Result |
| --- | --- | --- |
| Concurrent first cart reads/creates | One cart row, same customer mapping, no unhandled unique error | **Passed** (`cartModel.getOrCreateCart` concurrent 5x returns identical cart ID; 1 DB row) |
| Same cart checkout, ample stock | One order for that checkout/cart state and one stock deduction | **Passed** (Single order created; stock deducted exactly by quantity) |
| Same request key replay after commit/restart | Original order returned, cart refill untouched, no second email event | **Passed** (HTTP 200, `is_replay: true`, header `X-Idempotency-Replayed: true`, 0 duplicate emails) |
| Same key with changed address/mode/customer | Explicit conflict or ownership rejection; no data leak | **Passed** (HTTP 409 Conflict with `{ error: 'conflict', message: 'Idempotency key reused with different request parameters' }`) |
| Two customers buying last unit | One succeeds; stock never negative; loser has no partial order | **Passed** (Strict variant lock order `FOR UPDATE OF v`; winner succeeds, loser gets 400 Insufficient stock) |
| Add/update/remove while checkout waits | Documented serial outcome; no silently lost acknowledged edit | **Passed** (Customer cart lock serializes operations; waiting add creates new cart item post-checkout) |
| Checkout failure after some writes | Full rollback of order/items/delivery/stock/cart/request mapping | **Passed** (Clean ROLLBACK on invalid address or empty cart; zero orphan records) |
| Existing item added concurrently twice | One item, expected conflict response, unchanged quantity semantics | **Passed** (One 201 Created, second receives 409 Conflict, quantity preserved) |
| Staff/other customer's requests | Existing 403/ownership protections preserved | **Passed** (Staff receives 403 Forbidden on cart mutation; cross-customer access rejected) |

## Contract Handoff for Member B (Frontend Admin/Cart UI - Fix 8.9)

### 1. Header: `X-Idempotency-Key`
- **Location:** Request header `X-Idempotency-Key` on `POST /api/orders`.
- **Format:** Client-generated UUID v4 or unique string (up to 255 chars).
- **Generation:** Generate on frontend when customer clicks "Place Order" / initiates checkout. Retain key in state while awaiting response or retrying on network drops.

### 2. Response Shapes

#### New Order Created (First Request):
- **Status:** `201 Created`
```json
{
  "message": "Order placed successfully",
  "order": {
    "order_id": 501,
    "customer_id": 10,
    "total_amount": 199.48,
    "status": "pending",
    "order_date": "2026-10-13T18:20:00.000Z",
    "items": [
      { "variant_id": 1, "quantity": 2, "unit_price": 49.99 }
    ],
    "delivery": {
      "delivery_id": 701,
      "delivery_mode": "home_delivery",
      "estimated_delivery_days": 5
    }
  }
}
```

#### Idempotent Replay (Network Retry / Page Reload):
- **Status:** `200 OK`
- **Header:** `X-Idempotency-Replayed: true`
```json
{
  "message": "Order retrieved (idempotent replay)",
  "order": {
    "order_id": 501,
    "customer_id": 10,
    "total_amount": 199.48,
    "status": "pending",
    "items": [...],
    "delivery": {...}
  },
  "is_replay": true
}
```

#### Conflict Errors (D8 Mapping):
- **Reused Key with Different Parameters:**
  - **Status:** `409 Conflict`
  ```json
  {
    "error": "conflict",
    "message": "Idempotency key reused with different request parameters",
    "statusCode": 409
  }
  ```
- **Duplicate Cart Item Addition:**
  - **Status:** `409 Conflict`
  ```json
  {
    "error": "conflict",
    "message": "Item already in cart — use PUT to update quantity",
    "statusCode": 409
  }
  ```

## Definition of Done

- [x] Matrix passes against PostgreSQL, plus existing `orderStockAtomic`, `orderFlowIntegration`, and `memberDFixes` tests.
- [x] Migration preflight, lock order, and D3/D8 response examples are recorded and accepted by B.
- [x] Cart uniqueness does not get confused with checkout idempotency: both behaviors are independently verified.
