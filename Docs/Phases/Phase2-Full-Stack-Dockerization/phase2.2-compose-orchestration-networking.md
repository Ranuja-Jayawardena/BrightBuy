# Phase 2.2: Compose Orchestration & Networking

> **Parent Phase:** [Phase 2: Full-Stack Dockerization](phase2-full-stack-dockerization.md)
> **Status:** Complete
> **Assigned To:** E
> **Depends On:** 2.1
> **Blocks:** 2.3

---

## Goal

Wire all five services together in `docker-compose.yml` with the correct start-up order.

---

## Tasks

- [x] Update `docker-compose.yml` to run 5 services:
  - [x] `db` — PostgreSQL container
  - [x] `migrations` — Flyway container (runs and exits)
  - [x] `seed` — Postgres client container for seed scripts (runs and exits)
  - [x] `backend` — Express.js container
  - [x] `frontend` — Next.js container
- [x] Set up Docker internal networking so containers talk to each other by service name
- [x] Enforce start-up order with healthchecks and `depends_on` conditions: `db` healthy → `migrations` completed → `seed` completed → `backend` → `frontend`
- [x] Load environment variables from `.env` files (never commit secrets)

---

## Definition of Done

- `docker-compose up` starts all services in the correct order with no manual steps.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

