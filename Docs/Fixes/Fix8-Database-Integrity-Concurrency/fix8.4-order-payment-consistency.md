# Fix 8.4: Order Transitions & Payment Event Consistency

> **Parent:** [Fix 8](fix8-database-integrity-concurrency.md)
> **Status:** Not Started
> **Assigned To:** D (implementation), E (webhook security review), C (admin order ownership handoff)
> **Priority:** Critical
> **Depends On:** [8.1](fix8.1-contracts-preflight.md) D1/D2/D8; [8.3](fix8.3-cart-checkout-concurrency.md) shared lock contract
> **Blocks:** 8.5 financial/writer constraints, 8.9, 8.10, 8.11, 8.12

## Read and preserve

[Phase 6 overview/interface](../../Phases/Phase6-Payment-Integration/phase6-payment-integration.md), [6.1 webhooks](../../Phases/Phase6-Payment-Integration/phase6.1-webhook-infrastructure.md), [6.2 sessions/COD](../../Phases/Phase6-Payment-Integration/phase6.2-payment-sessions-cash-on-delivery.md), [6.3 event handlers](../../Phases/Phase6-Payment-Integration/phase6.3-payment-event-handlers-order-status.md), [7.3 admin orders](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.3-order-delivery-admin-apis.md), [8.2 email](../../Phases/Phase8-Email-Notifications/phase8.2-email-triggers-integration.md), and [Fix 4.3](../Fix4-Role-Permissions-Operations/fix4.3-order-delivery-mode-fulfillment.md).

Files: controllers/paymentController.js, controllers/webhookController.js, services/paymentService.js, services/adminOrderService.js, models/adminOrderModel.js, services/notificationService.js, services/emailQueue.js. All are under backend/src. Do not change webhook signatures/raw-body verification or assume a new provider API without evidence.

## Baseline and policy gate

Current order states are pending, paid, shipped, delivered, cancelled. The admin service currently permits pending->paid/cancelled, paid->shipped/cancelled, shipped->delivered/cancelled. Treat this as observed behavior; D2 must establish allowed card/COD behavior before it becomes a DB invariant. Do not force COD to be paid before shipment without a deliberate product decision.

Payment rows currently use pending, cod_pending, completed, failed. The webhook routes order_refunded to the failure handler. A refunded payment and a failed attempt have different meaning; resolve their representation and report effect in D2. No new refunded status or refund API is assumed by this plan.

The controller's in-memory processedWebhooks set is neither durable nor shared between processes. It reads meta.webhook_id, may fall back to 'unknown' for transaction identity, and has multiple local-order extraction fallbacks. Verify actual provider fields; do not make 'unknown' unique or mistake a provider order ID for a local order ID.

## Tasks

- [ ] Finalize the D1 payment-row/attempt model and D2 transition/event matrix, with real sanitized event examples. Publish response compatibility to B and reporting implications to A/C.
- [ ] For admin status changes, acquire the order lock then validate the current state inside the same transaction. Preserve same-transaction stock restoration, with one owner and once-only behavior. Aggregate quantities per variant if legacy order data contains repeated variant lines; do not assume UPDATE ... FROM sums multiple matches.
- [ ] Add a named database order-transition guard matching D2. Handle unchanged status deliberately. Map its rejection to D8; do not let it become an unexplained 500.
- [ ] On success, validate local ownership/correlation, payment method, provider identity, amount units and currency against the expected payment. Persist discrepancies for reconciliation instead of marking arbitrary orders paid.
- [ ] Do not regress shipped/delivered to paid or resurrect cancelled orders. Preserve a durable record of genuine late money events and their reconciliation outcome; transaction rollback alone must not erase the only record.
- [ ] Process failure only for the identified matching attempt and permitted previous states. A stale/unrelated failure must not demote a completed payment or change another attempt.
- [ ] Give refunds a separate explicit branch per D2. Do not silently ignore genuine refunds when adding a completed-payment guard.
- [ ] Replace reliance on the process-local set with durable event deduplication using a verified event identity. Same event on two workers must be applied once; distinct events for the same transaction must not all be discarded as duplicates.
- [ ] Couple the durable processed marker and business updates in one transaction. Mark an event complete only after successful processing; retries after rollback remain possible. Keep signature verification before trusting event data.
- [ ] Coordinate session creation/retry with current order/payment state; a slow provider response must not reset a now-completed payment to pending or insert duplicates. Network calls run outside database locks, with state revalidation afterwards.
- [ ] Once provider identity is verified, add transaction uniqueness at the correct scope (provider/account if needed). Preflight duplicates and placeholders; multiple unassigned NULL values are allowed. This is not a substitute for event deduplication or payment-attempt identity.
- [ ] Ensure notifications use stable event keys and emit only for actual transitions. Do not send SMTP inside transactions; verify post-commit retry behavior without inventing a second queue.
- [ ] Publish migration/application compatibility sequence before enabling a restrictive trigger.

## Acceptance matrix: real DB plus signed handler fixtures

- [ ] Two concurrent success deliveries and replay after worker restart: one business transition, one notification job.
- [ ] Success then old failure: completed remains completed. Failure then valid success: succeeds per the agreed attempt policy.
- [ ] Failure for another attempt: cannot mutate the successful attempt.
- [ ] Cancel then late success: order stays cancelled; stock remains correct; payment event is durably visible for reconciliation.
- [ ] Shipped/delivered plus duplicate success: fulfillment status does not regress.
- [ ] Admin delivery/cancellation/payment races: only legal transitions commit; restoration happens at most once.
- [ ] Concurrent session creation and a slow session response after success: no duplicate/reset payment state.
- [ ] Refund event, missing IDs, malformed IDs, invalid signature, mismatched amount/currency, and wrong local-order correlation follow explicit D2 outcomes.
- [ ] Raw SQL invalid order transitions are rejected; ordinary permitted transitions and COD/store pickup still work.
- [ ] An event transaction failure allows a subsequent retry, with no persisted false processed marker.
- [ ] Existing report/detail endpoints still read the agreed payment model correctly.

## Definition of Done

The complete matrix, unit tests, and API regression checks pass; D1/D2/D8 are updated with actual behavior. Backend and trigger changes are delivered as one compatible release unit. Do not mark complete from mocked handler tests alone.

