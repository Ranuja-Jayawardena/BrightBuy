# BrightBuy — Fixes & Patches Master Plan

**Project:** Retail Inventory and Online Order Management System  
**Prepared By:** Group 16  
**Date:** October 2026  
**Status:** In Progress (18 / 35 fix items complete across 8 fix groups; Fix 6.1, 6.2, 7.3 & 8.1 verified complete)

---

## Purpose

This document is the **master tracker** for all post-development fixes, patches, and feature refinements discovered during testing and review. It mirrors the Phase documentation structure so every fix is properly planned, assigned, tracked, and verified.

---

## Team Members & Roles (Reference)

| Member | Role | Primary Focus |
|--------|------|---------------|
| **A** | Frontend – Storefront | Customer-facing pages: product browsing, search, categories, reports UI |
| **B** | Frontend – Admin/Cart | Auth pages, admin dashboard UI, cart/checkout/payment pages |
| **C** | Backend – Products | Product/category/image APIs, admin CRUD APIs, report queries |
| **D** | Backend – Orders | Cart/order/payment/delivery APIs, email notifications |
| **E** | DevOps + Architecture | Docker, Flyway, scaffolding, auth system (JWT/middleware), deployment |

---

## How This Tracker Works

1. Each **Fix Group** (`FixX-<Name>`) is like a Phase — a logical grouping of related fixes.
2. Each **Fix Item** (`fixX.Y-<name>.md`) is like a Subphase — a single fix or closely related set of changes.
3. Every Fix Item has its own dedicated document inside `Docs/Fixes/FixX-<Name>/fixX.Y-<name>.md`.
4. Fix Items have:
   - **Assigned To** — the member(s) responsible for the fix
   - **Depends On** — prerequisites (other fix items or phase subphases) that must be completed first
   - **Blocks** — other fix items that cannot start until this one is done
   - **Priority** — Critical / High / Medium / Low
   - **Status** — Not Started / In Progress / Complete
   - **Tasks** — checkbox list of specific changes needed
   - **Definition of Done** — acceptance criteria

### Rules
- Tick a Fix Item checkbox below **only** when ALL tasks in its doc are done.
- Tick a Fix Group checkbox **only** when ALL its Fix Items are done.
- Update the Fix Item doc's Status to `In Progress` as soon as work starts.
- If a prerequisite is incomplete, **do not start** — flag the blocker and work on unblocked items.

---

## Fix Progress Tracker

- [x] **Fix 1: Customer Account & Storefront UX** → [fix1-customer-account-storefront.md](Fix1-Customer-Account-Storefront/fix1-customer-account-storefront.md)
  - [x] **1.1** Customer Profile Management & Navigation — **E (API), A (UI)** → [fix1.1-customer-profile-management.md](Fix1-Customer-Account-Storefront/fix1.1-customer-profile-management.md)
  - [x] **1.2** Dynamic Brand Filtering & Seed Catalog Alignment — **C (Seed/API), A (UI)** → [fix1.2-brand-filtering-dynamic-catalog.md](Fix1-Customer-Account-Storefront/fix1.2-brand-filtering-dynamic-catalog.md)
  - [x] **1.3** Apparel Variant Matrix Completeness — **C (Seed), A (UI)** → [fix1.3-apparel-variant-matrix.md](Fix1-Customer-Account-Storefront/fix1.3-apparel-variant-matrix.md)
  - [x] **1.4** Address Form Cancel Feedback Fix — **B (UI)** → [fix1.4-address-form-cancel-feedback.md](Fix1-Customer-Account-Storefront/fix1.4-address-form-cancel-feedback.md)

- [x] **Fix 2: Search & Filter Performance** → [fix2-search-filter-performance.md](Fix2-Search-Filter-Performance/fix2-search-filter-performance.md)
  - [x] **2.1** Price Range Filtering & Composite Indexing — **C (DB/API), A (UI)** → [fix2.1-price-range-filter-indexing.md](Fix2-Search-Filter-Performance/fix2.1-price-range-filter-indexing.md)
  - [x] **2.2** Search Autocomplete & pg_trgm GIN Indexing — **C (DB/API), A (UI)** → [fix2.2-search-autocomplete-suggestions.md](Fix2-Search-Filter-Performance/fix2.2-search-autocomplete-suggestions.md)

