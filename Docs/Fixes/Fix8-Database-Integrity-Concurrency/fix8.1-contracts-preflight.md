# Fix 8.1: Contracts, Data Preflight & Migration Coordination

> **Parent:** [Fix 8](fix8-database-integrity-concurrency.md)  
> **Status:** Complete  
> **Assigned To:** E (lead), D (cart/payment decisions), C (catalog/audit decisions)  
> **Priority:** Critical  
> **Depends On:** Existing Phase 1, 5, 6, 7 and Fix 4 implementations  
> **Blocks:** Implementation of 8.2–8.11; release gate 8.12  

---

## Executive Summary

Fix 8.1 establishes the verified factual baseline, read-only preflight audit, resolved decision register (D1–D9), contract handoffs, and reserved Flyway migration ledger for all database integrity and concurrency hardening (Fix 8.2 through Fix 8.12).

---

## 1. Environment & Target Baseline Inspection

| Property | Verified Value | Evidence Source |
|---|---|---|
| **Git Branch** | `dev` | `git status` (clean working tree) |
| **Git Commit** | `c42e193` | Latest merge commit on `dev` |
| **Node.js Runtime** | `v24.10.0` | `node -v` |
| **PostgreSQL Version** | `PostgreSQL 15.19 on x86_64-pc-linux-musl (Alpine 15.2.0)` | `SELECT version();` |
| **Target Database** | `brightbuy` on port `5432` | `backend/src/config/db.js` |
| **Test Suite Baseline** | 141 passed / 17 suites passed | `npx jest --runInBand` |
| **Product Validation Suite** | 5 passed / 5 passed | `npm run test:product` |
| **S3 Infrastructure Suite** | 5 passed / 5 passed | `npm run test:s3` |
| **Lint Baseline** | 0 errors, 5 warnings (`no-unused-vars`) | `npm run lint` |
| **Migrations in Codebase** | `V1` through `V28` | `backend/db/migrations/` |
| **Applied Flyway Migrations** | `V1`–`V21`, `V24`, `V26`, `V25` (24 total) | `SELECT * FROM flyway_schema_history` |
| **V27 / V28 Application State** | Code present in repo; **NOT yet applied** to active DB | `information_schema.triggers` has 0 triggers on `products`/`product_variants` |

---

## 2. Read-Only Data Preflight Audit Results

A comprehensive read-only audit of the active PostgreSQL database was executed to detect dirty data prior to adding database constraints.

| Area | Inspection Metric | Result | Violation / Repair Needed |
|---|---|---|---|
| **Carts** | Duplicate active carts per customer | **0 duplicates** (9 carts for 9 distinct customers) | None. Ready for `UNIQUE(customer_id)`. |
| **Deliveries** | Deliveries per order | **0 duplicates** (48 deliveries for 48 orders; 1:1) | None. Ready for `UNIQUE(order_id)`. |
| **Delivery Statuses** | Invalid status strings | 25 pending, 8 delivered, 6 cancelled, 3 in_transit, 2 out_for_delivery, 2 shipped, 2 processing | All values valid. Mode constraints ready. |
| **Payments** | Payments per order | **0 duplicates** (48 payments for 48 orders; 1:1) | None. Ready for `UNIQUE(order_id)`. |
| **Transaction IDs** | Duplicate non-null transaction IDs | **0 duplicates** (35 non-null, 13 null for COD/pending) | None. |
| **Orders** | Negative amounts & invalid statuses | 48 total orders; **0 negative amounts**; all valid statuses | None. |
| **Categories** | Circular parent-child hierarchy | **0 cycles** across 11 category records | None. Ready for acyclic trigger. |
| **Super Admins** | Total and active super admin count | 2 total super admins, **2 active** | Invariant satisfied (>0). Ready for guard trigger. |
| **Staff Roles** | Employee role distribution | 2 super_admin, 1 inventory_manager, 1 catalog_manager, 1 order_dispatcher, 1 analyst (all active) | All roles conform to schema. |
| **Variants** | Negative stock or negative price | 98 variants; **0 negative stock**, **0 negative price** | None. |
| **Inventory Adjustments** | Audit coverage | 3 records covering 3 variants | Auditing functional; needs universal trigger. |

**Audit Conclusion:** Zero existing data corruptions or duplicate key conflicts exist in the database. All proposed constraints can be introduced safely without destructive data repair.

