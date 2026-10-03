# Phase 1.3: Identity & Location Schema

> **Parent Phase:** [Phase 1: Project Foundation & Database](phase1-project-foundation.md)
> **Status:** Complete
> **Assigned To:** E
> **Depends On:** — (needs 1.2 to run locally)
> **Blocks:** 1.8
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Create the tables for user accounts, employees, refresh tokens, and delivery cities, plus their seed data.

---

## Tables Owned

`users`, `employees`, `refresh_tokens`, `cities`

---

## Tasks

### Migrations
- [x] `V1__create_users.sql` — `users` table, unique `email`, `role` CHECK (`'customer'`, `'admin'`)
- [x] `V2__create_cities.sql` — `cities` table
- [x] `V3__create_employees.sql` — `employees` table, unique FK to `users`
- [x] `V4__create_refresh_tokens.sql` — `refresh_tokens` table, FK to `users` with `ON DELETE CASCADE`
- [x] Indexes: `refresh_tokens(user_id)`, `refresh_tokens(token_hash)`

### Seed — `01_identity.sql`
- [x] Texas cities: main cities (`is_main_city = true`, e.g. Austin, Dallas, Houston, San Antonio) and regional cities (`is_main_city = false`)
- [x] One admin user (bcrypt-hashed password; write the dev credentials in `README.md`)
- [x] 2–3 employee users (`role = 'admin'`) with matching `employees` rows

### Documentation
- [x] Add any new constraints/indexes to [DB_Schema.md](../../Database/DB_Schema.md)

---

## Definition of Done

- Migrations V1–V4 run cleanly on an empty database.
- `01_identity.sql` runs without errors and is safe to re-run on a fresh DB.
- No hard-coded IDs from other members' tables.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

