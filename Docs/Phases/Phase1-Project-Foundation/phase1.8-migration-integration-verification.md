# Phase 1.8: Migration Integration & Verification

> **Parent Phase:** [Phase 1: Project Foundation & Database](phase1-project-foundation.md)
> **Status:** Not Started
> **Assigned To:** E (lead) + A, B, C, D (each verifies their own tables)
> **Depends On:** 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
> **Blocks:** Phase 2

---

## Goal

Merge all members' migrations and seeds and prove the whole database builds from scratch in one run.

---

## Tasks

### E — Integration
- [ ] Merge all migration files and confirm they match the version map in [phase1-project-foundation.md](phase1-project-foundation.md#flyway-migration-version-map)
- [ ] Run all migrations V1–V19 on an empty database with no errors
- [ ] Run all seed files `01`–`07` in order with no errors
- [ ] Confirm [DB_Schema.md](../../Database/DB_Schema.md) matches the real database

### A, B, C, D, E — Self-Verification (each member, own tables)
- [ ] A — row counts and FK links correct for taxonomy tables
- [ ] B — row counts and FK links correct for customer/cart tables
- [ ] C — 40 products, variants, and images present; images load from BYTEA
- [ ] D — order totals match their line items; every order has a payment and delivery row
- [ ] E — admin login credentials work against the seeded hash; cities present

---

## Definition of Done

- `docker-compose down -v && docker-compose up db migrations seed` succeeds from scratch.
- Every member has ticked their self-verification task.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

