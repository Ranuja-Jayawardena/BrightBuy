# Fix 7.10: Storefront & Report Regression Verification

> **Assigned To:** A (lead), C (report query support)
> **Status:** Not Started
> **Priority:** High
> **Depends On:** 7.2–7.5 and 7.7–7.9 for final integration; record the actual Fix 6 baseline first
> **Blocks:** 7.12 release acceptance
> **Navigation:** [Fix 7 overview](fix7-database-integrity-concurrency.md) | [Contracts](fix7.1-contracts-preflight.md)

## Purpose and boundaries

Verify that database enforcement preserves browsing and existing reports. A owns this regression work under AGENTS.md; B owns checkout implementation. Do not add a reporting view, window-function feature, new state library, or new report merely to create work for A.

Read [catalog phase](../../Phases/Phase4-Product-Catalog-Browsing/phase4-product-catalog-browsing.md), [reports phase](../../Phases/Phase9-Reports-Analytics/phase9-reports-analytics.md), [search/index fixes](../Fix2-Search-Filter-Performance/fix2-search-filter-performance.md), [report chart fix](../Fix5-Analytics-Reports-Visuals/fix5.1-top-performing-products-chart.md), and [S3 UI contract](../Fix6-Cloud-Media-Storage-S3/fix6.4-storefront-admin-image-delivery-ui.md).

## Source inspection

Inspect frontend/src/services/catalogService.ts, reportService.ts, types/catalog.ts, types/reports.ts, components/catalog/, components/reports/, app/products/, and app/admin/reports/. C inspects backend/src/models/salesReportModel.js and analyticsReportModel.js. Read the current implementation before changing any query or expected response.

## Tasks

- [ ] Capture baseline response shapes and representative results using an isolated fixture with known prices, quantities, categories, and order statuses. Record the revision and migration version.
- [ ] Preserve listing pagination, category navigation, brand/price filtering, autocomplete, active-product filtering, variant selection, and out-of-stock behavior.
- [ ] Verify category moves accepted by 7.7 remain navigable and rejected moves do not leave stale UI trees. Coordinate error/refetch behavior with B rather than duplicating admin UI work.
- [ ] Verify checkout and manual stock adjustment update subsequent product reads. Coordinate cart-store ownership and refresh behavior with B. Do not promise live stock accuracy between requests.
- [ ] Record whether Fix 6.4 has actually delivered direct URL rendering; it was Not Started in the revised 2026-10-13 baseline. After integration, verify permanent S3 URLs, primary-image fallback, existing IDs/API fields and legacy redirect compatibility. Do not claim an unimplemented baseline was preserved or reintroduce database image binaries/backend image proxying.
- [ ] Compare sales, inventory, customer, top-product, and CSV output before and after the change using the same fixture. Verify date filters, authorization, empty results, number formatting, and chart labels.
- [ ] C confirms the reportable order-state definition against D2 in 7.1. If payment/refund semantics change report meaning, record the approved definition and expected totals before updating SQL.
- [ ] Include products assigned to multiple categories when checking aggregates. Distinguish an existing join/double-counting defect from a new regression and document any separate follow-up.
- [ ] C checks representative query plans when a changed constraint, index, or join could affect search/report performance. Retain existing price and pg_trgm indexes unless measured evidence supports a separately documented change.
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
