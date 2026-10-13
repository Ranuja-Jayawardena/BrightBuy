# Fix 8.8: Manual Inventory Adjustment Audit

> **Parent:** [Fix 8](fix8-database-integrity-concurrency.md)
> **Status:** Not Started
> **Assigned To:** C (implementation), E (privilege/routine review)
> **Priority:** High, conditional on the audit scope
> **Depends On:** [8.1](fix8.1-contracts-preflight.md) D5/D8; [8.2](fix8.2-catalog-timestamp-verification.md); 8.3/8.4 lock contract
> **Blocks:** 8.9 inventory UI, 8.10 reporting checks, 8.11 grants, 8.12

## Decision boundary and evidence

Read [Phase 7.1 variants](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.1-product-variant-image-admin-apis.md), [7.4 inventory](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.4-inventory-employee-admin-apis.md), and [Fix 3 catalog](../Fix3-Admin-Catalog-Media/fix3-admin-catalog-media.md).

V20 requires variant_id, employee_id, previous_quantity, new_quantity, and reason. The dedicated inventory model fills those in one transaction, but adminProductModel.updateVariant also sets stock_quantity without inserting history. Variant creation accepts initial stock too.

D5 must decide whether every manual change to existing stock is audited, whether initial quantities are included, and who may adjust stock. If complete manual-change history is rejected, record the accepted narrower scope and make documentation accurate; do not implement a fictional audit guarantee.

## Implementation path if full manual-change audit is selected

- [ ] Inventory every stock writer: variant creation/edit, dedicated adjustment, checkout, cancellation, seeds, imports/scripts. Classify manual vs automated and initial stock vs subsequent adjustment.
- [ ] Use one operation for manual changes, accepting verified employee identity from authentication and a nonblank reason. Do not trust a client-supplied employee ID or invent a placeholder employee.
- [ ] Under the shared lock order, lock the variant, read the actual previous quantity, write the new quantity, insert exactly one history row, and commit together. Define no-op audit behavior explicitly.
- [ ] Decide in D5 whether to retain this as a shared transactional model function or enforce a DB routine plus privileges. Creating a DB function alone does not prevent another SQL update from bypassing the audit.
- [ ] Make variant-edit and dedicated-adjustment paths obey the same policy; retain catalog/stock field permissions. B must know whether the variant form needs a reason or must direct users to the inventory screen.
- [ ] Do not log checkout or cancellation as a manual adjustment with a fake employee. Automated movement history is a separate scope decision.
- [ ] Define immutability under the runtime account if required: prevent editing/deleting existing adjustment records while allowing inserts/reads. Correction entries need a documented policy, not mutation of past entries.
- [ ] V27 sets variant updated_at. Do not restore explicit timestamp assignments or update stock a second time from an audit trigger.
- [ ] Retain existing historical records without fabricating missing provenance. Document the cutover point at which the stronger guarantee begins.
- [ ] Coordinate any DB routine/grants with E's 8.11 account plan and avoid unsafe SECURITY DEFINER/search-path behavior.

## Acceptance

- [ ] Manual change through each supported UI/API path has correct old/new quantities, employee, reason, timestamp, and one record.
- [ ] Concurrent adjustments serialize; each entry's previous quantity matches the committed sequence.
- [ ] Concurrent checkout/cancellation and manual adjustment have a documented serial outcome without lost arithmetic.
- [ ] Missing reason, forged actor, invalid role, and negative stock reject both writes.
- [ ] Failure between stock write and audit insertion rolls both back.
- [ ] Initial stock policy, no-op policy, and runtime audit immutability behave as D5 specifies.
- [ ] Product prices/attributes/images, S3 flow, existing inventory reports, and V27 behavior remain intact.

## Definition of Done

D5 is resolved, both manual writer paths satisfy it, real DB tests pass, and B/E receive the exact API/grant changes. If narrowed by user decision, the explicit scope and why a routine is unnecessary are recorded instead of marking an unimplemented audit feature complete.

