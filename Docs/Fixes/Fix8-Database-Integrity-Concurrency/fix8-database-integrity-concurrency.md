# Fix 8: Database Integrity & Concurrency

> **Status:** In Progress (5 / 12 fix items complete; 8.1, 8.2, 8.3, 8.6 & 8.7 Complete)
> **Members:** A (storefront/reports), B (checkout/admin UI), C (catalog/inventory), D (cart/orders/payments), E (auth/database infrastructure)
> **Priority:** Critical
> **Master trackers:** [Fixes](../overallplan.md) | [Project](../../overallplan.md)
> **Source discussion:** [Database improvements](../../db_improvements/Db_improvements_discussion.md)
> **Schema:** [DB_Schema.md](../../Database/DB_Schema.md)
> **Rules:** [AGENTS.md](../../../.agents/AGENTS.md)

## Purpose and current evidence

Protect existing checkout, payment, catalog, and staff workflows against invalid writes and concurrent requests. This plan authorizes no deployment by itself. This document set was created through Markdown edits only. Existing V27/backend timestamp changes predate this planning task.

The code uses parameterized SQL through pg and application-managed transactions. Keep that architecture. Do not introduce an ORM, query builder, new authentication library, or wholesale stored-procedure rewrite.

Verified during planning:
- V27 defines timestamp triggers for products and product_variants; backend assignments were removed. V27 triggers are verified on target PostgreSQL (`brightbuy_dev`) and via automated integration test suite (`npm run test:catalog-timestamp`).
- Checkout locks variants, but reads the cart before those locks and clears all cart items at the end. Duplicate checkout and concurrent edits remain exposed.
- Admin order transition validation happens before the model's transaction lock.
- Payment success only skips orders currently paid. Payment failure updates by order_id without guarding completed payments. The webhook controller currently routes order_refunded through the failure handler and uses an in-memory deduplication set. Treat refund handling and event identity as explicit contract decisions.
- Carts, payments, and deliveries have ordinary lookup indexes, not the proposed uniqueness rules.
- Staff counts and category ancestry checks happen outside a database-wide serialization protocol.
- Dedicated inventory adjustment writes history; variant editing also changes stock without that history.
- CI starts PostgreSQL but its current workflow has no Flyway migration step. Production Compose has no migration service; current CD rebuilds containers without an explicit migration step. Do not infer migrations run because the app starts.
- The 2026-10-13 Fix 6 documentation revision reconciles its trackers to 0/4 verified complete (6.1–6.3 In Progress, 6.4 Not Started). Provisioning/code evidence is preserved in the [Fix 6 issue ledger](../Fix6-Cloud-Media-Storage-S3/fix6-cloud-media-storage-s3.md); target migration and S3 integration evidence remain pending. Verify that actual baseline in 8.1.

These are source-code findings, not results from a live concurrency exercise. The existing orderStockAtomic Jest suite mocks pg.

## Assignment and dependency map

| Item | Assigned | Depends on | Status |
| --- | --- | --- | --- |
| [8.1: Contracts, Data Preflight & Migration Coordination](fix8.1-contracts-preflight.md) | E (lead), D (payments/cart), C (catalog) | Existing phase/fix baseline | Complete |
| [8.2: Catalog Timestamp Migration Verification](fix8.2-catalog-timestamp-verification.md) | C (lead), E (migration verification) | 8.1 environment/migration audit | Complete — PostgreSQL 15 & automated test suite |
| [8.3: Cart Uniqueness & Checkout Concurrency](fix8.3-cart-checkout-concurrency.md) | D | 8.1 cart/API contract | Complete |
| [8.4: Order Transitions & Payment Event Consistency](fix8.4-order-payment-consistency.md) | D (lead), E (webhook infrastructure review), C (admin handoff) | 8.1 payment decisions; 8.3 lock contract | Not Started |
| [8.5: Delivery Cardinality & Value Constraints](fix8.5-delivery-value-constraints.md) | D (lead), E (migration review) | 8.1 delivery decisions; 8.4 writer compatibility | Not Started |
| [8.6: Concurrent Super Admin Protection](fix8.6-super-admin-protection.md) | E | 8.1 staff contract | Complete |
| [8.7: Category Hierarchy Integrity](fix8.7-category-cycle-protection.md) | C | 8.1 category contract | Complete — isolated PostgreSQL 15 verification |
| [8.8: Manual Inventory Adjustment Audit](fix8.8-inventory-audit.md) | C (lead), E (permissions review) | 8.1 audit decision; 8.2 timestamp baseline; 8.3/8.4 lock contract | Not Started |
| [8.9: Checkout & Admin Conflict Handling](fix8.9-checkout-admin-ui.md) | B | 8.3–8.8 API handoffs; mock work after 8.1 | Not Started |
| [8.10: Storefront & Report Regression Verification](fix8.10-storefront-report-regression.md) | A (lead), C (report query support) | 8.2–8.5, 8.7–8.9; actual Fix 6 baseline | Not Started |
| [8.11: Application & Migration Database Accounts](fix8.11-database-account-separation.md) | E | 8.1 privilege audit; 8.2–8.8 final database objects | Not Started |
| [8.12: PostgreSQL Integration Tests & Controlled Rollout](fix8.12-integration-rollout.md) | E (lead), A/B/C/D (area verification) | 8.1–8.11; test-harness preparation may start after 8.1 | Not Started |