---

## 3. Account, Privilege & Deployment Infrastructure Audit

1. **Database Roles:** Currently, the application connects exclusively using the superuser `postgres`. No separated application runtime role exists.
2. **CI Pipeline (`.github/workflows/ci.yml`):** Runs PostgreSQL 15 service container, executes `npm run lint`, `npm test`, and `npm run test:product`. **Note:** Flyway migrations are not currently executed in CI; unit tests pass because pg is mocked.
3. **CD Pipeline (`.github/workflows/cd.yml`):** Connects to AWS EC2 and runs `docker compose -f docker-compose.prod.yml up -d --build`. **Note:** `docker-compose.prod.yml` contains no Flyway migration service container.
4. **Remediation Plan (E):**
   - Fix 8.11 will introduce `brightbuy_app` (runtime least-privilege) and `brightbuy_migrator` (DDL owner).
   - Fix 8.12 will integrate Flyway migration verification before application launch in deployment.

---

## 4. Decision Register (Resolved D1–D9)

| ID | Decision Item | Owner | Resolution & Required Implementation | Blocks |
|---|---|---|---|---|
| **D1** | Payment cardinality & attempt history | D + E | **1:1 payment per order.** `payments` table maintains 1 canonical row per order (`UNIQUE(order_id)`). New attempts update status and transaction ID in-place. Frontend response shapes (`order.payment`) remain preserved. | 8.4, 8.5, 8.9 |
| **D2** | Order transition matrix & cancellation | D + C | **Strict finite state machine enforced in DB.**<br>- `pending` → `paid` (card webhook) or `pending` → `shipped` (COD dispatch).<br>- `paid` → `shipped` → `delivered`.<br>- Cancellation permitted from `pending` or `paid` (restores stock atomically).<br>- `cancelled` orders **NEVER** flip to `paid` upon late webhooks (late payments recorded as audit notice, not state change). | 8.4, 8.5, 8.9 |
| **D3** | Checkout concurrency & cart uniqueness | D + B | **Atomic cart lock & customer cart uniqueness.**<br>- Add `UNIQUE (customer_id)` on `carts`.<br>- `createOrder` locks cart row (`SELECT ... FROM carts WHERE customer_id = $1 FOR UPDATE`).<br>- Sort variants and lock with `FOR UPDATE OF product_variants` (avoiding product table escalation).<br>- Support `X-Idempotency-Key` header for safe client retries. | 8.3, 8.9 |
| **D4** | Delivery cardinality & mode constraints | D + B | **1:1 delivery per order.** Add `UNIQUE (order_id)` on `deliveries`. Check constraint restricts valid statuses by `delivery_mode` (`home_delivery` vs `store_pickup`). | 8.5, 8.9 |
| **D5** | Manual inventory audit scope | C + E | **Universal inventory audit.** Any update to `stock_quantity` in `product_variants` (via admin variant edit or inventory adjust) must create an `inventory_adjustments` entry with `employee_id` and mandatory `reason`. | 8.8, 8.9, 8.11 |
| **D6** | Super admin guard scope | E | **Database trigger protecting last active super admin.** A `BEFORE UPDATE OR DELETE` trigger on `employees` prevents reducing active super admin count below 1 across deactivations, demotions, and deletions. | 8.6, 8.9 |
| **D7** | Category hierarchy acyclic guard | C | **Database triggers preventing hierarchy cycles.** V33 takes a transaction advisory lock before category INSERT/UPDATE statements, then checks the complete statement result with a cycle-safe recursive CTE. It rejects category-ID changes and non-READ COMMITTED category writes. Named `P0001` errors map to HTTP 400. This covers concurrent and multi-row reparenting that a row-only trigger misses. | 8.7 |
| **D8** | Error mapping & API contract stability | D + C + E | **Standardized HTTP conflict mapping.** Named constraint violations (`idx_carts_customer_id_unique`, `idx_payments_order_id_unique`, etc.) map to HTTP 409 Conflict with descriptive payload `{ error: 'conflict', message: '...', statusCode: 409 }`. Triggers map to HTTP 400 Bad Request. | 8.3–8.10 |
| **D9** | Database accounts & security roles | E | **Role separation.** Create runtime role `brightbuy_app` with DML grants (`SELECT, INSERT, UPDATE, DELETE`) on public tables and `USAGE, SELECT` on sequences. Migration role `brightbuy_migrator` retains DDL privileges. | 8.11, 8.12 |

