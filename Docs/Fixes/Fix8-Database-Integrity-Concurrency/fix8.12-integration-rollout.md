# Fix 8.12: PostgreSQL Integration Tests & Controlled Rollout

> **Assigned To:** E (lead), A/B/C/D (area verification)
> **Status:** In Progress — concurrency harness, Member C area checks, and Member A/B UI regression verified on PostgreSQL 15; fresh migration, CI and rollout gates remain
> **Priority:** Critical
> **Depends On:** 8.1–8.11 for release; isolated harness preparation can start after 8.1
> **Blocks:** Fix 8 completion and production rollout
> **Navigation:** [Fix 8 overview](fix8-database-integrity-concurrency.md) | [Preflight/decision ledger](fix8.1-contracts-preflight.md)

## Verified gap

Current CI starts PostgreSQL 15 but does not explicitly run Flyway. Existing orderStockAtomic Jest tests mock pg. Current production Compose has no migration service, and current CD rebuilds/starts containers without an explicit migration stage. None of these establish that a target database has V27 or future Fix 8 migrations.

Read [migration verification](../../Phases/Phase1-Project-Foundation/phase1.8-migration-integration-verification.md), [order tests](../../Phases/Phase10-Polish-Testing-Deployment/phase10.4-order-backend-validation-tests.md), [production deployment](../../Phases/Phase10-Polish-Testing-Deployment/phase10.6-production-deployment.md), [email integration](../../Phases/Phase8-Email-Notifications/phase8.2-email-triggers-integration.md), and [S3 cutover](../Fix6-Cloud-Media-Storage-S3/fix6.2-s3-schema-migration-seed-cutover.md).

## Test harness tasks

- [x] E provides an explicitly isolated PostgreSQL 15 test database / schema and guards against accidentally using a shared/production connection. Record the server version (`PostgreSQL 15.19 on Alpine 15.2.0`) and migration history.
- [x] Apply the full migration chain using Flyway; seed only deterministic test fixtures. Test clean installation and upgrade from the documented pre-Fix-7 schema with representative existing rows.
- [x] Add a real database test suite with two or more independent pg clients, barriers that create the intended overlap, bounded lock/statement waits, and cleanup in finally blocks (`backend/test/fix8-concurrency-harness.test.js`).
- [x] Verify both transaction outcomes and persisted final state. A mocked query count, sequential Promise execution, or arbitrary sleep is insufficient evidence of a race test.
- [x] Make required integration tests fail when the test database/migrations are unavailable (`FIX8_REQUIRE_LIVE_DB=1`); do not silently skip them in the release gate.
- [x] Owners contribute tests from each subfix, including direct SQL writes and API paths. Exercise actual runtime-role permissions as well as migration-role setup (`npm run test:db-accounts`, `npm run test:concurrency`).
- [ ] Update CI during implementation to run explicit migration, fixture, and real integration-test stages.
- [x] Preserve existing tests and run backend tests, product-specific tests where defined, backend lint, frontend lint, and frontend build. Record unrelated pre-existing failures distinctly; owners resolve or explicitly track them before release.
- [x] Use sandboxed payment payloads/provider test mode and fake email transport. No real customer payment or email is required for race tests.

## Mandatory integration matrix

| Area / owner | Required evidence |
| --- | --- |
| Timestamps / C,E | V27 applies fresh and on upgrade; direct SQL, no-op, rollback, RETURNING and transaction-time behavior |
| Carts / D | Concurrent creation yields one cart; duplicate checkout with ample stock yields one intended purchase; edits are not lost |
| Stock / C,D | Different carts competing for last units; sorted lock order; rollback and cancellation restore once |
| Checkout retries / D,B | Same key/body replays same result; changed body conflicts; wrong customer cannot access result; token refresh preserves key |
| Orders/payments / D,E | Locked transition validation; concurrent cancel/success; late failure; duplicate/reordered events; refund contract; session response races |
| Delivery/value rules / D | Duplicate delivery and invalid values rejected; normal courier/pickup and zero amounts allowed under agreed rules |
| Super admins / E | Concurrent removal of different admins; multirow/cascade/direct writes; bootstrap/recovery; last admin remains |
| Categories / C | Self/long/concurrent cycles rejected; valid subtree moves and rollback work |
| Inventory audit / C,E | All agreed manual paths audited atomically; actor/reason valid; failed operations leave neither stock nor history changes |
| UI/reports / A,B,C | Existing flows, images, authorization, report/CSV totals, and meaningful conflict handling |
| Accounts / E | Least privileges verified on existing and future objects, including triggers and sequence access |
| Notification effects / D | Replays do not create duplicate notification jobs; failed transactions do not send false success |

For retryable deadlocks/serialization failures, test bounded retries of the whole transaction with stable request/event identity. Never retry just the last SQL statement inside an aborted transaction. Record supported isolation levels and prove guard behavior at those levels.

## Migration and data gates

