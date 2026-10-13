# Fix 8.6: Concurrent Super Admin Protection

> **Parent:** [Fix 8](fix8-database-integrity-concurrency.md)
> **Status:** Not Started
> **Assigned To:** E
> **Priority:** High
> **Depends On:** [8.1](fix8.1-contracts-preflight.md) D6/D8 and migration ledger
> **Blocks:** 8.9, 8.11, 8.12

## Baseline and references

[Fix 4.2 employee lifecycle](../Fix4-Role-Permissions-Operations/fix4.2-employee-lifecycle-role-management.md), [Phase 1.3 identity](../../Phases/Phase1-Project-Foundation/phase1.3-identity-location-schema.md), [Phase 7.4 staff API](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.4-inventory-employee-admin-apis.md), [Phase 10.7 RBAC](../../Phases/Phase10-Polish-Testing-Deployment/phase10.7-staff-rbac.md).

Inspect employee functions in backend/src/services/adminInventoryService.js and models/adminInventoryModel.js, authMiddleware.js, and V3/V21/V24. C owns inventory functions in these shared files; coordinate edits. Backend count-then-update is currently vulnerable to concurrent removal of different admins.

## Required invariant and design gate

After an explicit bootstrap, at least one employee has role=super_admin and is_active=true. Protect demotion, deactivation, deletion, multi-row operations, and cascaded deletion through users. Plain profile edits and activation/promotion must remain possible. No database connection is an individual employee; application self-action checks still use authenticated req.user.

- [ ] Audit whether zero active admins already exist. Do not automatically promote an arbitrary employee.
- [ ] Record a database-enforced serialization design in D6 before writing the guard. A plain COUNT in a row trigger or a process-local mutex is insufficient.
- [ ] Include how the design acquires a common gate before competing mutations, when it sees the final count, and which isolation levels are supported. A database guard row modified by relevant transactions plus final validation is a candidate; verify snapshot behavior on PostgreSQL rather than assuming a lock refreshes a snapshot.
- [ ] Handle changes to different employee rows, bulk changes, user cascades, and initial seeding. Do not use a per-row count that misses the final state of a multi-row statement.
- [ ] If a controlled function is chosen, restrict direct runtime writes that bypass it and preserve every authorized employee operation. If triggers are used, make direct SQL tests prove the invariant.
- [ ] Plan lock order with user/employee deletes and ensure any deadlock/serialization failure rolls back safely and receives a documented API response.
- [ ] Preserve existing self-demotion/self-deactivation protections and role checks. The new invariant does not weaken them.
- [ ] Map the known DB rejection to D8 and hand the conflict behavior to B. Do not expose SQL exception text.

## Acceptance tests

Use independent database sessions (direct SQL is needed because the API may disallow the particular self-action).

| Starting condition/action | Expected outcome |
| --- | --- |
| One active super admin; demote/deactivate/delete | Rejected; original row and access remain |
| Two active super admins; concurrent removals on different rows | At least one remains; both cannot commit removal |
| Bulk demotion/deactivation/delete of all active super admins | Transaction rejected |
| Delete the sole active admin's users row | Cascade cannot bypass protection |
| Promote/activate another admin, then remove the first | Allowed under D6 |
| Change only phone/name | Allowed without accidental account changes |
| Empty isolated database then approved first-admin seed | Bootstrap succeeds; protection then applies |
| Transaction rolls back after a guard operation | Guard state and staff data remain consistent |

## Definition of Done

- [ ] PostgreSQL tests cover all paths and supported isolation levels.
- [ ] Login, employee list/edit, deactivation, and middleware tests still pass.
- [ ] DB schema, D6 lock/bootstrapping design, and B's conflict contract are updated.

