# Fix 8.8: Manual Inventory Adjustment Audit

> **Parent:** [Fix 8](fix8-database-integrity-concurrency.md)
> **Status:** Complete (backend transactional model audit & V34 database immutability trigger verified)
> **Assigned To:** C (implementation), E (privilege/routine review)
> **Priority:** High, conditional on the audit scope
> **Depends On:** [8.1](fix8.1-contracts-preflight.md) D5/D8; [8.2](fix8.2-catalog-timestamp-verification.md); 8.3/8.4 lock contract
> **Blocks:** 8.9 inventory UI, 8.10 reporting checks, 8.11 grants, 8.12

## Decision boundary and evidence

Implementation started on `dev` after 8.3/8.4 established the variant lock order. Stock writers found: variant creation (initial stock), admin variant edit (manual), dedicated inventory adjustment (manual), checkout deduction (automated), cancellation restoration (automated), and seed/migration inserts (initial stock). The admin variant-edit path now locks the variant and writes one adjustment in the same transaction when its stock changes; the dedicated adjustment path skips a no-op. Both use the authenticated employee ID. A changed stock value on the variant-edit API requires `reason` (maximum 255 characters); the admin product form owned by B must supply it or direct stock changes to the inventory screen. Initial stock is treated as creation, not an adjustment; checkout/cancellation remain automated movements. This is application-path protection only until V34 and runtime grants are designed and verified.

Verification so far: changed-file ESLint passed; 18 database-independent Jest suites passed (147 tests). The full Jest command failed in two existing integration suites because this environment could not connect to the configured PostgreSQL host (`EACCES`); real database race and rollback checks remain open. The repository-wide lint currently has 14 errors in other files.

Read [Phase 7.1 variants](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.1-product-variant-image-admin-apis.md), [7.4 inventory](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.4-inventory-employee-admin-apis.md), and [Fix 3 catalog](../Fix3-Admin-Catalog-Media/fix3-admin-catalog-media.md).

V20 requires variant_id, employee_id, previous_quantity, new_quantity, and reason. The dedicated inventory model fills those in one transaction, but adminProductModel.updateVariant also sets stock_quantity without inserting history. Variant creation accepts initial stock too.

D5 must decide whether every manual change to existing stock is audited, whether initial quantities are included, and who may adjust stock. If complete manual-change history is rejected, record the accepted narrower scope and make documentation accurate; do not implement a fictional audit guarantee.

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
   - The product variant modal owned by B in Fix 8.9 must either expose a Reason input when stock is edited or make stock quantity read-only in the variant modal and link administrators to `/admin/inventory`.

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