---

## 5. Canonical Transaction Lock Ordering Protocol

To prevent database deadlocks across checkout, cancellation, payment webhooks, and inventory management, all multi-table transactions MUST acquire row locks in this strict sequential order:

```text
1. Carts (customer level lock: SELECT ... FROM carts WHERE customer_id = $1 FOR UPDATE)
2. Orders (order level lock: SELECT ... FROM orders WHERE order_id = $1 FOR UPDATE)
3. Payments (payment row lock: SELECT ... FROM payments WHERE order_id = $1 FOR UPDATE)
4. Product Variants (variant rows sorted ascending: SELECT ... FROM product_variants WHERE variant_id = $1 FOR UPDATE OF product_variants)
5. Deliveries (delivery row lock)
6. Cart Items / Order Items / Inventory Adjustments
```

**Lock Rules:**
- Always acquire variant locks in ascending numerical order (`ORDER BY variant_id ASC`).
- Never perform HTTP network requests (e.g. Lemon Squeezy API, S3, SMTP) while holding a database client transaction lock.

---

## 6. Reserved Flyway Migration Ledger

To prevent migration version collisions across team members, versions V29 through V35 are officially allocated:

| Version | Migration Script Name | Assigned Member | Scope | Prerequisites |
|---|---|---|---|---|
| **V27** | `V27__set_catalog_updated_at_on_update.sql` | C (Seed), E (Verify) | Existing catalog update timestamp triggers | Existing schema |
| **V28** | `V28__apparel_variant_matrix_seed.sql` | C | Existing apparel seed matrix | V27 |
| **V29** | `V29__cart_uniqueness_and_checkout_concurrency.sql` | **D** | `UNIQUE(customer_id)` on `carts`, indexes | Preflight clean (verified) |
| **V30** | `V30__order_transitions_and_payment_uniqueness.sql` | **D** | `UNIQUE(order_id)` on `payments`, order state checks | D1, D2 |
| **V31** | `V31__delivery_cardinality_and_mode_constraints.sql` | **D** | `UNIQUE(order_id)` on `deliveries`, mode CHECK constraints | D4 |
| **V32** | `V32__super_admin_protection_trigger.sql` | **E** | Database trigger guarding last active super admin | D6 |
| **V33** | `V33__category_cycle_prevention_trigger.sql` | **C** | Database trigger preventing circular taxonomy | D7 |
| **V34** | `V34__inventory_adjustment_audit_trigger.sql` | **C** | Trigger auditing manual variant stock updates | D5 |
| **V35** | `V35__app_database_role_and_grants.sql` | **E** | Least privilege runtime role `brightbuy_app` setup | D9, V29–V34 |

---

## 7. Tasks Checklist

- [x] Record branch/commit, outstanding changes, PostgreSQL version, migration files, and actual flyway_schema_history on an authorized test target.
- [x] Inspect current route/controller/model/frontend contracts for all touched operations.
- [x] Verify the revised Fix 6 baseline using its issue/evidence ledgers.
- [x] Record a reproducible baseline of tests and lint (141 tests passing, 0 lint errors).
- [x] Capture sanitized provider sandbox event samples and verify event identity and webhook flows.
- [x] Prepare read-only preflight queries for duplicate carts, deliveries, payments, category cycles, super admin counts, and variant stock.
- [x] Record preflight results (0 violations found; clean database confirmed).
- [x] Inventory database owner, runtime accounts, CI setup, and deployment mechanisms.
- [x] Build fixture/test-environment plan for Fix 8.12.
- [x] Resolve and document Decision Register items D1 through D9.
- [x] Reserve and document Flyway migration ledger (V29 through V35).

---

## 8. Definition of Done

- [x] Every D1–D9 row has a resolved decision, rationale, and owner handoff.
- [x] Schema changes and new API contracts are concrete for B/A to implement without guessing.
- [x] Read-only preflight report and data-repair blockers are recorded (0 blockers).
- [x] Migration versions, lock order, role/object ownership, test environment, and rollout prerequisites are agreed.
- [x] Status updated in Fix 8 overview and master fixes tracker.
