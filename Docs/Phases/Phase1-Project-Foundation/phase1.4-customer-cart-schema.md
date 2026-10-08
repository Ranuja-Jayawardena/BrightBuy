# Phase 1.4: Customer & Cart Schema

> **Parent Phase:** [Phase 1: Project Foundation & Database](phase1-project-foundation.md)
> **Status:** Complete
> **Assigned To:** B
> **Depends On:** — (needs 1.2 to run locally)
> **Blocks:** 1.8
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Create the tables for customer profiles, saved addresses, and shopping carts, plus their seed data.

---

## Tables Owned
◊
`customers`, `addresses`, `carts`, `cart_items`

---

## Tasks

### Migrations
- [x] `V5__create_customers.sql` — `customers` table, unique FK to `users`
- [x] `V6__create_addresses.sql` — `addresses` table, FKs to `customers` and `cities`
- [x] `V14__create_carts.sql` — `carts` table, FK to `customers`
- [x] `V15__create_cart_items.sql` — `cart_items` table, unique `(cart_id, variant_id)`, CHECK `quantity > 0`, `ON DELETE CASCADE` from `carts`
- [x] Indexes: `addresses(customer_id)`, `carts(customer_id)`
- [x] Ensure at most one default address per customer (partial unique index on `addresses(customer_id) WHERE is_default`)

### Seed — `02_customers.sql`
- [x] 5–10 customer users (`role = 'customer'`, bcrypt-hashed passwords) with matching `customers` rows
- [x] 1–2 addresses per customer, cities looked up by `city_name`

### Seed — `06_carts.sql`
- [x] A few sample carts with items (variants looked up by `variant_sku` from C's published list)

### Documentation
- [x] Add any new constraints/indexes to [DB_Schema.md](../../Database/DB_Schema.md)

---

## Definition of Done

- Migrations V5, V6, V14, V15 run cleanly in the full migration sequence.
- Both seed files run without errors after the files before them.
- No hard-coded IDs from other members' tables.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

