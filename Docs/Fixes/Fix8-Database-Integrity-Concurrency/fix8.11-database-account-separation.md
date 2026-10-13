# Fix 8.11: Application & Migration Database Accounts

> **Assigned To:** E
> **Status:** Not Started
> **Priority:** High
> **Depends On:** 8.1 D9 privilege audit; final database objects from 8.2–8.8
> **Blocks:** 8.12 deployment acceptance
> **Navigation:** [Fix 8 overview](fix8-database-integrity-concurrency.md) | [Contracts](fix8.1-contracts-preflight.md)

## Current behavior and objective

The current development Compose configuration reuses DB_USER/DB_PASSWORD for PostgreSQL bootstrap, Flyway, seed execution, and the API. Simply changing these values does not create separate accounts. PostgreSQL image initialization variables also do not recreate roles inside an existing persistent volume.

Give the running API a non-owner, non-superuser login with only its required data access. Use a distinct migration identity for schema changes. These are process identities, not employees.role values. Keep Express authorization; do not create a database user for every employee.

Read [database tooling](../../Phases/Phase1-Project-Foundation/phase1.2-database-tooling.md), [Compose orchestration](../../Phases/Phase2-Full-Stack-Dockerization/phase2.2-compose-orchestration-networking.md), [security hardening](../../Phases/Phase10-Polish-Testing-Deployment/phase10.5-security-hardening.md), and [production deployment](../../Phases/Phase10-Polish-Testing-Deployment/phase10.6-production-deployment.md). Inspect backend/src/config/db.js, docker-compose.yml, docker-compose.prod.yml, Flyway configuration, seed commands, and both CI/CD workflows.

## Design record required before edits

- [ ] Record actual database/schema/object owners and role memberships using sanitized metadata, never passwords.
- [ ] Define bootstrap/provisioning, migration, seed, and runtime identities and how each gets credentials in development, CI, staging, and production. A migration login need not be a cluster superuser; isolate elevated extension/role provisioning where needed.
- [ ] Define ownership of existing and future tables, sequences, functions, triggers, schemas, and Flyway history. Do not assume granting table privileges transfers ownership.
- [ ] Record runtime privileges per object, including sequence usage and routine execution where actually needed. Restrict schema creation and DDL, and inspect privileges inherited through PUBLIC or other role memberships.
- [ ] If 8.8 uses a controlled stock routine, prove that its intended callers cannot bypass the audit through base-table writes. Review SECURITY DEFINER ownership/search_path and EXECUTE permissions if that mechanism is chosen.
- [ ] Define default privileges for the actual role creating future objects, not merely for the account executing a GRANT command.
- [ ] Decide seed execution privileges independently. Do not give the runtime account destructive seed/reset powers to make setup convenient.
- [ ] Document credentials distribution/rotation and pool restart sequence without including secrets. A reporting login is optional and requires an actual separate reporting client.

## Implementation sequence

1. Rehearse role provisioning and grants on an isolated database containing all Fix 8 migrations.
2. Verify fresh bootstrap and upgrade of a persistent existing database separately. Do not delete a persistent volume to avoid handling existing ownership.
3. Apply grants to existing objects and future-object defaults; test before switching runtime credentials.
4. Run migrations using the migration identity and application flows using the runtime identity. Confirm trigger execution and any function dependencies under the restricted account.
5. Switch runtime credentials in the documented environment only after tests pass; restart the connection pool so old sessions are not mistaken for new-role verification.
6. Retest the application, then remove obsolete excessive grants according to the reviewed rollout. Do not blanket-revoke privileges that another legitimate migration/seed process needs.
7. Record operational steps and any actual AWS changes in the deployment documentation when implementation occurs. This planning document performs none.

## Required permission tests

| Operation | Runtime account | Migration/provisioning identity |
| --- | --- | --- |
| Login/session/auth and normal catalog reads | Works with current authorization behavior | Not the serving identity |
| Cart/order/payment/delivery writes | Works with constraints/triggers active | Can prepare schema |
| Staff changes and inventory audit | Valid operations work; protected operations rejected | Controlled recovery only |
| Catalog update invokes V27 | Works and sets timestamp | Can install trigger |
| Create/alter/drop application table | Rejected | Migration identity can execute approved migrations |
| Future migration adds table/sequence/function | Receives intended runtime grants, no accidental ownership | Ownership/default grants verified |
| Access unrelated schema or privileged role | Rejected unless explicitly required | Only reviewed privileges |
| Restart with existing volume | Correct roles and grants persist | No reinitialization assumption |

## Definition of Done

- [ ] D9 records identities, ownership, privilege matrix, provisioning and recovery procedure.
- [ ] Both fresh and existing-volume tests pass; all backend workflows run with the restricted role.
- [ ] Runtime cannot perform schema DDL or escalate through inherited ownership/membership.
- [ ] No credentials appear in source, test output, or docs.
- [ ] 8.12 includes the exact target-specific switch and fallback procedure. A temporary fallback must be reviewed, not an automatic return to a superuser account.
