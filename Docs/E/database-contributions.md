# Database Contributions — Team Member E (DevOps & Architecture)

**Project:** BrightBuy  
**Role:** Team Member E  
**Focus:** Database Tooling, Core Schema, Security Architecture & Role Separation  
**Single Source of Truth:** `Docs/Database/DB_Schema.md`

---

## Overview

In BrightBuy, database responsibilities were split across all team members. As **Member E**, my primary database contributions were:
1. **Setting up the entire database tooling environment** (Docker PostgreSQL, Flyway migrations, seed runner, connection pooling).
2. **Designing and maintaining the Identity and Location tables** (`users`, `employees`, `refresh_tokens`, `cities`).
3. **Implementing Database Security & Role Separation** (Least-privilege application account vs. migration admin).
4. **Enforcing Concurrency & Admin Protection Triggers** (preventing the accidental deactivation of the last Super Admin).

---

## 1. Database Tooling & Infrastructure (Phase 1.2)

Before any team member could write queries or build features, I set up the database development environment:

- **Containerized PostgreSQL 15:** Configured the PostgreSQL service in `docker-compose.yml` with health checks and persistent volume storage (`db-data`).
- **Flyway Database Migrations:** Integrated Flyway in a Docker container to run versioned `.sql` scripts (`V1`, `V2`, etc.) in sequential order. This gave the team deterministic schema version control.
- **Automated Seed Runner:** Created the containerized seed runner to load test data (`01_identity.sql` through `07_orders.sql`) in proper foreign-key dependency order after migrations execute.
- **Connection Pooling (`pg.Pool`):** In `backend/src/config/db.js`, I configured connection pooling with the `pg` driver to reuse database connections, set pool limits, handle disconnects gracefully, and monitor connection health.
- **Database Health Check Endpoint:** Created `GET /api/health` which executes `SELECT 1` against PostgreSQL to confirm live database connectivity.

---

## 2. Tables Owned & Designed (Phase 1.3: Identity & Location)

I owned the design, SQL migrations, constraints, indexes, and seed data for four core tables:

### A. `users` (`V1__create_users.sql`)
- **Purpose:** Stores credentials and global identity for all customers, employees, and admins.
- **Key Constraints:** `email` is `UNIQUE` and `NOT NULL`; `role` has a `CHECK` constraint restricting values to valid roles (`customer`, `admin`).
- **Security:** Passwords are never stored in plaintext; they are bcrypt-hashed before insertion.

### B. `cities` (`V2__create_cities.sql`)
- **Purpose:** Centralized city table used by shipping, delivery estimation, and address management.
- **Key Fields:** Contains `is_main_city` (boolean). This allows the order system to dynamically calculate delivery ETAs (e.g., 5 days for main metro hubs like Austin/Dallas, 7 days for regional areas).

### C. `employees` (`V3__create_employees.sql`)
- **Purpose:** Tracks staff details and organizational roles.
- **Relationship:** Enforces a 1-to-1 foreign key relationship to `users(user_id)` with `ON DELETE CASCADE`.
- **Role Control:** Distinguishes between standard staff and `Super Admin` privileges.

### D. `refresh_tokens` (`V4__create_refresh_tokens.sql`)
- **Purpose:** Supports custom JWT authentication without external auth libraries.
- **Indexes:** Indexed `user_id` and `token_hash` for fast token lookup and invalidation.
- **Cleanup:** `ON DELETE CASCADE` ensures that deleting a user instantly wipes their active refresh tokens.

### Seed Data (`backend/db/seed/01_identity.sql`)
- Seeded Texas cities (major metros vs regional).
- Seeded default administrative accounts and staff users with pre-hashed, secure bcrypt credentials.

---

## 3. Database Security & Least-Privilege Accounts (Fix 8.11)

In early development, the backend connected using the superuser `postgres` account. To satisfy database security standards, I implemented **Database Account Separation** via migration `V35__app_database_role_and_grants.sql`:

We created three distinct database roles with clear boundaries:

| Role Name | Used By | What It Can Do | What It Cannot Do |
|-----------|---------|----------------|-------------------|
| **`postgres`** | Cluster Administrator | Disaster recovery and cluster bootstrap only. | Not used by running apps. |
| **`brightbuy_migrator`** | Flyway Container | Creates, alters, and drops tables, triggers, and schemas (DDL). | Not exposed to web requests. |
| **`brightbuy_app`** | Express Backend API | Reads and writes operational data (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). | **Cannot execute DDL (`CREATE/ALTER/DROP TABLE`).** |

### Additional Protections Enforced:
1. **Append-Only Audit Tables:** Revoked `UPDATE`, `DELETE`, and `TRUNCATE` from `brightbuy_app` on audit tables (like `inventory_adjustments` and `payment_reconciliation_logs`). Once an audit log is written, even the application backend cannot alter or erase it.
2. **Default Privileges:** Configured `ALTER DEFAULT PRIVILEGES` so that any future tables created by migrations automatically grant the correct restricted permissions to `brightbuy_app`.

---

## 4. Concurrency & Super-Admin Protection (Fix 8.6)

- **The Problem:** In a multi-admin system, two administrators might simultaneously try to deactivate or demote each other, potentially leaving the store with **zero Super Admins**.
- **The Solution:** Implemented a database trigger and constraint check that monitors employee role updates and deactivations. 
- **Enforcement:** The database verifies that at least one active Super Admin remains. If an update would reduce active Super Admins to zero, the transaction is rejected at the database level with an error.

---

## Quick Summary for the Lecturer

If asked: *"What was your personal contribution to the database?"*

> *"I set up the entire database infrastructure: Dockerized PostgreSQL, Flyway for versioned migrations, and the connection pooling setup in Express.*
>
> *I designed the Identity and Location schema — including `users`, `employees`, `refresh_tokens`, and `cities`.*
>
> *On the security side, I implemented least-privilege database accounts in PostgreSQL so the backend API cannot run destructive DDL or edit audit logs, and added database safeguards to prevent deleting the last Super Admin."*