- [x] **Fix 3: Admin Catalog & Media Management** → [fix3-admin-catalog-media.md](Fix3-Admin-Catalog-Media/fix3-admin-catalog-media.md)
  - [x] **3.1** Admin Sticky Sidebar Layout — **B (UI)** → [fix3.1-admin-sidebar-sticky-layout.md](Fix3-Admin-Catalog-Media/fix3.1-admin-sidebar-sticky-layout.md)
  - [x] **3.2** Product Active/Inactive Switch & Reactivation API — **C (API), B (UI)** → [fix3.2-product-status-toggle.md](Fix3-Admin-Catalog-Media/fix3.2-product-status-toggle.md)
  - [x] **3.3** Category Active/Inactive Switch — **B (UI)** → [fix3.3-category-status-toggle.md](Fix3-Admin-Catalog-Media/fix3.3-category-status-toggle.md)
  - [x] **3.4** Product Image Upload & Route Serving Fix — **C (API), B (UI)** → [fix3.4-product-image-upload-serving.md](Fix3-Admin-Catalog-Media/fix3.4-product-image-upload-serving.md)

- [x] **Fix 4: Role Permissions & Operations** → [fix4-role-permissions-operations.md](Fix4-Role-Permissions-Operations/fix4-role-permissions-operations.md)
  - [x] **4.1** Staff Cart & Purchase Policy Enforcement — **B (UI), D (API)** → [fix4.1-staff-cart-purchase-restriction.md](Fix4-Role-Permissions-Operations/fix4.1-staff-cart-purchase-restriction.md)
  - [x] **4.2** Super Admin Employee Management & Deactivation — **E (DB/API), B (UI)** → [fix4.2-employee-lifecycle-role-management.md](Fix4-Role-Permissions-Operations/fix4.2-employee-lifecycle-role-management.md)
  - [x] **4.3** Order Fulfillment: Courier Tracking vs. Store Pickup — **D (API), B (UI)** → [fix4.3-order-delivery-mode-fulfillment.md](Fix4-Role-Permissions-Operations/fix4.3-order-delivery-mode-fulfillment.md)

- [x] **Fix 5: Analytics & Reports Visuals** → [fix5-analytics-reports-visuals.md](Fix5-Analytics-Reports-Visuals/fix5-analytics-reports-visuals.md)
  - [x] **5.1** Top Performing Products Chart Display — **A (UI), C (API)** → [fix5.1-top-performing-products-chart.md](Fix5-Analytics-Reports-Visuals/fix5.1-top-performing-products-chart.md)

- [ ] **Fix 6: Cloud Object Storage (AWS S3) & Media Delivery** → [fix6-cloud-media-storage-s3.md](Fix6-Cloud-Media-Storage-S3/fix6-cloud-media-storage-s3.md)
  - [x] **6.1** AWS S3 Infrastructure, Bucket Security & EC2 IAM Integration — **E (DevOps)** → [fix6.1-s3-infrastructure-bucket-iam.md](Fix6-Cloud-Media-Storage-S3/fix6.1-s3-infrastructure-bucket-iam.md)
  - [x] **6.2** Database Schema Migration & S3 Seed Cutover — **C (DB), E (Architecture)** → [fix6.2-s3-schema-migration-seed-cutover.md](Fix6-Cloud-Media-Storage-S3/fix6.2-s3-schema-migration-seed-cutover.md)
  - [ ] **6.3** Backend S3 Service & Pre-signed Upload APIs — **C (API)** → [fix6.3-backend-s3-service-upload-apis.md](Fix6-Cloud-Media-Storage-S3/fix6.3-backend-s3-service-upload-apis.md)
  - [ ] **6.4** Storefront & Admin Direct Image Delivery & Upload UI — **A (UI), B (UI)** → [fix6.4-storefront-admin-image-delivery-ui.md](Fix6-Cloud-Media-Storage-S3/fix6.4-storefront-admin-image-delivery-ui.md)

Fix 6 has **2/4 items verified complete under the revised gates** (6.1 and 6.2 verified complete; 52/52 images verified 200 OK in S3). 6.3–6.4 are In Progress. F6-12 migration collision is resolved (apparel seed matrix renamed to V28), backend lint passes (0 errors / 5 warnings), and standalone product validation passes (5/5).