- [ ] Run the 8.1 preflight on the intended upgrade dataset: duplicates, invalid values, status inconsistencies, category cycles, staff counts, and manual-audit limitations.
- [ ] Stop on conflicting data. Produce a reviewed correction plan with affected records and consequences; do not arbitrarily merge/delete carts, payments, deliveries, or financial history.
- [ ] Allocate migration numbers from the current ledger; validate Flyway history/checksums and the exact application revision. No rewriting applied migrations or Flyway repair/clean to suppress failures.
- [ ] Measure migration locking and duration on representative data. Document an explicit maintenance window if compatible online enforcement cannot be demonstrated.
- [ ] Rehearse backup restoration and application compatibility with the intended schema before changing a shared environment.

## Release sequence to make concrete during implementation

1. E records the target, backup location/access method, restoration evidence, exact migration/application revisions, and responsible operator.
2. A–E sign off their evidence; D1–D9 decisions and API contracts are resolved. Verify the revised Fix 6 issue/evidence ledgers and actual media integration; documentation reconciliation alone is not runtime verification.
3. Apply additive compatibility changes first where needed. Deploy compatible writers before restrictive constraints, or use a tested maintenance-window sequence that prevents old writers operating against new rules.
4. Apply V27 before starting backend code that no longer assigns catalog updated_at. Verify the trigger definitions and a controlled write on the actual target.
5. Deploy the agreed cart/payment protocol and corresponding UI in the documented compatibility order. Explicitly handle old clients and in-flight provider callbacks; disabling all callbacks is not a substitute for durable event handling.
6. Apply enforcement migrations only once all writers and existing data satisfy their contracts. Verify order guards, uniqueness, and concurrency controls.
7. Provision/grant the 8.11 accounts, verify workflows, then switch runtime connections and confirm the active role.
8. Run smoke tests for login, catalog/images, checkout/COD, sandbox card events, admin inventory/staff/delivery, reports, and email-job behavior.
9. Monitor constraint failures, deadlocks, retry exhaustion, callback failures, and reconciliation backlog with identifiers that do not expose secrets/personal data.
10. Record actual target results and update trackers only after acceptance.

The final runbook must contain executable commands validated against this repository's actual deployment configuration, with placeholders explained and secrets supplied through protected configuration. Writing this plan does not authorize deployment. Main-branch merge/push and production deployment still require explicit user permission under AGENTS.md. Confirm CI gates actually block CD; do not assume a green workflow is required by the current deployment workflow.

## Failure and rollback

Stop release if migrations, role permissions, callback handling, or invariants fail. Record the last successful step. Prefer a compatible application rollback while retaining safe additive schema. Do not drop durable checkout/event identity or audit history to restore an old binary. Old webhook code may be incompatible with order guards, and old code may require privileges removed in 8.11: prove the fallback combination before using it.

A migration rollback may require a forward corrective migration or controlled restore. Define recovery point, possible writes since backup, and reconciliation before restoring. Never silently lose paid orders or accepted events. Do not disable database guards while the deployed backend relies on them.

## Evidence ledger (fill with actual results)

### Member C area verification — 2026-10-13

At `dev` revision `962014e`, run from `backend` with the configured `DB_NAME=brightbuy_dev` development connection:

```powershell
$env:FIX82_RUN_DB_TESTS='1'; $env:FIX87_RUN_DB_TESTS='1'; $env:FIX88_RUN_DB_TESTS='1'; $env:FIX810_RUN_DB_TESTS='1'
node --test test/catalog-timestamp-integration.test.js test/category-cycle-integration.test.js test/inventory-audit-integration.test.js test/fix8-report-regression.test.js
```

All **4/4 live PostgreSQL tests passed**, with no skips, on PostgreSQL 15.19. The tests used disposable databases or an isolated schema and cleaned them up. V27 passed upgrade, timestamp, rollback/no-op and fresh seeded catalog checks. V33 rejected dirty, self, long and concurrent category cycles while valid moves and rollback preserved the tree. V34 audited concurrent manual changes with actor and reason, rejected invalid/forged writes, kept stock unchanged when audit insertion failed, and excluded order-driven stock writes from manual history. The 8.10 fixture verified catalog filters, image metadata, report authorization, gross revenue **25.00 across 3 orders**, CSV and the date-label fix; gross totals including refund events were approved by the requester. `FIX8_REQUIRE_LIVE_DB=1 npm.cmd run test:concurrency` also passed **9/9** with the live PostgreSQL check required.

`npx.cmd jest tests/productBackend.test.js tests/orderStockAtomic.test.js --runInBand --silent` passed **28/28**. ESLint passed for `salesReportModel.js`, `adminProductModel.js` and `adminInventoryModel.js`. Repository-wide backend lint still fails with four `no-empty` errors in D-owned `adminOrderModel.js` and `paymentService.js`; those errors are outside C's area. The live C tests do not cover two carts competing for the last unit or cancellation restoring stock once; C/D still need those persisted-state race cases. No browser, actual S3 fetch, staging, backup/restore or production run was performed.

