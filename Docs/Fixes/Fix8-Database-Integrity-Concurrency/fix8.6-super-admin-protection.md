# Fix 8.6: Concurrent Super Admin Protection

> **Parent:** [Fix 8](fix8-database-integrity-concurrency.md)
> **Status:** Complete
> **Assigned To:** E
> **Priority:** High
> **Depends On:** [8.1](fix8.1-contracts-preflight.md) D6/D8 and migration ledger
> **Blocks:** 8.9, 8.11, 8.12

## Baseline and references

[Fix 4.2 employee lifecycle](../Fix4-Role-Permissions-Operations/fix4.2-employee-lifecycle-role-management.md), [Phase 1.3 identity](../../Phases/Phase1-Project-Foundation/phase1.3-identity-location-schema.md), [Phase 7.4 staff API](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.4-inventory-employee-admin-apis.md), [Phase 10.7 RBAC](../../Phases/Phase10-Polish-Testing-Deployment/phase10.7-staff-rbac.md).

Employee functions in [adminInventoryService.js](../../../backend/src/services/adminInventoryService.js), [adminInventoryModel.js](../../../backend/src/models/adminInventoryModel.js), [authMiddleware.js](../../../backend/src/middleware/authMiddleware.js), and migrations V3, V21, V24.

---

## Implemented Architecture & Serialization Protocol (D6 / V32)

1. **Migration V32:** [`backend/db/migrations/V32__super_admin_protection_trigger.sql`](../../../backend/db/migrations/V32__super_admin_protection_trigger.sql)
2. **Dedicated Serialization Gate:**
   - Table `super_admin_guard (id INT PRIMARY KEY, last_action TIMESTAMPTZ)` with single guard row `id = 1`.
   - When any transaction attempts to demote, deactivate, or delete an active super admin, it acquires an exclusive row lock on `super_admin_guard (id = 1)` via `UPDATE super_admin_guard SET last_action = clock_timestamp() WHERE id = 1;`.
   - This prevents race conditions between competing transactions attempting to deactivate different super admins simultaneously without causing full-table lock deadlocks.
3. **Multi-Row & Cascade Protection:**
   - `BEFORE UPDATE OR DELETE ON employees FOR EACH ROW`: Serializes mutations and enforces count invariant at row level.
   - `AFTER UPDATE OR DELETE ON employees FOR EACH STATEMENT`: Statement-level guard ensuring at least one active super admin remains after multi-row statements.
   - `AFTER DELETE ON users FOR EACH STATEMENT`: Statement-level guard preventing user cascade deletions from leaving zero super admins.
   - Initial database seeding (`INSERT`) is completely unconstrained, ensuring clean bootstrap.
4. **Error Mapping (D8):**
   - Trigger exceptions (`P0001`) are intercepted in [adminInventoryService.js](../../../backend/src/services/adminInventoryService.js) and [index.js](../../../backend/src/index.js), mapping cleanly to HTTP 400 Bad Request with standardized error payloads:
     - Demotion: `{ error: 'invalid_request', message: 'Cannot demote the last active super admin', statusCode: 400 }`
     - Deactivation: `{ error: 'invalid_request', message: 'Cannot deactivate the last active super admin', statusCode: 400 }`

---

## Tasks Checklist

- [x] Audit whether zero active admins already exist (Verified: 2 active super admins exist in baseline DB).
- [x] Record a database-enforced serialization design in D6 before writing the guard.
- [x] Include how the design acquires a common gate before competing mutations (Dedicated `super_admin_guard` row lock).
- [x] Handle changes to different employee rows, bulk changes, user cascades, and initial seeding.
- [x] Verify direct SQL tests prove the invariant (Node test runner suite: `npm run test:staff-protection`).
- [x] Plan lock order with user/employee deletes and ensure safe rollback on conflict.
- [x] Preserve existing self-demotion/self-deactivation protections and role checks.
- [x] Map the known DB rejection to D8 and hand the conflict behavior to B (Mapped to HTTP 400).

---

## Acceptance Test Results

All 8 conditions verified against live PostgreSQL 15 target:

| Scenario / Action | Expected Outcome | Verified Result |
| --- | --- | --- |
| One active super admin; demote/deactivate/delete | Rejected with P0001; rows intact | **PASS** (P0001 raised, 0 mutations committed) |
| Two active super admins; concurrent removals on different rows | Serialized; 1 committed, 1 rejected | **PASS** (C2 blocked on guard lock, rejected upon C1 commit) |
| Bulk demotion/deactivation/delete of all active super admins | Statement rejected | **PASS** (P0001 raised, all super admins remain active) |
| Delete the sole active admin's users row | Cascade blocked | **PASS** (P0001 raised, user & employee rows intact) |
| Promote/activate another admin, then remove the first | Allowed under D6 | **PASS** (Second admin promoted, first demoted smoothly) |
| Change only phone/name | Allowed without locking gate | **PASS** (Profile update succeeds without touching guard) |
| Empty isolated database then approved first-admin seed | Bootstrap succeeds | **PASS** (Initial super admin insert succeeds without error) |
| Transaction rolls back after a guard operation | Guard state and staff data remain consistent | **PASS** (Consistent rollback confirmed) |

---

## Definition of Done

- [x] PostgreSQL tests cover all paths and supported isolation levels (`npm run test:staff-protection` passes 9/9).
- [x] Login, employee list/edit, deactivation, and middleware tests pass (`npx jest --runInBand` passes 17/17 suites, 143/143 tests).
- [x] DB schema, D6 lock/bootstrapping design, and B's conflict contract are updated.