- [ ] **Fix 7: Consumer Technology Catalog Specialization** → [fix7-tech-catalog-specialization.md](Fix7-Tech-Catalog-Specialization/fix7-tech-catalog-specialization.md)
  - [x] **7.1** Technology Taxonomy & Category Hierarchy Restructuring — **A (Taxonomy)** → [fix7.1-technology-taxonomy-hierarchy.md](Fix7-Tech-Catalog-Specialization/fix7.1-technology-taxonomy-hierarchy.md)
  - [ ] **7.2** Technology Product Catalog, Variant & Media Seed Alignment — **C (Products)** → [fix7.2-technology-product-catalog-seed.md](Fix7-Tech-Catalog-Specialization/fix7.2-technology-product-catalog-seed.md)
  - [x] **7.3** Catalog Links, Attribute Values & Order History Referential Integrity — **A (Links), D (Orders)** → [fix7.3-catalog-links-order-seed-integrity.md](Fix7-Tech-Catalog-Specialization/fix7.3-catalog-links-order-seed-integrity.md)
  - [ ] **7.4** Database Reseed Orchestration, Flyway Verification & Storefront Validation — **E (DevOps), A (UI), B (UI)** → [fix7.4-database-reseed-pipeline-verification.md](Fix7-Tech-Catalog-Specialization/fix7.4-database-reseed-pipeline-verification.md)
  - [ ] **7.5** Cloud Media Assets, Tech Imagery & S3 Bucket Synchronization — **E (DevOps), C (Media)** → [fix7.5-cloud-media-assets-s3-sync.md](Fix7-Tech-Catalog-Specialization/fix7.5-cloud-media-assets-s3-sync.md)

Fix 7 has 2/5 items complete (7.1 & 7.3). In `05_catalog_links.sql`, all 40 tech products map across 12 tech subcategories and 65 variants have tech attributes. In `07_orders.sql`, order items reference valid tech SKUs. Fix 7.2 product SQL is committed; image asset verification and fresh DB execution belong to Fix 7.5 and 7.4.

- [ ] **Fix 8: Database Integrity & Concurrency** | [Overview](Fix8-Database-Integrity-Concurrency/fix8-database-integrity-concurrency.md)
  - [x] **8.1: Contracts, Data Preflight & Migration Coordination** | E (lead), D (cart/payment decisions), C (catalog/audit decisions) | [Details](Fix8-Database-Integrity-Concurrency/fix8.1-contracts-preflight.md)
  - [ ] **8.2: Catalog Timestamp Migration Verification** | C (catalog), E (migration/environment) | [Details](Fix8-Database-Integrity-Concurrency/fix8.2-catalog-timestamp-verification.md)
  - [ ] **8.3: Cart Uniqueness & Checkout Concurrency** | D | [Details](Fix8-Database-Integrity-Concurrency/fix8.3-cart-checkout-concurrency.md)
  - [ ] **8.4: Order Transitions & Payment Event Consistency** | D (implementation), E (webhook security review), C (admin order ownership handoff) | [Details](Fix8-Database-Integrity-Concurrency/fix8.4-order-payment-consistency.md)
  - [ ] **8.5: Delivery Cardinality & Value Constraints** | D; E reviews migration sequencing | [Details](Fix8-Database-Integrity-Concurrency/fix8.5-delivery-value-constraints.md)
  - [ ] **8.6: Concurrent Super Admin Protection** | E | [Details](Fix8-Database-Integrity-Concurrency/fix8.6-super-admin-protection.md)
  - [ ] **8.7: Category Hierarchy Integrity** | C | [Details](Fix8-Database-Integrity-Concurrency/fix8.7-category-cycle-protection.md)
  - [ ] **8.8: Manual Inventory Adjustment Audit** | C (implementation), E (privilege/routine review) | [Details](Fix8-Database-Integrity-Concurrency/fix8.8-inventory-audit.md)
  - [ ] **8.9: Checkout & Admin Conflict Handling** | B | [Details](Fix8-Database-Integrity-Concurrency/fix8.9-checkout-admin-ui.md)
  - [ ] **8.10: Storefront & Report Regression Verification** | A (lead), C (report query support) | [Details](Fix8-Database-Integrity-Concurrency/fix8.10-storefront-report-regression.md)
  - [ ] **8.11: Application & Migration Database Accounts** | E | [Details](Fix8-Database-Integrity-Concurrency/fix8.11-database-account-separation.md)
  - [ ] **8.12: PostgreSQL Integration Tests & Controlled Rollout** | E (lead), A/B/C/D (area verification) | [Details](Fix8-Database-Integrity-Concurrency/fix8.12-integration-rollout.md)

Fix 8 has 1/12 items complete (8.1 Complete). Item 8.2 is In Progress because V27/backend timestamp edits already exist; actual database verification is pending. All other items are Not Started.

