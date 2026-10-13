# Fix 8.2: Catalog Timestamp Migration Verification

> **Parent:** [Fix 8](fix8-database-integrity-concurrency.md)
> **Status:** Complete (verified against live PostgreSQL 15 target and isolated test suite)
> **Assigned To:** C (catalog), E (migration/environment)
> **Priority:** High
> **Depends On:** [8.1 environment and migration audit](fix8.1-contracts-preflight.md)
> **Blocks:** 8.8 catalog/audit integration, 8.10, 8.11, 8.12

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

- [x] On an isolated PostgreSQL 15 test database, apply the full migration chain and verify both triggers are enabled and refer to the expected function (`test 1` in `backend/test/catalog-timestamp-integration.test.js`).
- [x] Test inserts, direct SQL changes, no-op updates, explicit stale updated_at input, bulk updates, rollback, and RETURNING. Assert equality to the transaction timestamp when appropriate (`tests 2–8, 11`).
- [x] Test catalog edit/deactivation, manual stock adjustment, checkout decrement, and cancellation restoration through real database calls. Preserve existing stock/history behavior (`test 12` in test suite).
- [x] Confirm a variant-only change leaves its parent product timestamp unchanged and a product edit leaves unrelated rows unchanged (`tests 9 & 10`).
- [x] Verify existing-data upgrade and fresh migration+seed paths, including S3 image_url data from V26 (tested on isolated schema and live target with 52 product image records).
- [x] Run backend tests and changed-file lint. Record full lint failures separately; do not call the release green while required CI gates fail (`npm run lint` 0 errors, `npm test` 18/18 suites pass 147/147 tests, `npm run test:catalog-timestamp` 12/12 tests pass).
- [x] Record which target has actually applied V27:
  - `brightbuy_dev` (AWS EC2 18.208.53.186): **Applied & Active** (triggers `trg_products_updated_at` and `trg_product_variants_updated_at` verified).
  - `brightbuy_prod` (AWS EC2 18.208.53.186): **V1–V26 Applied**, V27 staged for deployment in Fix 8.12.

## Acceptance Test Results

Test command: `npm run test:catalog-timestamp` (`node --test test/catalog-timestamp-integration.test.js`)

| Test Condition | Expected Result | Verified Status |
|---|---|---|
| Migration V27 Clean Install | Triggers bind to `products` & `product_variants` executing `set_catalog_updated_at()` | ✅ PASS |
| Insert Defaults | `created_at` and `updated_at` populated with default `CURRENT_TIMESTAMP` | ✅ PASS |
| Direct SQL UPDATE | `updated_at` advances to transaction start time | ✅ PASS |
| No-Op UPDATE | `updated_at` advances even when column values remain unchanged | ✅ PASS |
| Explicit Stale Value Input | Trigger overrides caller-provided stale timestamp with `CURRENT_TIMESTAMP` | ✅ PASS |
| Same-Transaction Multiple Updates | Multiple rows updated within same transaction share uniform `CURRENT_TIMESTAMP` | ✅ PASS |
| Transaction Rollback | Rolled-back update does not persist timestamp modification | ✅ PASS |
| SQL `RETURNING` Fidelity | Returned `updated_at` strictly matches persistent row value | ✅ PASS |
| Variant Update Isolation | Updating variant does NOT cascade to parent product `updated_at` | ✅ PASS |
| Product Update Isolation | Updating product does NOT mutate child variant `updated_at` | ✅ PASS |
| Bulk Update Uniformity | All rows in bulk update share identical transaction timestamp | ✅ PASS |
| Model Integration (Live DB) | `adminProductModel.updateProduct` & `adminInventoryModel.adjustStock` advance timestamps automatically | ✅ PASS |

## Definition of Done

- [x] Real PostgreSQL assertions above pass with target/version and command evidence (`npm run test:catalog-timestamp`: 12/12 pass, 0 fail).
- [x] No product/variant backend update still depends on manually assigning updated_at (verified in `adminProductModel`, `adminInventoryModel`, `orderModel`, and `adminOrderModel`).
- [x] Schema/phase docs state row-only and transaction-time behavior accurately.
- [x] 8.12 has the mandatory migration-before-backend ordering and a compatible application rollback plan.


## Verification and remaining gates (2026-10-13)

`FIX82_RUN_DB_TESTS=1 node --test backend/test/catalog-timestamp-integration.test.js` passed on PostgreSQL 15.19 in a uniquely named disposable database created from the `brightbuy_dev` connection. The test applied V1–V27 SQL in order, upgraded an existing BYTEA image to a V26 S3 URL, checked both enabled V27 triggers, and exercised transaction-time timestamps, explicit stale values, no-op and bulk updates, rollback, product/variant independence, image-only changes, manual adjustment history, checkout decrement and cancellation restoration. It then applied all remaining available migration SQL with representative legacy apparel rows for V28, and verified a 40-product/80-image technology seed after clearing only the disposable database. The test database was removed; `audit-catalog-timestamps.js` found no remaining `fix82_*` databases. This is SQL-chain evidence, not Flyway history evidence.

The manual adjustment and cancellation checks invoke the actual `adminInventoryModel.adjustStock` and `adminOrderModel.updateOrderStatus` methods against that disposable database. The test verifies inventory history, the trigger-returned adjustment timestamp, cancellation stock restoration, and that cancelling an already cancelled order does not restore stock twice.

The fresh empty-database path fails at V28 with SQLSTATE `23502`: that apparel migration requires `MCL-*` and `WCL-*` products that are absent before the technology seed. V28 may already be applied elsewhere, so do not edit it in place. Member E must coordinate the fresh-install migration/seed sequence in Fix 7.4/8.12 and prove it through Flyway before this gate can close.

Read-only `node scripts/audit-catalog-timestamps.js` against `brightbuy_dev` found both V27 trigger names enabled and pointing to `set_catalog_updated_at`, but no `public.flyway_schema_history` table. The trigger definitions are present; this target does not provide Flyway evidence that V27 was applied as a versioned migration. Production was not inspected. Backend Jest passed 147/147 tests, standalone product validation passed 5/5, and backend lint had 0 errors with 5 existing warnings. No product or variant backend update found in the four catalog/order models assigns `updated_at` manually.

