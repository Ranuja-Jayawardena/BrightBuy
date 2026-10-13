# Fix 7.2: Catalog Timestamp Migration Verification

> **Parent:** [Fix 7](fix7-database-integrity-concurrency.md)
> **Status:** In Progress (existing code; real database validation pending)
> **Assigned To:** C (catalog), E (migration/environment)
> **Priority:** High
> **Depends On:** [7.1 environment and migration audit](fix7.1-contracts-preflight.md)
> **Blocks:** 7.8 catalog/audit integration, 7.10, 7.11, 7.12

## Existing implementation to preserve

[Migration V27](../../../backend/db/migrations/V27__set_catalog_updated_at_on_update.sql) defines set_catalog_updated_at() and two BEFORE UPDATE row triggers. It assigns CURRENT_TIMESTAMP to NEW.updated_at. Backend timestamp assignments have already been removed from product/variant updates in adminProductModel, adminInventoryModel, adminOrderModel, and orderModel.

Do not create a duplicate migration/function, rewrite an applied V27, or extend this change to users/orders/payments/deliveries. [Product schema phase](../../Phases/Phase1-Project-Foundation/phase1.6-product-schema.md), [admin catalog phase](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.1-product-variant-image-admin-apis.md), and [Fix 6.2](../Fix6-Cloud-Media-Storage-S3/fix6.2-s3-schema-migration-seed-cutover.md) describe the surrounding schema.

## Exact semantics

- Insert defaults initialize timestamps as before.
- Each UPDATE assigns the transaction start timestamp, including a no-op UPDATE.
- Multiple updates in the same transaction can have the same updated_at; do not test strict monotonic advancement within one transaction.
- A rolled-back change must not persist a timestamp.
- Variant updates do not cascade timestamps to products; image/attribute changes alone do not touch either parent.
- SQL RETURNING sees the trigger-produced value.
- A new deployment that removes backend assignments requires V27 on that database first.

## Tasks and evidence

- [ ] On an isolated PostgreSQL 15 test database, apply the full migration chain and verify both triggers are enabled and refer to the expected function.
- [ ] Test inserts, direct SQL changes, no-op updates, explicit stale updated_at input, bulk updates, rollback, and RETURNING. Assert equality to the transaction timestamp when appropriate.
- [ ] Test catalog edit/deactivation, manual stock adjustment, checkout decrement, and cancellation restoration through real database calls. Preserve existing stock/history behavior.
- [ ] Confirm a variant-only change leaves its parent product timestamp unchanged and a product edit leaves unrelated rows unchanged.
- [ ] Verify existing-data upgrade and fresh migration+seed paths, including S3 image_url data from V26.
- [ ] Run backend tests and changed-file lint. Record full lint failures separately; do not call the release green while required CI gates fail.
- [ ] Record which target has actually applied V27. A source file or a passing mock test is not deployment evidence.

## Definition of Done

- [ ] Real PostgreSQL assertions above pass with target/version and command evidence.
- [ ] No product/variant backend update still depends on manually assigning updated_at.
- [ ] Schema/phase docs state row-only and transaction-time behavior accurately.
- [ ] 7.12 has the mandatory migration-before-backend ordering and a compatible application rollback plan.

