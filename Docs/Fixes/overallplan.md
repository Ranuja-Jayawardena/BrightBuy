# BrightBuy — Fixes & Patches Master Plan

**Project:** Retail Inventory and Online Order Management System  
**Prepared By:** Group 16  
**Date:** October 2026  
**Status:** Complete (14 / 14 fix items complete across 5 fix groups)

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
