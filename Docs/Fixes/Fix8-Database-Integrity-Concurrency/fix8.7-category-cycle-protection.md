# Fix 8.7: Category Hierarchy Integrity

> **Parent:** [Fix 8](fix8-database-integrity-concurrency.md)
> **Status:** Complete — isolated PostgreSQL 15 and category API checks passed; target rollout remains with 8.12
> **Assigned To:** C
> **Priority:** Medium
> **Depends On:** [8.1](fix8.1-contracts-preflight.md) D7/D8
> **Blocks:** 8.9 category UI checks, 8.10, 8.11, 8.12

## Baseline and ownership

Read [Phase 1.5 taxonomy](../../Phases/Phase1-Project-Foundation/phase1.5-catalog-taxonomy-schema.md), [7.2 category API](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.2-category-admin-apis.md), and [Fix 3.3 category status](../Fix3-Admin-Catalog-Media/fix3.3-category-status-toggle.md). Files: V7, backend/src/services/adminCategoryService.js, models/adminCategoryModel.js, models/categoryModel.js. B owns admin category UI; A owns storefront category regression.

The FK checks parent existence. The backend recursive query checks ancestry before the mutation, so two reparentings can each pass while forming a cycle together.

## Tasks

- [x] Run a cycle-safe preflight query with a visited path or equivalent termination rule. Existing corrupt cycles must not make the audit query recurse indefinitely.
- [x] Record the DB serialization mechanism in D7. Protect all relevant insert/reparent paths, not only the API. A recursive lookup inside a row trigger without concurrency control is insufficient.
- [x] Consider multi-row changes and direct SQL; reject self-parenting and longer cycles. Cover any supported category-ID change or explicitly disallow it, because a parent-only trigger would otherwise miss that path.
- [x] Keep NULL parents valid and let the FK handle missing parents. Do not add a nesting limit or change activation inheritance without a separate decision.
- [x] Preserve soft delete/reactivation and product_categories associations. Do not recursively delete descendants to fix a cycle.
- [x] Use a named error and D8 mapping; retain helpful API validation while PostgreSQL supplies the final guard.
- [x] Confirm the lock/snapshot strategy with PostgreSQL tests. On a conflict, allow a transaction to fail safely; do not report success for a rejected change.

## Acceptance

- [x] Root creation and valid subtree movement succeed.
- [x] Self-parent and A->B->C->A are rejected via API and direct SQL.
- [x] Two independent roots concurrently assigned beneath each other cannot both commit.
- [x] Multi-row mutations cannot introduce cycles.
- [x] Deactivation/reactivation, valid deep trees, and storefront tree reads still work.
- [x] Dirty existing-data preflight reports a bounded diagnostic and stops rollout.
- [x] Rejected transactions leave every parent link unchanged.

## Definition of Done

Real DB concurrency tests plus category API/storefront regression pass. C hands exact errors to B/A, updates the schema notes, and documents the proven serialization strategy.

## Verification and handoff (2026-10-13)

`V33__category_cycle_prevention_trigger.sql` takes a transaction-scoped advisory lock before each category INSERT/UPDATE statement. Under READ COMMITTED, the after-statement trigger sees the complete result and walks parent links with a visited path. Multi-row changes and opposite concurrent reparentings cannot both commit. Other isolation levels are rejected for category writes because a stale snapshot could otherwise miss a competing change. `category_id` changes are explicitly rejected. The migration locks the categories table while its cycle-safe preflight and triggers install, so a dirty target fails before rollout.

The named database errors are `P0001` with constraint `categories_acyclic_parent` and message `Circular category hierarchy`, or `categories_id_immutable` and message `category_id cannot be changed`. Existing API middleware returns HTTP 400 with `{ error: 'invalid_request', message, statusCode: 400 }`. B can show that message on a rejected admin move; A can refetch the category tree. Rejected writes leave the existing links intact.

Executed `FIX87_RUN_DB_TESTS=1 node --test backend/test/category-cycle-integration.test.js` against PostgreSQL 15.19 in a uniquely named disposable schema on `brightbuy_dev` (1/1 passing); the test removed its schema and did not apply V33 to shared tables. It covered dirty-data preflight, root creation, valid subtree movement, self/long/multi-row cycles, category-ID immutability, two-client concurrency, non-READ COMMITTED rejection, active state changes, and category reads. Backend Jest tests passed 147/147 across 18 suites; standalone product validation passed 5/5. Backend lint passed with 0 errors and 5 pre-existing warnings. Target Flyway application belongs to 8.12.

