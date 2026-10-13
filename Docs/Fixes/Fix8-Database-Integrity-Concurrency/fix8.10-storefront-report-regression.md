# Fix 8.10: Storefront & Report Regression Verification

> **Assigned To:** A (lead), C (report query support)
> **Status:** In Progress — C isolated catalog/report regression passed; A browser and 8.9 integration verification pending
> **Priority:** High
> **Depends On:** 8.2–8.5 and 8.7–8.9 for final integration; record the actual Fix 6 baseline first
> **Blocks:** 8.12 release acceptance
> **Navigation:** [Fix 8 overview](fix8-database-integrity-concurrency.md) | [Contracts](fix8.1-contracts-preflight.md)

## Purpose and boundaries

Verify that database enforcement preserves browsing and existing reports. A owns this regression work under AGENTS.md; B owns checkout implementation. Do not add a reporting view, window-function feature, new state library, or new report merely to create work for A.

Read [catalog phase](../../Phases/Phase4-Product-Catalog-Browsing/phase4-product-catalog-browsing.md), [reports phase](../../Phases/Phase9-Reports-Analytics/phase9-reports-analytics.md), [search/index fixes](../Fix2-Search-Filter-Performance/fix2-search-filter-performance.md), [report chart fix](../Fix5-Analytics-Reports-Visuals/fix5.1-top-performing-products-chart.md), and [S3 UI contract](../Fix6-Cloud-Media-Storage-S3/fix6.4-storefront-admin-image-delivery-ui.md).

## Source inspection

Inspect frontend/src/services/catalogService.ts, reportService.ts, types/catalog.ts, types/reports.ts, components/catalog/, components/reports/, app/products/, and app/admin/reports/. C inspects backend/src/models/salesReportModel.js and analyticsReportModel.js. Read the current implementation before changing any query or expected response.

## Member C evidence and handoff

At the start of this work, local `dev` was `30a9026`; Fix 6.4 was marked complete in the fixes tracker. `backend/test/fix8-report-regression.test.js` creates a random disposable PostgreSQL 15+ database on the configured development host, applies schema migrations V1–V27 and V29–V34, uses synthetic fixture rows, and drops the database in `finally`. It intentionally omits the catalog-specific V28 seed and cluster-wide V35 role provisioning; Flyway full-chain and runtime-role tests belong to 8.12. Run with PowerShell `$env:FIX810_RUN_DB_TESTS='1'; npm.cmd run test:report-regression` from `backend`. The test passed. Frontend lint, explicit `tsc --noEmit`, and production build passed; no browser run was made.

Fixture results: `paid`, `shipped`, and `delivered` orders produced monthly gross revenue **25.00 across 3 orders**; pending and cancelled orders were excluded. Top products were camera **3 units / 15.00** and lens **1 unit / 10.00**. Top customer and geography reports also returned **3 orders / 25.00**. Sales CSV kept its BOM, headers, and those totals. A paid order with an `order_refunded` reconciliation entry remained counted: current SQL filters order status only. The requester confirmed on 2026-10-13 that reports should keep gross order totals, including orders with refund events. Late or duplicate event behavior still needs end-to-end verification.

The camera belongs to two categories. Inventory summary correctly reports it in each assigned category; these category rows are not an additive global stock total. After a manual adjustment, Child showed **7 units**, Other **10**, and Root **4**. Brand/price filters, search suggestions, primary image URL, root-category subtree navigation, valid reparenting, and cycle rejection passed against the fixture. The test confirms metadata URL delivery only; it does not fetch S3 bytes or exercise a browser. Checkout-driven stock refresh remains for B/A integration.

The regression exposed an existing date-label bug: `date_trunc` returns a timestamp without time zone, while `toISOString()` could shift midnight into the previous day or month. `salesReportModel.key()` now uses the parsed local calendar fields. Daily, weekly, monthly, and quarterly labels pass the fixture. Authenticated report API requests passed for an analyst (200), while customer and anonymous requests were rejected (403 and 401). The catalog API returned the filtered fixture product. A representative revenue filter used a bitmap index scan on `idx_orders_status_date`; the existing active-price and pg_trgm indexes remain intact. Tiny fixture plans are not production performance measurements.

**Frontend handoff to A:** the backend geography response has `city_name`, `is_main_city`, `order_count`, and `revenue`, while `CustomerGeographyDataPoint` and the report charts expect `region` and `total_spend`. `reportService.getCustomerGeography()` returns the backend rows without mapping them, so live charts can show missing labels. Its catch path and CSV export fallback silently use mock data when the API fails. Resolve those in A's UI area, then verify with real responses and record browser results. B's 8.9 work is complete; verify its integration in the final browser pass.

## Tasks

- [ ] Capture baseline response shapes and representative results using an isolated fixture with known prices, quantities, categories, and order statuses. Record the revision and migration version.
- [ ] Preserve listing pagination, category navigation, brand/price filtering, autocomplete, active-product filtering, variant selection, and out-of-stock behavior.
- [ ] Verify category moves accepted by 8.7 remain navigable and rejected moves do not leave stale UI trees. Coordinate error/refetch behavior with B rather than duplicating admin UI work.
- [ ] Verify checkout and manual stock adjustment update subsequent product reads. Coordinate cart-store ownership and refresh behavior with B. Do not promise live stock accuracy between requests.
- [ ] Record whether Fix 6.4 has actually delivered direct URL rendering; it was Not Started in the revised 2026-10-13 baseline. After integration, verify permanent S3 URLs, primary-image fallback, existing IDs/API fields and legacy redirect compatibility. Do not claim an unimplemented baseline was preserved or reintroduce database image binaries/backend image proxying.
- [ ] Compare sales, inventory, customer, top-product, and CSV output before and after the change using the same fixture. Verify date filters, authorization, empty results, number formatting, and chart labels.
- [x] C confirms the reportable order-state definition against D2 in 8.1. The requester approved gross order totals including orders with refund events; the fixture expects 25.00 across 3 orders.
- [x] Include products assigned to multiple categories when checking aggregates. Distinguish an existing join/double-counting defect from a new regression and document any separate follow-up.
- [x] C checks representative query plans when a changed constraint, index, or join could affect search/report performance. Retain existing price and pg_trgm indexes unless measured evidence supports a separately documented change.
- [ ] Record browser checks and frontend lint/build results. Mock data is suitable for UI preparation, but final acceptance uses the migrated backend and database.

## Acceptance evidence

| Scenario | Required result |
| --- | --- |
| Customer searches and filters catalog | Same successful API contract and functional filters |
| Valid category subtree move | Both storefront navigation and admin tree show committed hierarchy |
| Rejected cycle | Existing hierarchy remains intact; useful error on the editing screen |
| Stock changes through checkout or adjustment | Next catalog fetch reflects committed stock |
| Two checkout requests replay one purchase | Reports count one resulting order; stock deducted once |
| Late/duplicate payment event | Reports reflect the approved state policy without duplicate revenue |
| Product belongs to multiple categories | Expected fixture totals; no accidental multiplication introduced |
| Staff opens reports, customer requests reports | Authorized staff succeeds; customer remains rejected |
| S3 images and chart labels | Existing Fix 5/Fix 6 behavior preserved |

## Definition of Done and handoff

- [ ] A and C attach fixture totals, relevant API samples without personal data, and regression results.
- [ ] B receives any shared store/UI changes; D confirms payment-status assumptions.
- [ ] No unresolved regression is hidden by changing expected totals.
- [ ] Update the overview and trackers only after verification. If no frontend change was needed, record that explicitly; successful verification is this item's deliverable.
