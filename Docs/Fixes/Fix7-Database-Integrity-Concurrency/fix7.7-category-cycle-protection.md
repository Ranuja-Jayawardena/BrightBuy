# Fix 7.7: Category Hierarchy Integrity

> **Parent:** [Fix 7](fix7-database-integrity-concurrency.md)
> **Status:** Not Started
> **Assigned To:** C
> **Priority:** Medium
> **Depends On:** [7.1](fix7.1-contracts-preflight.md) D7/D8
> **Blocks:** 7.9 category UI checks, 7.10, 7.11, 7.12

## Baseline and ownership

Read [Phase 1.5 taxonomy](../../Phases/Phase1-Project-Foundation/phase1.5-catalog-taxonomy-schema.md), [7.2 category API](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.2-category-admin-apis.md), and [Fix 3.3 category status](../Fix3-Admin-Catalog-Media/fix3.3-category-status-toggle.md). Files: V7, backend/src/services/adminCategoryService.js, models/adminCategoryModel.js, models/categoryModel.js. B owns admin category UI; A owns storefront category regression.

The FK checks parent existence. The backend recursive query checks ancestry before the mutation, so two reparentings can each pass while forming a cycle together.

## Tasks

- [ ] Run a cycle-safe preflight query with a visited path or equivalent termination rule. Existing corrupt cycles must not make the audit query recurse indefinitely.
- [ ] Record the DB serialization mechanism in D7. Protect all relevant insert/reparent paths, not only the API. A recursive lookup inside a row trigger without concurrency control is insufficient.
- [ ] Consider multi-row changes and direct SQL; reject self-parenting and longer cycles. Cover any supported category-ID change or explicitly disallow it, because a parent-only trigger would otherwise miss that path.
- [ ] Keep NULL parents valid and let the FK handle missing parents. Do not add a nesting limit or change activation inheritance without a separate decision.
- [ ] Preserve soft delete/reactivation and product_categories associations. Do not recursively delete descendants to fix a cycle.
- [ ] Use a named error and D8 mapping; retain helpful API validation while PostgreSQL supplies the final guard.
- [ ] Confirm the lock/snapshot strategy with PostgreSQL tests. On a conflict, allow a transaction to fail safely; do not report success for a rejected change.

## Acceptance

- [ ] Root creation and valid subtree movement succeed.
- [ ] Self-parent and A->B->C->A are rejected via API and direct SQL.
- [ ] Two independent roots concurrently assigned beneath each other cannot both commit.
- [ ] Multi-row mutations cannot introduce cycles.
- [ ] Deactivation/reactivation, valid deep trees, and storefront tree reads still work.
- [ ] Dirty existing-data preflight reports a bounded diagnostic and stops rollout.
- [ ] Rejected transactions leave every parent link unchanged.

## Definition of Done

Real DB concurrency tests plus category API/storefront regression pass. C hands exact errors to B/A, updates the schema notes, and documents the proven serialization strategy.

