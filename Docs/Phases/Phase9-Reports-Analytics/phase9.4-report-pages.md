# Phase 9.4: Report Pages

> **Parent Phase:** [Phase 9: Reports & Analytics](phase9-reports-analytics.md)
> **Status:** In Progress
> **Assigned To:** A
> **Depends On:** 9.1, 9.2, 9.3
> **Blocks:** 10.1

---

## Goal

Assemble the admin report pages from the 9.3 building blocks and the real report APIs.

---

## Tasks

- [ ] Sales dashboard (`/admin/reports/sales`) — revenue chart, top products table, order volume chart
- [x] Inventory report (`/admin/reports/inventory`) — low-stock alerts table, stock value by category
- [x] Customer insights (`/admin/reports/customers`) — top customers table, geographic distribution chart
- [ ] Date range filter connected to every page
- [x] CSV export buttons on each page
- [ ] Loading and empty states for each chart/table

---

## Definition of Done

- All three report pages show live data and export CSVs correctly.

---

## Key Decisions & Notes

- Report page shells exist for sales, inventory, and customer reports and use the shared components from 9.3.
- Remaining work includes the sales order-volume chart, date-range integration on every page, and complete loading/empty-state coverage.

