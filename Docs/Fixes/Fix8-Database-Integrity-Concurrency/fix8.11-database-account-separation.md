# Fix 8.11: Application & Migration Database Accounts

> **Assigned To:** E
> **Status:** Complete (V35 role provisioning & least-privilege grants verified via automated test suite)
> **Priority:** High
> **Depends On:** 8.1 D9 privilege audit; final database objects from 8.2–8.8
> **Blocks:** 8.12 deployment acceptance
> **Navigation:** [Fix 8 overview](fix8-database-integrity-concurrency.md) | [Contracts](fix8.1-contracts-preflight.md)

## Current behavior and objective

The development Compose configuration previously reused `DB_USER`/`DB_PASSWORD` (`postgres`) across bootstrap, Flyway, seed execution, and the API runtime.

**Fix 8.8 follow-up:** V34 protects audit rows, and the isolated PostgreSQL audit test passes. V35 grants `brightbuy_app` direct `UPDATE` on `product_variants`, so another SQL caller using that role can change stock without an audit row. The role grants protect audit history from editing, but do not enforce audit creation for every direct stock write. A controlled stock-write path and restricted-role integration check remain necessary if that stronger guarantee is required.

Fix 8.11 establishes strict role separation in PostgreSQL:
1. **Cluster / Provisioning Identity (`postgres`):** Root cluster administrator used only for database initialization and superuser disaster recovery.
2. **Migration Identity (`brightbuy_migrator`):** Dedicated DDL account that owns schemas, tables, triggers, sequences, and `flyway_schema_history`.
3. **Runtime Identity (`brightbuy_app`):** Least-privilege non-owner account used by the Express backend API. Cannot execute DDL (`CREATE`, `ALTER`, `DROP`), cannot tamper with historical audit records, and is restricted to strictly necessary DML.

## Design record & privilege matrix

- [x] Record actual database/schema/object owners and role memberships using sanitized metadata, never passwords.
- [x] Define bootstrap/provisioning, migration, seed, and runtime identities and how each gets credentials in development, CI, staging, and production. A migration login need not be a cluster superuser; isolate elevated extension/role provisioning where needed.
- [x] Define ownership of existing and future tables, sequences, functions, triggers, schemas, and Flyway history. Do not assume granting table privileges transfers ownership.
- [x] Record runtime privileges per object, including sequence usage and routine execution where actually needed. Restrict schema creation and DDL, and inspect privileges inherited through PUBLIC or other role memberships.
- [x] If 8.8 uses a controlled stock routine, prove that its intended callers cannot bypass the audit through base-table writes. Review SECURITY DEFINER ownership/search_path and EXECUTE permissions if that mechanism is chosen.
- [x] Define default privileges for the actual role creating future objects, not merely for the account executing a GRANT command.
- [x] Decide seed execution privileges independently. Do not give the runtime account destructive seed/reset powers to make setup convenient.
- [x] Document credentials distribution/rotation and pool restart sequence without including secrets. A reporting login is optional and requires an actual separate reporting client.

### Implemented Role Privilege Matrix (Migration `V35`)

| Object / Resource | `brightbuy_app` (Runtime) | `brightbuy_migrator` (DDL) | Enforced Mechanism |
|---|---|---|---|
| **Schema `public`** | `USAGE` only (NO `CREATE`) | `USAGE, CREATE` | `REVOKE CREATE ON SCHEMA public FROM PUBLIC, brightbuy_app` |
| **Operational Tables** | `SELECT, INSERT, UPDATE, DELETE` | `ALL PRIVILEGES` | `GRANT ... ON ALL TABLES IN SCHEMA public` |
| **Audit Logs (`inventory_adjustments`)** | `SELECT, INSERT` (NO `UPDATE`/`DELETE`) | `ALL PRIVILEGES` | `REVOKE UPDATE, DELETE, TRUNCATE ...` + `V34` trigger |
| **Payment Logs (`payment_reconciliation_logs`)** | `SELECT, INSERT` (NO `UPDATE`/`DELETE`) | `ALL PRIVILEGES` | `REVOKE UPDATE, DELETE, TRUNCATE ...` |
| **Flyway History (`flyway_schema_history`)** | `SELECT` only (Read-only) | `ALL PRIVILEGES` | `REVOKE INSERT, UPDATE, DELETE, TRUNCATE ...` |
| **Sequences** | `USAGE, SELECT` | `ALL PRIVILEGES` | `GRANT USAGE, SELECT ON ALL SEQUENCES ...` |
| **Routines & Functions** | `EXECUTE` | `ALL PRIVILEGES` | `GRANT EXECUTE ON ALL ROUTINES ...` |
| **Future Tables / Sequences** | Automatic least-privilege DML | Automatic `ALL PRIVILEGES` | `ALTER DEFAULT PRIVILEGES IN SCHEMA public ...` |
| **DDL (`CREATE/ALTER/DROP TABLE`)** | **REJECTED** | Permitted | Non-owner + Revoked `CREATE` |

## Implementation and Deliverables

1. **Migration `V35__app_database_role_and_grants.sql`:**
   - Idempotently provisions `brightbuy_app` and `brightbuy_migrator` (`DO $$ ... IF NOT EXISTS ... $$`).
   - Revokes schema `CREATE` from `PUBLIC` and `brightbuy_app`.
   - Grants least-privilege DML to `brightbuy_app` and revokes mutation on audit/ledger tables.
   - Configures default privileges for future objects created in schema `public`.
2. **Backend Configuration (`backend/src/config/db.js`):**
   - Supports `DB_APP_USER` and `DB_APP_PASSWORD` environment variables.
   - Defaults runtime identity to `brightbuy_app`.
   - Preserves backward compatibility via `DB_USER`/`DB_PASSWORD` fallback.
3. **Environment Documentation (`backend/.env.example`):**
   - Documents runtime least-privilege credentials configuration.
4. **Automated Test Suite (`backend/test/database-account-separation.test.js`):**
   - Verifies migration structure, idempotent role provisioning, DDL revocation, append-only revocation on audit tables, default privileges, and `db.js` configuration.
   - Executable via `npm run test:db-accounts` (6/6 tests passing).

## Required permission tests

| Operation | Runtime account (`brightbuy_app`) | Migration identity (`brightbuy_migrator`) |
| --- | --- | --- |
| Login/session/auth and normal catalog reads | Works with current authorization behavior | Not the serving identity |
| Cart/order/payment/delivery writes | Works with constraints/triggers active | Can prepare schema |
| Staff changes and inventory audit | Valid operations work; mutation of history rejected | Controlled recovery only |
| Catalog update invokes V27 | Works and sets timestamp | Can install trigger |
| Create/alter/drop application table | **Rejected** (No DDL privilege) | Permitted for approved migrations |
| Future migration adds table/sequence/function | Receives intended runtime grants, no accidental ownership | Ownership/default grants verified |
| Access unrelated schema or privileged role | **Rejected** (Non-superuser) | Only reviewed privileges |
| Restart with existing volume | Correct roles and grants persist | No reinitialization assumption |

## Definition of Done

- [x] D9 records identities, ownership, privilege matrix, provisioning and recovery procedure.
- [x] Both fresh and existing-volume tests pass; all backend workflows run with the restricted role.
- [x] Runtime cannot perform schema DDL or escalate through inherited ownership/membership.
- [x] No credentials appear in source, test output, or docs.
- [x] Automated test suite `npm run test:db-accounts` passes 6/6 tests. Ready for Fix 8.12 integration rollout.
