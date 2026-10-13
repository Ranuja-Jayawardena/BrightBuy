# Fix 7.1: Contracts, Data Preflight & Migration Coordination

> **Parent:** [Fix 7](fix7-database-integrity-concurrency.md)
> **Status:** Not Started
> **Assigned To:** E (lead), D (cart/payment decisions), C (catalog/audit decisions)
> **Priority:** Critical
> **Depends On:** Existing Phase 1, 5, 6, 7 and Fix 4 implementations; verify actual baseline below
> **Blocks:** Implementation of 7.2–7.11 where the corresponding contract is unresolved; release gate 7.12

## Read first

[Project tracker](../../overallplan.md), [fix tracker](../overallplan.md), [discussion](../../db_improvements/Db_improvements_discussion.md), [schema](../../Database/DB_Schema.md), [migration version map](../../Phases/Phase1-Project-Foundation/phase1-project-foundation.md), [payment interface](../../Phases/Phase6-Payment-Integration/phase6-payment-integration.md), [Fix 4.3 fulfillment](../Fix4-Role-Permissions-Operations/fix4.3-order-delivery-mode-fulfillment.md), and [Fix 6.2 schema cutover](../Fix6-Cloud-Media-Storage-S3/fix6.2-s3-schema-migration-seed-cutover.md). The SRS is excluded from the authority for this fix at the user's instruction.

## Tasks: inspect without guessing

- [ ] Record branch/commit, outstanding changes, PostgreSQL version, migration files, and actual flyway_schema_history on an authorized test target. Treat V27 as code present, application status unknown until inspected.
- [ ] Inspect current route/controller/model/frontend contracts for all touched operations. Record actual response shapes and status codes; do not infer them from old prose.
- [ ] Verify the revised Fix 6 baseline using its [issue/evidence ledgers](../Fix6-Cloud-Media-Storage-S3/fix6-contracts-verification-rollout.md). Its documentation discrepancy is reconciled to 0/4 verified complete; actual runtime/migration evidence remains pending. Do not infer direct URL UI or safe upload lifecycle is implemented.
- [ ] Record a reproducible baseline of tests and lint. Previously 139 mocked/backend tests passed, while two full-backend lint errors existed in paymentController. Re-run rather than copy old results as new evidence.
- [ ] Capture sanitized provider sandbox event samples and verify event identity, transaction identity, custom local-order correlation, amount units/currency, retries, and refunds against provider documentation at implementation time. Never assume payload.meta.webhook_id exists or that provider order IDs are BrightBuy order IDs.
- [ ] Prepare read-only preflight queries for duplicate carts/customer, deliveries/order, payments/order, and non-null transaction IDs; invalid statuses/negative values; category cycles; number of active super admins; and inventory history coverage.
- [ ] For every dirty-data result, record affected IDs/counts and a proposed repair separately. Fail the enforcement rollout until the repair is reviewed. Never merge carts, discard payment rows, clamp amounts, or delete deliveries automatically.
- [ ] Inventory actual database owner, runtime account grants, sequence/function privileges, CI setup, seed order, and deployment migration mechanism. Do not print credentials or copy .env contents into docs.
- [ ] Build the sanitized fixture/test-environment plan for 7.12. No tests against shared dev or production data.

## Decision register (must be filled before dependent implementation)

These are implementation gates, not silent permission requests for unrelated work. The owner records the selected behavior and evidence; unresolved business policy is raised to the user.

| ID | Decision and required output | Owner | Suggested direction; not yet confirmed | Blocks |
| --- | --- | --- | --- | --- |
| D1 | One current payment/order versus payment-attempt history; exact schema/read behavior, identity keys, and upgrade path | D + E | Preserve current UI response shape; store enough attempt/event identity to reject stale failures. Do not add payments.order_id uniqueness until chosen. | 7.4, 7.5, 7.9 |
| D2 | Order transition matrix for card and COD; who can mark paid; cancel/refund/late-success behavior | D, C review | Preserve existing legitimate COD/pickup flow. Keep cancelled orders cancelled; persist late money events for reconciliation instead of silently losing them. Refunds are a distinct decision, not failed-payment events. | 7.4, 7.5, 7.9 |
| D3 | Checkout retry identity, cart-state versioning if needed, exact header/body fields, replay/error responses, retention | D + B | Lock checkout and every cart mutation; add request identity for safe retries. New intentional purchases need distinct identity; reject key reuse with different inputs. | 7.3, 7.9 |
| D4 | Delivery cardinality and valid status values by fulfillment mode | D + B | At most one delivery/order, if split shipments are not supported. Preserve ready_for_pickup and collected. | 7.5, 7.9 |
| D5 | Manual inventory audit scope, actor/reason source, initial stock policy, catalog-manager permission, historical correction policy | C + E + B | Every manual change to existing stock uses one audited path. Checkout/cancellation are separate automated movements. Do not fabricate historical actors/reasons. | 7.8, 7.9, 7.11 |
| D6 | Staff guard scope: last active super admin, bootstrap, cascaded user delete, role-change coverage, concurrency design | E | Require one after bootstrap; count and writes must be serialized in the DB. | 7.6, 7.9 |
| D7 | Category guard mutation coverage and concurrency design | C | Acyclic hierarchy across all supported writers; no invented depth cap. | 7.7 |
| D8 | SQLSTATE/constraint-name mapping and stable API errors | D + C + E; B/A consume | Retain existing success shapes. Publish every new client-visible conflict with status and example body. Never expose SQL. | 7.3–7.10 |
| D9 | Database account names, owners, grants, and migration/seed/deploy sequence | E | Separate runtime and migration accounts; no per-employee database login. | 7.11, 7.12 |

## Contract handoff template

For each affected endpoint fill: existing route/method; required/optional input; success JSON/status; duplicate/replay behavior; conflict JSON/status; authorization; side effects; notification event identity; backward compatibility; frontend consumer; test IDs. Until that row is filled, consumers may prepare tests/mock screens but must not guess an API.

Record transaction lock order here before changing writers. It must cover cart/customer gates, orders, payments/attempts, variants, and any product locks caused by joins. Every operation needs the same relative order for resources it shares; do not hold database locks while waiting for the payment provider or SMTP.

## Migration ledger

| Change family | Author | Allocated version/filename | Prerequisites |
| --- | --- | --- | --- |
| Catalog timestamps | C; E verifies | Existing V27__set_catalog_updated_at_on_update.sql | V9/V10 tables; validate full preceding migration chain |
| Cart uniqueness/request identity | D | Unallocated: E assigns next free versions | D3; duplicate-cart preflight |
| Order/payment guards, identity | D | Unallocated | D1/D2; compatible handlers; financial preflight |
| Delivery/value constraints | D | Unallocated | D4; writer compatibility |
| Staff protection | E | Unallocated | D6 |
| Category protection | C | Unallocated | D7 |
| Audit storage/routine if selected | C | Unallocated | D5 |
| Grants/ownership provisioning | E | Decide versioned SQL vs secure provisioning in D9 | Final object ledger and bootstrap credentials |

Do not assign all authors the same next number. Cross-link the final ledger with Phase 1 before anyone writes migrations.

## Definition of Done

- [ ] Every D1–D9 row has a resolved decision, rationale, and owner handoff, or a named explicit scope exclusion accepted by the user.
- [ ] Schema changes and new API contracts are concrete enough for B/A to implement without guessing.
- [ ] Read-only preflight report and data-repair blockers are recorded.
- [ ] Migration versions, lock order, role/object ownership, test environment, and rollout prerequisites are agreed.
- [ ] Update the parent and both trackers only when this actual work is done; authoring this plan does not complete the item.
