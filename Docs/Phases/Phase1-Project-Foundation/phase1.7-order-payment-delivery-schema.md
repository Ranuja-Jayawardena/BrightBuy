# Phase 1.7: Order, Payment & Delivery Schema

> **Parent Phase:** [Phase 1: Project Foundation & Database](phase1-project-foundation.md)
> **Status:** Complete
> **Assigned To:** D
> **Depends On:** — (needs 1.2 to run locally)
> **Blocks:** 1.8
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Create the tables for orders, order line items, payments, and deliveries, plus realistic historical seed data for reports.

---

## Tables Owned

`orders`, `order_items`, `payments`, `deliveries`

---

## Tasks

### Migrations
- [x] `V16__create_orders.sql` — `status` CHECK (`pending`, `paid`, `shipped`, `delivered`, `cancelled`), CHECK `total_amount >= 0`
- [x] `V17__create_order_items.sql` — CHECK `quantity > 0`, `unit_price` snapshot column
- [x] `V18__create_payments.sql` — `payment_method` CHECK (`card`, `cod`), `payment_status` CHECK (`pending`, `cod_pending`, `completed`, `failed`)
- [x] `V19__create_deliveries.sql` — `delivery_mode` CHECK (`home_delivery`, `store_pickup`), address snapshot columns, FK to `cities`
- [x] Indexes: `orders(customer_id)`, `orders(status, order_date)`, `order_items(order_id)`, `order_items(variant_id)`, `payments(order_id)`, `deliveries(order_id)`

### Seed — `07_orders.sql`
- [x] 30+ historical orders spread across several months and statuses (customers looked up by email, variants by `variant_sku`)
- [x] Matching `order_items`, `payments`, and `deliveries` rows
- [x] Order totals must equal the sum of their line items

### Documentation
- [x] Add any new constraints/indexes to [DB_Schema.md](../../Database/DB_Schema.md)

---

## Definition of Done

- Migrations V16–V19 run cleanly in the full migration sequence.
- Seeded orders are realistic enough to produce meaningful Phase 9 reports.
- No hard-coded IDs from other members' tables.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

