# Fix 8.4: Order Transitions & Payment Event Consistency

> **Parent:** [Fix 8](fix8-database-integrity-concurrency.md)
> **Status:** Complete
> **Assigned To:** D (implementation), E (webhook security review), C (admin order ownership handoff)
> **Priority:** Critical
> **Depends On:** [8.1](fix8.1-contracts-preflight.md) D1/D2/D8; [8.3](fix8.3-cart-checkout-concurrency.md) shared lock contract
> **Blocks:** 8.5 financial/writer constraints, 8.9, 8.10, 8.11, 8.12

## Read and preserve

[Phase 6 overview/interface](../../Phases/Phase6-Payment-Integration/phase6-payment-integration.md), [6.1 webhooks](../../Phases/Phase6-Payment-Integration/phase6.1-webhook-infrastructure.md), [6.2 sessions/COD](../../Phases/Phase6-Payment-Integration/phase6.2-payment-sessions-cash-on-delivery.md), [6.3 event handlers](../../Phases/Phase6-Payment-Integration/phase6.3-payment-event-handlers-order-status.md), [7.3 admin orders](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.3-order-delivery-admin-apis.md), [8.2 email](../../Phases/Phase8-Email-Notifications/phase8.2-email-triggers-integration.md), and [Fix 4.3](../Fix4-Role-Permissions-Operations/fix4.3-order-delivery-mode-fulfillment.md).

Files: `controllers/paymentController.js`, `controllers/webhookController.js`, `services/paymentService.js`, `services/adminOrderService.js`, `models/adminOrderModel.js`, `services/notificationService.js`, `services/emailQueue.js`. All are under `backend/src`.

## Failure Cases Resolved

1. **Stale/late webhook regressing fulfillment or resurrecting cancelled orders:** Resolved by Decision D2 rules. Orders in `cancelled` stay `cancelled` with an audit notice in `payment_reconciliation_logs` (`late_payment_on_cancelled_order`). Orders in `shipped` or `delivered` stay in their fulfillment state without regression.
2. **Stale failure webhook demoting completed payments:** Resolved by checking payment state under lock; failure events arriving for `completed` payments are ignored without demotion.
3. **In-memory webhook deduplication loss across restarts:** Replaced in-memory Set with durable PostgreSQL table `webhook_events`. Event processing and marker are recorded atomically.
4. **Invalid order state transitions:** Enforced in PostgreSQL database via trigger `trg_enforce_order_status_transition` on `orders` (BEFORE UPDATE OF status) mapping to named code `P0001` and mapped to HTTP 400.
5. **Slow payment session creation resetting completed payment to pending:** In `paymentController.createSession`, session creation is blocked if payment is already `completed`. Post-network validation ensures state is not overwritten.
6. **Concurrent stock restoration on admin cancellation:** Enforces ascending variant lock order `FOR UPDATE OF product_variants` and sums quantities per variant with CTE `WITH item_sums AS (SELECT variant_id, SUM(quantity)::int AS qty ...)` to restore stock cleanly once.

## Tasks

- [x] Finalize the D1 payment-row/attempt model and D2 transition/event matrix, with real sanitized event examples. Publish response compatibility to B and reporting implications to A/C.
- [x] For admin status changes, acquire the order lock then validate the current state inside the same transaction. Preserve same-transaction stock restoration, with one owner and once-only behavior. Aggregate quantities per variant if legacy order data contains repeated variant lines; do not assume UPDATE ... FROM sums multiple matches.
- [x] Add a named database order-transition guard matching D2. Handle unchanged status deliberately. Map its rejection to D8; do not let it become an unexplained 500. (`trg_enforce_order_status_transition`).
- [x] On success, validate local ownership/correlation, payment method, provider identity, amount units and currency against the expected payment. Persist discrepancies for reconciliation instead of marking arbitrary orders paid. (`payment_reconciliation_logs`).
- [x] Do not regress shipped/delivered to paid or resurrect cancelled orders. Preserve a durable record of genuine late money events and their reconciliation outcome; transaction rollback alone must not erase the only record.
- [x] Process failure only for the identified matching attempt and permitted previous states. A stale/unrelated failure must not demote a completed payment or change another attempt.
- [x] Give refunds a separate explicit branch per D2. Do not silently ignore genuine refunds when adding a completed-payment guard. (`handlePaymentRefund`).
- [x] Replace reliance on the process-local set with durable event deduplication using a verified event identity. Same event on two workers must be applied once; distinct events for the same transaction must not all be discarded as duplicates. (`webhook_events` table).
- [x] Couple the durable processed marker and business updates in one transaction. Mark an event complete only after successful processing; retries after rollback remain possible. Keep signature verification before trusting event data.
- [x] Coordinate session creation/retry with current order/payment state; a slow provider response must not reset a now-completed payment to pending or insert duplicates. Network calls run outside database locks, with state revalidation afterwards.
- [x] Once provider identity is verified, add transaction uniqueness at the correct scope (provider/account if needed). Preflight duplicates and placeholders; multiple unassigned NULL values are allowed. (`idx_payments_transaction_id_unique`).
- [x] Ensure notifications use stable event keys and emit only for actual transitions. Do not send SMTP inside transactions; verify post-commit retry behavior without inventing a second queue.
- [x] Publish migration/application compatibility sequence before enabling a restrictive trigger. (`V30__order_transitions_and_payment_uniqueness.sql`).

## Acceptance matrix: real DB plus signed handler fixtures

Verified via automated test suite `tests/orderPaymentDeliveryConsistency.test.js`:

| Scenario | Required Result | Verified Result |
| --- | --- | --- |
| Two concurrent success deliveries and replay | One business transition, durable replay skips second work | **Passed** (`webhook_events` prevents double transition; returns `duplicate: true`) |
| Success then old failure | Completed remains completed; failure ignored | **Passed** (`payment_status` stays `completed`; audit notice logged) |
| Failure for another attempt | Cannot mutate the successful attempt | **Passed** (Isolated by unique `order_id` / transaction lock) |
| Cancel then late success | Order stays cancelled; payment event durably visible for reconciliation | **Passed** (`status` stays `cancelled`; audit log created in `payment_reconciliation_logs`) |
| Shipped/delivered plus duplicate success | Fulfillment status does not regress | **Passed** (`shipped` stays `shipped`) |
| Admin delivery/cancellation races | Only legal transitions commit; restoration happens once | **Passed** (Variant locks ascending; stock restored once with sum aggregation) |
| Concurrent session creation and slow response | No duplicate or reset payment state | **Passed** (Rejection if completed; post-network state re-verification) |
| Refund event | Handled in separate branch; recorded in audit log | **Passed** (`handlePaymentRefund` records `order_refunded` audit log) |
| Raw SQL invalid order transitions | Rejected by database trigger | **Passed** (`trg_enforce_order_status_transition` raises `P0001`) |
| Event transaction failure allows retry | Clean rollback with no false processed marker | **Passed** (Event record is committed with transaction) |

## Definition of Done

The complete matrix, unit tests, and API regression checks pass (167 / 167 tests passed, 20 / 20 test suites passed); D1/D2/D8 are verified with actual PostgreSQL behavior. Migration `V30__order_transitions_and_payment_uniqueness.sql` is verified on `brightbuy_dev`.
