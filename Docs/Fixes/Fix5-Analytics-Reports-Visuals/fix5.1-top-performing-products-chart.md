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
