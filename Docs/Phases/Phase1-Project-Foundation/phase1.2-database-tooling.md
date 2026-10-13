# Phase 1.2: Database Tooling (Postgres, Flyway, Seed Runner, pg.Pool)

> **Parent Phase:** [Phase 1: Project Foundation & Database](phase1-project-foundation.md)
> **Status:** Complete
> **Assigned To:** E
> **Depends On:** 1.1
> **Blocks:** 1.8 (and local testing of 1.3 – 1.7)

---

## Goal

Provide the database tooling every member needs to run and test their own migration and seed SQL locally.

---

## Tasks

- [x] Create `docker-compose.yml` with a PostgreSQL service (named volume, healthcheck)
- [x] Add any database init scripts in `backend/db/init/` (e.g., `01-create-db.sql`)
- [x] Add the Flyway migration container to `docker-compose.yml`, pointing at `backend/db/migrations/`
- [x] Add the seed runner container (Postgres client) that runs `backend/db/seed/*.sql` in filename order **after** migrations
- [x] Configure the `pg` driver in Express with connection pooling (`pg.Pool`) in `backend/src/config/`
- [x] Add a database health check endpoint (`GET /api/health`) that runs `SELECT 1`
- [x] Write short "how to run migrations and seeds locally" instructions in `README.md`

---

## Definition of Done

- `docker-compose up db migrations seed` runs migrations and seeds from an empty database.
- The backend connects through `pg.Pool` and `GET /api/health` returns `200`.
- Members can drop their migration/seed files into the folders and run them without help.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

## Fix 7 follow-up

Database integrity and concurrency work is tracked separately in [Fix 7](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 7.1: Contracts, Data Preflight & Migration Coordination](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7.1-contracts-preflight.md)
- [Fix 7.11: Application & Migration Database Accounts](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7.11-database-account-separation.md)

Read the Fix 7 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
