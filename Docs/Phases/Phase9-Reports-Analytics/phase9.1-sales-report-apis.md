# Phase 9.1: Sales Report APIs

> **Parent Phase:** [Phase 9: Reports & Analytics](phase9-reports-analytics.md)
> **Status:** Complete
> **Assigned To:** C
> **Depends On:** 3.2
> **Blocks:** 9.4
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Expose sales analytics using raw SQL aggregation queries.

---

## Tasks

- [x] `GET /api/reports/sales/revenue` — total revenue by period (daily, weekly, monthly, quarterly) using `date_trunc`
- [x] `GET /api/reports/sales/top-products` — top-selling products/variants by quantity or revenue
- [x] `GET /api/reports/sales/orders` — order volume by period and status
- [x] Count only revenue-bearing orders (exclude `pending` and `cancelled`)
- [x] Protect all routes with `requireAuth` + `requireRole('admin')`

---

## API Contracts

### `GET /api/reports/sales/revenue`
```
Query Params: ?period=monthly&start_date=2026-01-01&end_date=2026-09-30
Response 200: {
  data: [
    { period: "2026-01", revenue: 12500.00, order_count: 45 },
    { period: "2026-02", revenue: 15800.00, order_count: 52 },
    ...
  ]
}
```

### `GET /api/reports/sales/top-products`
```
Query Params: ?limit=10&sort_by=revenue|quantity&start_date=...&end_date=...
Response 200: {
  data: [
    { product_id, product_name, variant_name, total_quantity, total_revenue }
  ]
}
```

### `GET /api/reports/sales/orders`
```
Query Params: ?period=monthly&start_date=...&end_date=...
Response 200: { data: [{ period, status, order_count }] }
```

---

## Definition of Done

- Results match hand-calculated totals from the seeded orders.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

- Revenue-bearing statuses are `paid`, `shipped`, and `delivered`; `end_date` is inclusive through the full day.
- Query values are parameterized; period and sort SQL fragments are selected only from whitelists.

## Fix 7 follow-up

Database integrity and concurrency work is tracked separately in [Fix 7](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 7.10: Storefront & Report Regression Verification](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7.10-storefront-report-regression.md)

Read the Fix 7 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
