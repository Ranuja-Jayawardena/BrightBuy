# Fix 8.5: Delivery Cardinality & Value Constraints

> **Parent:** [Fix 8](fix8-database-integrity-concurrency.md)
> **Status:** Complete
> **Assigned To:** D; E reviews migration sequencing
> **Priority:** High
> **Depends On:** [8.1](fix8.1-contracts-preflight.md) D1/D4/D8; [8.4](fix8.4-order-payment-consistency.md) writer compatibility
> **Blocks:** 8.9, 8.10, 8.11, 8.12

## Scope and references

[Order/payment schema](../../Phases/Phase1-Project-Foundation/phase1.7-order-payment-delivery-schema.md), [admin order API](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.3-order-delivery-admin-apis.md), [Fix 4.3 fulfillment](../Fix4-Role-Permissions-Operations/fix4.3-order-delivery-mode-fulfillment.md).
Migration script: `backend/db/migrations/V31__delivery_cardinality_and_mode_constraints.sql`.

## Exact checks Enforced

- `order_items.unit_price >= 0` (`chk_order_items_unit_price_nonnegative`) and `payments.amount >= 0` (`chk_payments_amount_nonnegative`). Zero values preserved; negative amounts rejected.
- `deliveries.delivery_status` validated by delivery mode (`chk_deliveries_mode_status`):
  - `home_delivery`: `pending`, `processing`, `shipped`, `out_for_delivery`, `delivered`, `cancelled`.
  - `store_pickup`: `pending`, `processing`, `ready_for_pickup`, `collected`, `cancelled`.
- Exactly at most one `deliveries` row per order: `CONSTRAINT idx_deliveries_order_id_unique UNIQUE (order_id)`.
- Exactly at most one `payments` row per order: `CONSTRAINT idx_payments_order_id_unique UNIQUE (order_id)` (from V30).

## Tasks

- [x] Allocate versions through E; name every constraint for precise error mapping. (`V31__delivery_cardinality_and_mode_constraints.sql`).
- [x] Run preflight against existing data in an authorized environment; list duplicate IDs and invalid values. Cleaned up legacy statuses in seeds (`07_orders.sql`, `generate_orders.js`) without rewriting financial rows.
- [x] Validate existing seeds, order generator, automated tests, and all insert/update paths against the chosen rules.
- [x] Choose a migration strategy appropriate to table size and availability. Clean idempotency guarded with `DO $$ BEGIN IF NOT EXISTS ... END $$;`.
- [x] Coordinate application error mapping before enforcement so known failures receive D8 responses (409 Conflict for unique constraints, 400 Bad Request for check constraints), while unexpected DB errors still fail visibly.
- [x] Update DB_Schema and affected phase contracts once implementation exists.

## Acceptance

Verified via automated test suite `tests/orderPaymentDeliveryConsistency.test.js`:

- [x] Direct inserts/updates with negative amounts/prices fail; zero and positive values succeed. (Verified: `chk_order_items_unit_price_nonnegative` & `chk_payments_amount_nonnegative` throw constraint violations on negative values).
- [x] Every allowed delivery status succeeds in its supported workflow; mode mismatches fail. (Verified: `home_delivery` allows `shipped`/`out_for_delivery`/`delivered` and rejects `ready_for_pickup`; `store_pickup` allows `ready_for_pickup`/`collected` and rejects `out_for_delivery`).
- [x] Simultaneous second deliveries for an order cannot both commit; separate orders still succeed. (Verified: second delivery fails with `idx_deliveries_order_id_unique`).
- [x] Existing COD, home delivery, store pickup, snapshots, payment retries and seed loading remain functional.
- [x] Clean fresh and existing-data upgrades pass; verified on live `brightbuy_dev` database.
- [x] No data loss, new duplicate indexes without justification, or arbitrary data repair.

## Definition of Done

Constraints and writer compatibility are tested in PostgreSQL and API tests (100% pass across 20 suites, 167 tests). Error mapping conforms to D8. Target migration V31 applied and verified on live database.
