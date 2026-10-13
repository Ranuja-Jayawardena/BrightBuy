# Fix 5.1: Top Performing Products Chart Display

> **Parent Group:** [Fix 5: Analytics & Reports Visuals](fix5-analytics-reports-visuals.md)
> **Status:** Complete
> **Assigned To:** Member A (Frontend Reports & Analytics UI) & Member C (Backend Sales Reports)
> **Depends On:** —
> **Blocks:** —
> **Priority:** Medium
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (tables: `orders`, `order_items`, `products`)

---

## Problem Description

In the Admin Reports console (`/admin/reports` and `/admin/reports/sales`), the **Top Performing Products** bar chart displays numeric indices (`0, 1, 2...`) or skips labels along the axis instead of showing clear product names. Administrators cannot immediately recognize which bar corresponds to which product without hovering over each individual bar.

---

## Root Cause

In `frontend/src/components/reports/charts/ReportBarChart.tsx`:
- When rendered with `layout="horizontal"`, long product name strings along the bottom horizontal X-axis collide.
- Recharts either compresses labels, skips them, or falls back to category index numbers.
- In `frontend/src/app/admin/reports/page.tsx` line 246, `ReportBarChart` does not specify `layout="vertical"` for ranking charts, nor does it supply a custom tick formatter with label angle rotation or truncation.

---

## Tasks

### Frontend — Member A
- [x] In `frontend/src/app/admin/reports/page.tsx` and `frontend/src/app/admin/reports/sales/page.tsx`:
  - Set `layout="vertical"` for the Top Performing Products bar chart.
  - Set `xKey="product_name"`, placing category product names cleanly along the vertical Y-axis with horizontal revenue bars.
- [x] In `frontend/src/components/reports/charts/ReportBarChart.tsx`:
  - Provide adequate Y-axis width (e.g. `width={140}`) for vertical layouts.
  - Add clean label truncation (e.g., max 20 characters with ellipsis) on tick labels and full product name in tooltip.
  - Ensure bar tooltips explicitly state `Product Name: {name}` alongside formatted revenue `$XX,XXX`.

### Backend Verification — Member C
- [x] Verify `GET /api/reports/sales/top-products` continues returning `product_name` cleanly populated from database joins.

---

## Affected Files

- `frontend/src/components/reports/charts/ReportBarChart.tsx`
- `frontend/src/app/admin/reports/page.tsx`
- `frontend/src/app/admin/reports/sales/page.tsx`

---

## Definition of Done

1. The Top Performing Products chart directly displays readable product names along the chart axis without requiring hover.
2. Long product titles are gracefully truncated with full titles visible on tooltip hover.
3. Chart renders responsively across desktop and tablet screen sizes.

## Verification & Notes

- The backend query joins `order_items` to `product_variants` and `products`, selects `p.product_name`, and passes it through the route response. `backend/tests/topProductsReport.test.js` verifies the join, field, and revenue conversion.
- Both top products charts use the vertical layout. The shared chart displays every category tick, truncates long labels at 20 characters, reserves 155px for the name axis, expands height with row count, and shows the full product name in the tooltip.

## Fix 7 follow-up

Database integrity and concurrency work is tracked separately in [Fix 7](../Fix7-Database-Integrity-Concurrency/fix7-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 7.10: Storefront & Report Regression Verification](../Fix7-Database-Integrity-Concurrency/fix7.10-storefront-report-regression.md)

Read the Fix 7 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