A owns customer catalog and report regression, not checkout implementation. B owns checkout and admin UI. C owns catalog/category/inventory writes. D owns cart/order/payment writes, including the order portions of adminOrderModel and adminOrderService for this fix, coordinated with their original owner C. E owns staff protection, Flyway coordination, grants, CI, and deployment.

Shared files require explicit handoff: C owns inventory functions and E owns employee functions in adminInventoryModel/Service; D owns stock changes caused by orders; B coordinates shared storefront cart-store changes with A. Do not edit another member's area silently.

## Shared implementation contracts

1. Read 8.1 and resolve its relevant decision rows before dependent code. Facts, proposed defaults, and unresolved decisions must remain visibly distinct.
2. Keep existing route URLs, successful response fields, customer ownership filters, staff purchase prohibition, HttpOnly authentication, and COD/store-pickup flows. Any API addition must be recorded in 8.1 and handed to B/A before implementation.
3. All statements in a transaction use the same checked-out pg client. Roll back on failure and release it. Do not substitute pool.query halfway through a transaction.
4. Define one consistent lock order across checkout, cancellation, inventory, and payment. Preserve sorted variant acquisition; investigate the current join lock on products too. Neither local JavaScript mutexes nor disabled buttons protect multiple backend processes.
5. Every side effect has one owner. Keep stock restoration in one operation, and ensure replays produce neither duplicate deductions nor duplicate notification jobs.
6. Preserve default-address and primary-image uniqueness, price snapshots, delivery-address snapshots, negative-stock protection, S3 image URLs, and report response shapes.
7. Keep database error detail internal. Map known named constraints and expected concurrency conflicts to the documented API errors. Do not turn all database errors into success or generic 409 responses.
8. Race-sensitive acceptance requires real PostgreSQL sessions, explicit interleaving/barriers, bounded waits, and final row assertions. Mocked SQL call counts alone do not establish correctness.
9. Production changes and main-branch deployment require explicit user authorization under AGENTS.md. No data deletion, reseeding of shared databases, or Flyway repair/clean is part of this plan.

## Migration coordination

V27 is already occupied by catalog timestamps. E records the current highest version in 8.1 before allocating the next free versions. Do not assume V28 remains available, create duplicate versions across branches, or rewrite applied migrations.

Migration owners: D for cart/order/payment/delivery constraints; C for catalog/inventory; E for staff guards and role setup. E reviews ordering and object ownership. Use forward migrations, named constraints, and a preflight that fails clearly on conflicting existing data. No silent deletion or arbitrary selection of duplicate financial records.

Separate additive schema, compatible application changes, and enforcement where necessary. V27 must be applied before backend code relying exclusively on its triggers is started. A restrictive order trigger must not be enabled against old webhook code without a tested compatibility or coordinated maintenance plan.

## Deferred scope

Views, materialized views, window-function reports, per-employee PostgreSQL role switching/RLS, and moving checkout into a stored procedure are deferred. A/B validate existing reports; they do not add a new reporting feature. A stock routine is conditional on the audit contract, not a requirement to use every lecture topic.

## Related documentation

- [Phase 1: Foundation](../../Phases/Phase1-Project-Foundation/phase1-project-foundation.md), [Phase 3: Authentication](../../Phases/Phase3-Authentication-System/phase3-authentication-system.md)
- [Phase 5: Checkout](../../Phases/Phase5-Shopping-Cart-Checkout/phase5-shopping-cart-checkout.md), [Phase 6: Payments](../../Phases/Phase6-Payment-Integration/phase6-payment-integration.md)
- [Phase 7: Administration](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7-inventory-admin-dashboard.md), [Phase 8: Email](../../Phases/Phase8-Email-Notifications/phase8-email-notifications.md)
- [Phase 9: Reports](../../Phases/Phase9-Reports-Analytics/phase9-reports-analytics.md), [Phase 10: Testing/deployment](../../Phases/Phase10-Polish-Testing-Deployment/phase10-polish-testing-deployment.md)
- [Fix 2: Search](../Fix2-Search-Filter-Performance/fix2-search-filter-performance.md), [Fix 3: Catalog](../Fix3-Admin-Catalog-Media/fix3-admin-catalog-media.md)
- [Fix 4: Roles/fulfillment](../Fix4-Role-Permissions-Operations/fix4-role-permissions-operations.md), [Fix 5: Reports](../Fix5-Analytics-Reports-Visuals/fix5-analytics-reports-visuals.md), [Fix 6: S3](../Fix6-Cloud-Media-Storage-S3/fix6-cloud-media-storage-s3.md)

## Completion gate

- [ ] All twelve items have evidence and checked acceptance criteria.
- [ ] Remaining business decisions are resolved in 8.1; optional views remain explicitly deferred.
- [ ] Fresh-database and existing-data upgrades both pass, including real concurrency cases.
- [ ] Backend, frontend, schema, and migration versions have a compatible rollout and rollback sequence.
- [ ] A–E handoffs, schema notes, both overall trackers, and related phase/fix links reflect actual outcomes.
- [ ] Deployment evidence distinguishes local, test, staging, and production; no target is called migrated without verification.
