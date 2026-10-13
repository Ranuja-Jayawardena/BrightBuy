# Phase 9.2: Inventory & Customer Report APIs + CSV Export

> **Parent Phase:** [Phase 9: Reports & Analytics](phase9-reports-analytics.md)
> **Status:** Complete
> **Assigned To:** C
> **Depends On:** 3.2
> **Blocks:** 9.4
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Expose inventory and customer analytics, plus CSV export for all reports.

---

## Tasks

**Inventory Reports**
- [x] `GET /api/reports/inventory/low-stock` — variants below a configurable stock threshold
- [x] `GET /api/reports/inventory/summary` — total stock value by category

**Customer Reports**
- [x] `GET /api/reports/customers/top` — most active customers by order count or spend
- [x] `GET /api/reports/customers/geography` — order distribution by city/region (main vs regional)

**Data Export**
- [x] `GET /api/reports/export/:type` — CSV export for sales, inventory, or customer data

- [x] Protect all routes with `requireAuth` + `requireRole('admin')`

---

## API Contracts

### `GET /api/reports/inventory/low-stock`
```
Query Params: ?threshold=10
Response 200: {
  data: [
    { variant_id, variant_sku, product_name, variant_name, stock_quantity, price }
  ]
}
```

### `GET /api/reports/inventory/summary`
```
Response 200: { data: [{ category_id, category_name, total_units, total_value }] }
```

### `GET /api/reports/customers/top`
```
Query Params: ?limit=10&sort_by=orders|spend
Response 200: {
  data: [
    { customer_id, first_name, last_name, email, order_count, total_spend }
  ]
}
```

### `GET /api/reports/customers/geography`
```
Response 200: { data: [{ city_name, is_main_city, order_count, revenue }] }
```

### `GET /api/reports/export/:type`
```
Params: type = "sales" | "inventory" | "customers"
Query Params: ?start_date=...&end_date=...
Response 200: CSV file download
  Content-Type: text/csv
  Content-Disposition: attachment; filename="sales_report_2026-09.csv"
```

---

## Definition of Done

- All endpoints match the contracts; CSV files open correctly in a spreadsheet app.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

- Customer spend, geographic revenue, and exported sales use revenue-bearing orders only: `paid`, `shipped`, and `delivered`.
- Exports are spreadsheet-safe UTF-8 CSV downloads. Sales exports use monthly revenue, inventory exports use stock summary by category, and customer exports use the top 100 customers by spend.

## Fix 7 follow-up

Database integrity and concurrency work is tracked separately in [Fix 7](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 7.10: Storefront & Report Regression Verification](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7.10-storefront-report-regression.md)

Read the Fix 7 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
