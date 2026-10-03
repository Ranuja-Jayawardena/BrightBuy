# Phase 7.4: Inventory & Employee Admin APIs

> **Parent Phase:** [Phase 7: Inventory & Admin Dashboard](phase7-inventory-admin-dashboard.md)
> **Status:** Not Started
> **Assigned To:** C
> **Depends On:** 3.2
> **Blocks:** 7.6
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Give admins a stock overview with manual adjustments, plus employee account management.

---

## Tasks

- [ ] `GET /api/admin/inventory` — stock levels per variant, with low-stock filtering and search
- [ ] `PUT /api/admin/inventory/:variantId` — manually adjust stock quantity (with reason)
- [ ] `POST /api/admin/employees` — create an employee account (`users` + `employees` rows in one transaction, bcrypt-hashed password)
- [ ] `GET /api/admin/employees` — list all employees
- [ ] Protect all routes with `requireAuth` + `requireRole('admin')`

---

## API Contracts

### `GET /api/admin/inventory`
```
Query Params: ?low_stock=true&threshold=10&search=...
Response 200: { data: [{ variant_id, variant_sku, product_name, variant_name, stock_quantity, price }] }
```

### `PUT /api/admin/inventory/:variantId`
```
Request Body: { stock_quantity, reason: "Manual restock" }
Response 200: { message: "Stock updated", variant: { variant_id, stock_quantity, updated_at } }
```

### `POST /api/admin/employees`
```
Request Body: { email, password, first_name, last_name, phone? }
Response 201: { employee: { employee_id, user_id, email, first_name, last_name } }
Response 409: { error: "Email already exists" }
```

---

## Definition of Done

- Admins can view and adjust stock and create employee accounts that can log in.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

