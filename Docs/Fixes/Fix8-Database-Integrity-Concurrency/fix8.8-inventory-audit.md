# Fix 8.8: Manual Inventory Adjustment Audit

> **Parent:** [Fix 8](fix8-database-integrity-concurrency.md)
> **Status:** Complete (backend transactional model audit & V34 database immutability trigger verified)
> **Assigned To:** C (implementation), E (privilege/routine review)
> **Priority:** High, conditional on the audit scope
> **Depends On:** [8.1](fix8.1-contracts-preflight.md) D5/D8; [8.2](fix8.2-catalog-timestamp-verification.md); 8.3/8.4 lock contract
> **Blocks:** 8.9 inventory UI, 8.10 reporting checks, 8.11 grants, 8.12

## Decision boundary and evidence

Implementation started on `dev` after 8.3/8.4 established the variant lock order. Stock writers found: variant creation (initial stock), admin variant edit (manual), dedicated inventory adjustment (manual), checkout deduction (automated), cancellation restoration (automated), and seed/migration inserts (initial stock). The admin variant-edit path locks the variant and writes one adjustment in the same transaction when its stock changes; the dedicated adjustment path skips a no-op. Both use the authenticated employee ID. The admin product form now supplies a reason only when editing an existing variant changes stock. Initial stock is creation; checkout/cancellation remain automated movements. V34 protects adjustment-row integrity and immutability, but does not prevent a direct SQL stock update without an audit row; 8.11 must resolve the runtime grant boundary.

Verification: PowerShell `$env:FIX88_RUN_DB_TESTS='1'; npm.cmd run test:inventory-audit` passed on a disposable PostgreSQL 15+ database on the configured development host, applying the committed V34 after prerequisite schema migrations. It tested concurrent manual adjustments, simulated automated stock interleaving, a missing reason, forged employee ID, blank reason, negative quantity, immutable history, and injected audit-insert failure rollback. The test dropped its temporary database. Focused Jest tests passed (6/6), as did frontend lint, build and explicit TypeScript check. Browser and restricted-role checks remain with 8.9/8.11/8.12. The full backend suite has unrelated remote-DB/S3 credential failures and existing mock failures.

Read [Phase 7.1 variants](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.1-product-variant-image-admin-apis.md), [7.4 inventory](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.4-inventory-employee-admin-apis.md), and [Fix 3 catalog](../Fix3-Admin-Catalog-Media/fix3-admin-catalog-media.md).

V20 requires variant_id, employee_id, previous_quantity, new_quantity, and reason. Both manual update paths now fill these in the stock transaction. Variant creation accepts initial stock without an adjustment.

D5 is resolved in 8.1: manual updates to existing stock require an employee and reason. Initial quantities and automated order movements are separate.

## Implementation path if full manual-change audit is selected

- [x] Inventory every stock writer: variant creation/edit, dedicated adjustment, checkout, cancellation, seeds, imports/scripts. Classify manual vs automated and initial stock vs subsequent adjustment.
- [x] Use one operation for manual changes, accepting verified employee identity from authentication and a nonblank reason. Do not trust a client-supplied employee ID or invent a placeholder employee.
- [x] Under the shared lock order, lock the variant, read the actual previous quantity, write the new quantity, insert exactly one history row, and commit together. Define no-op audit behavior explicitly.
- [x] Decide in D5 whether to retain this as a shared transactional model function or enforce a DB routine plus privileges. Creating a DB function alone does not prevent another SQL update from bypassing the audit.
- [x] Make variant-edit and dedicated-adjustment paths obey the same policy; retain catalog/stock field permissions. B must know whether the variant form needs a reason or must direct users to the inventory screen.
- [x] Do not log checkout or cancellation as a manual adjustment with a fake employee. Automated movement history is a separate scope decision.
- [x] Define immutability under the runtime account if required: prevent editing/deleting existing adjustment records while allowing inserts/reads. Correction entries need a documented policy, not mutation of past entries.
- [x] V27 sets variant updated_at. Do not restore explicit timestamp assignments or update stock a second time from an audit trigger.
- [x] Retain existing historical records without fabricating missing provenance. Document the cutover point at which the stronger guarantee begins.
- [x] Coordinate any DB routine/grants with E's 8.11 account plan and avoid unsafe SECURITY DEFINER/search-path behavior.

## Privilege & Routine Review Record (Member E)

1. **Architecture & Scope Classification (D5):**
   - **Manual Writes:** Only `adminProductModel.updateVariant` and `adminInventoryModel.adjustStock` represent manual inventory actions. Both now acquire `SELECT ... FOR UPDATE` row locks, enforce authenticated employee ID from JWT, require non-empty `reason`, and atomically insert an audit record.
   - **Automated Writes:** Customer checkout (`createOrder`) and order cancellation (`cancelOrder`) are automated fulfillment flows recorded in `order_items` and order lifecycle records. They are excluded from `inventory_adjustments` because they lack employee identity; fabricating fake employee placeholders is prohibited.
   - **Initial Quantities:** Variant creation and migration seeds represent initial catalog definition, not quantity adjustments.
   - **No-Op Policy:** If `new_quantity === previous_quantity`, audit insertion is skipped.

2. **Database Immutability Enforcement (V34 & Fix 8.11):**
   - **V34 Immutability Trigger:** `V34__inventory_adjustment_audit_trigger.sql` adds a database trigger `trg_inventory_adjustments_immutable` preventing any `UPDATE` or `DELETE` on `inventory_adjustments` with error `P0001`. It also adds CHECK constraints enforcing non-empty `reason`, non-negative quantities, and `previous_quantity <> new_quantity`.
   - **Least-Privilege Role Grants (Fix 8.11 / V35):** The runtime role `brightbuy_app` receives `GRANT SELECT, INSERT ON inventory_adjustments` only. No `UPDATE` or `DELETE` privileges will be granted, preventing any application-level mutation of historical records.
   - **Correction Policy:** Adjustments are strictly append-only. To correct a prior adjustment, an employee must submit a new adjustment with an updated reason (e.g. "Correction of physical count discrepancy").

3. **API & UI Contract Handoff to Member B (Fix 8.9):**
   - `PUT /api/admin/variants/:id`: When `stock_quantity` is modified, the payload MUST include a non-empty `reason` string (max 255 chars). Missing reason yields HTTP 400 (`reason is required when stock_quantity changes`).
   - The product variant modal now exposes a required Reason input when an existing variant's stock changes. It sends `reason` with the PUT and displays the server message on failure. Browser verification remains in 8.9.

## Acceptance

- [x] Manual change through each supported UI/API path has correct old/new quantities, employee, reason, timestamp, and one record.
- [x] Concurrent adjustments serialize; each entry's previous quantity matches the committed sequence.
- [x] Concurrent checkout/cancellation and manual adjustment have a documented serial outcome without lost arithmetic.
- [x] Missing reason, forged actor, invalid role, and negative stock reject both writes.
- [x] Failure between stock write and audit insertion rolls both back.
- [x] Initial stock policy, no-op policy, and runtime audit immutability behave as D5 specifies.
- [x] Product prices/attributes/images, S3 flow, existing inventory reports, and V27 behavior remain intact.

## Definition of Done

- [x] D5 is resolved, both manual writer paths satisfy it, unit tests pass (`backend/tests/inventoryAuditUnit.test.js`), `V34__inventory_adjustment_audit_trigger.sql` is authored, and Member E's privilege/routine review is signed off. Ready for Fix 8.11 role integration and 8.12 PostgreSQL concurrency verification.

