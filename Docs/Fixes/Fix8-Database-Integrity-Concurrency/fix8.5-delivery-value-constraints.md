# Fix 8.5: Delivery Cardinality & Value Constraints

> **Parent:** [Fix 8](fix8-database-integrity-concurrency.md)
> **Status:** Not Started
> **Assigned To:** D; E reviews migration sequencing
> **Priority:** High
> **Depends On:** [8.1](fix8.1-contracts-preflight.md) D1/D4/D8; [8.4](fix8.4-order-payment-consistency.md) writer compatibility
> **Blocks:** 8.9, 8.10, 8.11, 8.12

## Scope and references

[Order/payment schema](../../Phases/Phase1-Project-Foundation/phase1.7-order-payment-delivery-schema.md), [admin order API](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.3-order-delivery-admin-apis.md), [Fix 4.3 fulfillment](../Fix4-Role-Permissions-Operations/fix4.3-order-delivery-mode-fulfillment.md).
Inspect V17/V18/V19, models/orderModel.js, services/adminOrderService.js, models/adminOrderModel.js, and payment writers before choosing a migration.

## Exact intended checks

- order_items.unit_price >= 0 and payments.amount >= 0. Preserve zero values; no new strictly-positive price requirement.
- deliveries.delivery_status must be one of the current union: pending, processing, shipped, out_for_delivery, delivered, ready_for_pickup, collected, cancelled.
- At most one deliveries row per order only after D4 confirms no split shipments. Uniqueness does not require every order to have a delivery; do not claim it enforces existence.
- Add payments.order_id uniqueness only if D1 selects one current payment row. Attempt-history designs must use their chosen identity instead.
- Existing default-address/primary-image unique indexes and nonnegative stock/price checks remain.

Mode/status consistency and required courier tracking can be expressed as row checks if D4 chooses them, but are not silently added here. Preserve both pickup-only values; do not copy an old six-status list from historical docs.

## Tasks

- [ ] Allocate versions through E; name every constraint for precise error mapping.
- [ ] Run preflight against existing data in an authorized environment; list duplicate IDs and invalid values. Do not deduplicate or rewrite financial rows in the constraint migration.
- [ ] Validate existing seeds, order generator, automated tests, and all insert/update paths against the chosen rules.
- [ ] Choose a migration strategy appropriate to table size and availability. Account for PostgreSQL/Flyway transaction limitations if concurrent indexes are selected; no blind production index operation.
- [ ] Coordinate application error mapping before enforcement so known failures receive D8 responses, while unexpected DB errors still fail visibly.
- [ ] Update DB_Schema and affected phase contracts once implementation exists.

## Acceptance

- [ ] Direct inserts/updates with negative amounts/prices fail; zero and positive values succeed.
- [ ] Every allowed delivery status succeeds in its supported workflow; misspellings fail.
- [ ] If D4 selects uniqueness, simultaneous second deliveries for an order cannot both commit; separate orders still succeed.
- [ ] Existing COD, home delivery, store pickup, snapshots, payment retries and seed loading remain functional.
- [ ] Dirty fixture upgrade fails with an actionable preflight; clean fresh and existing-data upgrades pass.
- [ ] No data loss, new duplicate indexes without justification, or arbitrary data repair.

## Definition of Done

Constraints and writer compatibility are tested in PostgreSQL and API tests. D confirms client-visible errors with B; E records migration sequencing and target evidence.

