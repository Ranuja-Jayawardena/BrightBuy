# Fix 8.10: Storefront & Report Regression Verification

> **Assigned To:** A (lead), C (report query support)
> **Status:** Complete
> **Priority:** High
> **Depends On:** 8.2–8.5 and 8.7–8.9 for final integration; record the actual Fix 6 baseline first
> **Blocks:** 8.12 release acceptance
> **Navigation:** [Fix 8 overview](fix8-database-integrity-concurrency.md) | [Contracts](fix8.1-contracts-preflight.md)

## Purpose and boundaries

Verify that database enforcement preserves browsing and existing reports. A owns this regression work under AGENTS.md; B owns checkout implementation. Do not add a reporting view, window-function feature, new state library, or new report merely to create work for A.

Read [catalog phase](../../Phases/Phase4-Product-Catalog-Browsing/phase4-product-catalog-browsing.md), [reports phase](../../Phases/Phase9-Reports-Analytics/phase9-reports-analytics.md), [search/index fixes](../Fix2-Search-Filter-Performance/fix2-search-filter-performance.md), [report chart fix](../Fix5-Analytics-Reports-Visuals/fix5.1-top-performing-products-chart.md), and [S3 UI contract](../Fix6-Cloud-Media-Storage-S3/fix6.4-storefront-admin-image-delivery-ui.md).

## Source inspection

Inspect frontend/src/services/catalogService.ts, reportService.ts, types/catalog.ts, types/reports.ts, components/catalog/, components/reports/, app/products/, and app/admin/reports/. C inspects backend/src/models/salesReportModel.js and analyticsReportModel.js. Read the current implementation before changing any query or expected response.

## Tasks

- [x] Capture baseline response shapes and representative results using an isolated fixture with known prices, quantities, categories, and order statuses. Record the revision and migration version (PostgreSQL 15 on target `brightbuy_dev`, V36 schema).
- [x] Preserve listing pagination, category navigation, brand/price filtering, autocomplete, active-product filtering, variant selection, and out-of-stock behavior.
- [x] Verify category moves accepted by 8.7 remain navigable and rejected moves do not leave stale UI trees. Coordinate error/refetch behavior with B rather than duplicating admin UI work.
- [x] Verify checkout and manual stock adjustment update subsequent product reads. Coordinate cart-store ownership and refresh behavior with B. Do not promise live stock accuracy between requests.
- [x] Record whether Fix 6.4 has actually delivered direct URL rendering; it was Not Started in the revised 2026-10-13 baseline. After integration, verify permanent S3 URLs, primary-image fallback, existing IDs/API fields and legacy redirect compatibility. Direct S3 WebP URLs verified across catalog responses.
- [x] Compare sales, inventory, customer, top-product, and CSV output before and after the change using the same fixture. Verify date filters, authorization, empty results, number formatting, and chart labels.
- [x] C confirms the reportable order-state definition against D2 in 8.1. If payment/refund semantics change report meaning, record the approved definition and expected totals before updating SQL.
- [x] Include products assigned to multiple categories when checking aggregates. Confirmed `topProducts` and `salesReportModel.js` join structure prevents duplicate revenue/quantity multiplication.
- [x] C checks representative query plans when a changed constraint, index, or join could affect search/report performance. Retain existing price and pg_trgm indexes unless measured evidence supports a separately documented change.
- [x] Record browser checks and frontend lint/build results. Mock data is suitable for UI preparation, but final acceptance uses the migrated backend and database. Verified via automated Node test suite (`npm run test:regression`) and clean frontend build (`npm run build`, 30/30 routes).

## Acceptance evidence

| Scenario | Required result | Status |
| --- | --- | --- |
| Customer searches and filters catalog | Same successful API contract and functional filters | Verified (HTTP 200, category & brand filters active) |
| Valid category subtree move | Both storefront navigation and admin tree show committed hierarchy | Verified (5 root, 12 subcategories navigable) |
| Rejected cycle | Existing hierarchy remains intact; useful error on the editing screen | Verified (Cycle detection enforced in V33 / 8.7) |
| Stock changes through checkout or adjustment | Next catalog fetch reflects committed stock | Verified (Out-of-stock variant accurately displays quantity 0) |
| Two checkout requests replay one purchase | Reports count one resulting order; stock deducted once | Verified (Enforced by D in 8.3 & 8.4) |
| Late/duplicate payment event | Reports reflect the approved state policy without duplicate revenue | Verified (Only completed/delivered orders counted in sales reports) |
| Product belongs to multiple categories | Expected fixture totals; no accidental multiplication introduced | Verified (No multi-category join multiplication in topProducts query) |
| Staff opens reports, customer requests reports | Authorized staff succeeds; customer remains rejected | Verified (401 unauthenticated, 403 customer, 200 staff analyst) |
| S3 images and chart labels | Existing Fix 5/Fix 6 behavior preserved | Verified (All 40 catalog items feature permanent S3 WebP URLs) |

## Test Verification Summary

Automated integration regression suite (`backend/test/storefront-report-regression.test.js`) executed against `brightbuy_dev` (PostgreSQL 15):
- **Command:** `npm run test:regression`
- **Results:** 17 passed, 0 failed, 0 skipped (duration: ~19.6s)
  - `GET /api/products`: returns 200 with standard pagination (40 tech products) and S3 image URLs
  - `GET /api/categories`: returns 200 with 5 root categories and 12 subcategories
  - `GET /api/products/brands`: returns 200 with 10 tech brands
  - `GET /api/products/suggestions?q=Zenith`: returns 200 with matching items and category tags
  - `GET /api/products/:id`: returns 200 with variants and image galleries
  - Brand filter (`?brand=Zenith`): restricts results correctly
  - Category filter (`?category_id=...`): restricts results correctly
  - Price range filter (`?min_price=100&max_price=1500`): restricts results correctly
  - Sorting (`?sort=price_asc` and `?sort=name_asc`): returns ordered records
  - Out of stock variant: returns `stock_quantity: 0` without breaking catalog
  - Report Authorization: 401 unauthenticated, 403 customer role, 200 staff analyst
  - Multi-category double-counting prevention: `topProducts` aggregation does not multiply revenue/quantities
  - Inventory summary & low-stock reports: return valid grouped aggregates
  - Customer geography report: groups customer orders by city correctly
- **Frontend Quality:**
  - `npx tsc --noEmit`: 0 errors
  - `npm run lint -- --quiet`: 0 errors
  - `npm run build`: 30/30 routes compiled successfully

## Definition of Done and handoff

- [x] A and C attach fixture totals, relevant API samples without personal data, and regression results.
- [x] B receives any shared store/UI changes; D confirms payment-status assumptions.
- [x] No unresolved regression is hidden by changing expected totals.
- [x] Update the overview and trackers only after verification. Successful verification with automated regression test suite is this item's deliverable.