---

## Fix Group Summaries

### Fix 1: Customer Account & Storefront UX
Customer profile editing (`/profile`), user menu navigation, dynamic brand discovery matching real inventory, completeness of seeded clothing variants, and address modal cancel feedback.  
**Leads:** E, A, B, C | **Priority:** High  
→ [Full Details](Fix1-Customer-Account-Storefront/fix1-customer-account-storefront.md)

### Fix 2: Search & Filter Performance
PostgreSQL partial composite index for price range queries (`product_variants`), `pg_trgm` GIN indexing for fast search suggestions, and responsive storefront UI inputs.  
**Leads:** C, A | **Priority:** High  
→ [Full Details](Fix2-Search-Filter-Performance/fix2-search-filter-performance.md)

### Fix 3: Admin Catalog & Media Management
Anchors the admin desktop navigation sidebar with `sticky` positioning, replaces destructive deactivation buttons with toggles on products and categories, and resolves the 404 image serving route and multipart parser edge cases.  
**Leads:** B, C | **Priority:** High  
→ [Full Details](Fix3-Admin-Catalog-Media/fix3-admin-catalog-media.md)

### Fix 4: Role Permissions & Operations
Blocks administrators and staff accounts from purchasing or maintaining shopping carts, hides the cart icon in navbar for staff, empowers Super Admins to activate/deactivate employees and update roles with login guards, and clarifies fulfillment rules between courier tracking and store pickup.  
**Leads:** E, B, D | **Priority:** Critical  
→ [Full Details](Fix4-Role-Permissions-Operations/fix4-role-permissions-operations.md)

### Fix 5: Analytics & Reports Visuals
Converts the Top Performing Products report chart to horizontal bars (`layout="vertical"`) with full product name category labels along the Y-axis.  
**Leads:** A, C | **Priority:** Medium  
→ [Full Details](Fix5-Analytics-Reports-Visuals/fix5-analytics-reports-visuals.md)

### Fix 6: Cloud Object Storage (AWS S3) & Media Delivery

Finish the approved S3 cutover with per-image preservation, container/IAM/CORS verification, durable upload identity, immutable publication, idempotent confirmation, safe deletion/cleanup and direct frontend URLs. V26's generic backfill and the current UI/backend upload mismatch need correction; production migration status is unverified. Preserve existing provisioning/code evidence while requiring actual acceptance tests before closure.

**Leads:** E, C, B, A; D supports cart URL reads | **Priority:** Critical | **Progress:** 0/4 verified complete; 6.1–6.4 In Progress

[Overview and issue ledger](Fix6-Cloud-Media-Storage-S3/fix6-cloud-media-storage-s3.md) | [Contracts, evidence and rollout](Fix6-Cloud-Media-Storage-S3/fix6-contracts-verification-rollout.md)
### Fix 7: Consumer Technology Catalog Specialization

Replace the apparel and home catalog seed with a coherent consumer technology taxonomy, product set, order references and S3 media assets. Verify the complete reseed and storefront behavior.

**Priority:** High | **Progress:** 1/5 complete (7.1 Complete; 7.2–7.5 Planned)

[Full details](Fix7-Tech-Catalog-Specialization/fix7-tech-catalog-specialization.md)

### Fix 8: Database Integrity & Concurrency

Database-enforced integrity, cart/checkout locking and retries, payment-event consistency, staff/category guards, inventory audit, separate database accounts, and real PostgreSQL verification. Owners follow AGENTS.md: A storefront/reports; B checkout/admin UI; C catalog/inventory; D orders/payments; E staff/migrations/deployment. Begin with 8.1 decisions and preflight; do not infer production migrations have run. Views and new reporting features remain deferred.

**Priority:** Critical | **Progress:** 0/12 complete

[Full details](Fix8-Database-Integrity-Concurrency/fix8-database-integrity-concurrency.md)

---

## Document Hierarchy

```text
Docs/Fixes/overallplan.md                                 ← THIS FILE — master fix tracker
  ↓ links to
Docs/Fixes/FixX-<Name>/fixX-<name>.md                     ← Fix Group overview: status, members, fix item table
  ↓ links to
Docs/Fixes/FixX-<Name>/fixX.Y-<name>.md                   ← Fix Item: assignee, dependencies, tasks, definition of done
  ↓ references
Docs/Database/DB_Schema.md                                 ← Single source of truth for DB schema
Docs/overallplan.md                                        ← Main phase tracker (for cross-referencing)
```