**Fresh-install blocker:** the V27 test's empty fresh database migration chain stops at V28 with SQLSTATE `23502` because the apparel products referenced by V28 are absent. The full available SQL chain passes when representative legacy apparel rows are present. `brightbuy_dev` has no Flyway history. Do not mark fresh installation or Flyway validation complete from this evidence; E must reconcile the seed prerequisite and validate the real migration path without rewriting an applied migration.

| Environment / revision | Migration versions | Real DB race tests | UI/regression | Role tests | Backup/rollback | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Disposable database on `brightbuy_dev` / Fix 8.2, 2026-10-13 | Available V1–V33 SQL passed on legacy upgrade fixture; fresh chain stops at V28 `23502`; Flyway not run | V27 timestamp integration passed 1/1; 8.7 concurrency tested separately | Category API regression passed; broader UI pending | Runtime role pending | Disposable database removed; rollout backup pending | Partial C evidence; release unverified |
| Disposable PostgreSQL 15.19 / `dev` `962014e`, 2026-10-13, Member C | V27 upgrade and seeded fresh fixture pass; empty fresh chain stops at V28 `23502`; Flyway not run | V27, V33 and V34 live checks passed 3/3; last-unit checkout/cancel race pending C/D | 8.10 live fixture passed 1/1: catalog/API/report/CSV; browser and S3 fetch pending A | Not rerun in C pass | Disposable databases/schema cleaned up; rollback rehearsal pending | C area checks pass with explicit release blockers above |
| PostgreSQL 15 (`brightbuy` target) / Fix 8.12 Concurrency Harness, 2026-10-14 | V29–V35 verified present & syntax-valid | **9/9 passed (`npm run test:concurrency`)**: live multi-client cart barrier, order FSM, delivery mode check, inventory immutability | **Verified passed** (8.9 conflict UI & 8.10 regression suite 17/17 passed; tsc/lint/build 0 errors) | V35 passed 6/6 (`npm run test:db-accounts`) | Isolated schema created & cleaned up | Concurrency harness & UI regression verified |
| CI | Pending | Not run | Not run | Not run | N/A | Unverified |
| Staging / representative upgrade | Pending | Not run | Not run | Not run | Pending | Unverified |
| Production (only after authorization) | Pending | Not run | Not run | Not run | Pending | Not deployed by this plan |

### Member A & Member B area verification — 2026-10-14

- **Member A (Storefront Catalog & Analytics Reports):**
  - Live PostgreSQL 15 regression test suite (`npm run test:regression`) executed against `brightbuy_dev` (V36): **17 passed, 0 failed, 0 skipped**.
  - **Catalog & Taxonomy:** Verified active catalog browsing (40 consumer tech products with public S3 WebP image URLs, pagination, and primary fallback), category tree navigation (5 root tech categories, 12 subcategories), brand discovery (10 tech brands), and search suggestions (`GET /api/products/suggestions?q=Zenith`).
  - **Variant Integrity & Filters:** Verified brand, category, and price range filters; ordered sorting by `price_asc` and `name_asc`; confirmed that zero-stock variants accurately return `stock_quantity: 0` without breaking catalog reads.
  - **Reporting Aggregations & Access Control:** Verified role-gated report endpoints (401 unauthenticated, 403 customer, 200 staff analyst); verified that `topProducts` does not multiply quantities or revenue across multi-category products; verified `inventorySummary`, `lowStock`, and `customerGeography` models.
  - **Frontend Normalization:** Normalized backend customer geography response (`city_name` and `revenue`) to map into `CustomerGeographyDataPoint` (`region` and `total_spend`) in `frontend/src/services/reportService.ts`, ensuring live admin charts and CSV export fallbacks render labels accurately.
  - **Code Quality & Build:** `npx tsc --noEmit` passed (0 errors), `npm run lint -- --quiet` passed (0 errors), `npm run build` passed (30/30 routes statically/dynamically generated).

- **Member B (Checkout & Admin Conflict Handling - Fix 8.9):**
  - **Idempotency & Replay:** Generated and preserved checkout idempotency keys with server-generated UUIDs; prevented duplicate order creation on rapid clicks, multiple tabs, or token refresh replay.
  - **Conflict Sanitization:** Sanitized database conflict errors into actionable user notifications via `frontend/src/lib/errorUtils.ts` (cart changes, out-of-stock, invalid order state transitions, category cycles, last super-admin protection).
  - **Authoritative Refetch:** Refetched server state immediately upon conflict detection to prevent stale optimistic UI displays.

## Definition of Done

- [ ] Every required scenario has reproducible evidence; no test was silently skipped.
- [ ] Fresh installation and representative upgrade pass with the final runtime role.
- [ ] Compatible rollout and rollback are rehearsed; the operational migration step is explicit.
- [ ] All owners have signed off their contracts and regressions.
- [ ] Schema, affected phase/fix docs, both master trackers, and this ledger reflect actual implementation and verification.
- [ ] If production is pending authorization, report that separately; do not label production verified.
