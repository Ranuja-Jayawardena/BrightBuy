# BrightBuy Overall Development Plan

**Project:** Retail Inventory and Online Order Management System
**Prepared By:** Group 16
**Date:** September 2026

---

## Team Members & Responsibilities

| Member | Role | Primary Focus | Phases Active In |
|--------|------|---------------|------------------|
| **A** | Frontend – Storefront | Customer-facing pages: product browsing, search, categories, reports UI | 1, 4, 9, 10 |
| **B** | Frontend – Admin/Cart | Auth pages, admin dashboard UI, cart/checkout/payment pages | 1, 3, 5, 6, 7, 10 |
| **C** | Backend – Products | Product/category/image APIs, admin CRUD APIs, report queries | 1, 4, 7, 9, 10 |
| **D** | Backend – Orders | Cart/order/payment/delivery APIs, email notifications | 1, 5, 6, 8, 10 |
| **E** | DevOps + Architecture | Docker, Flyway, scaffolding, auth system (JWT/middleware), deployment, integration | 1, 2, 3, 6, 10 |

### Database Schema Ownership

Database work is split **equally across all 5 members**. Each member owns one Phase 1 schema subphase and writes the migration SQL, constraints, indexes, **and seed data** for their tables.
**Single source of truth:** [DB_Schema.md](Database/DB_Schema.md) · **Flyway version map & seed order:** [phase1-project-foundation.md](Phases/Phase1-Project-Foundation/phase1-project-foundation.md#shared-contracts-all-members-must-follow)

| Member | Subphase | Tables Owned |
|--------|----------|-------------|
| **A** | [1.5](Phases/Phase1-Project-Foundation/phase1.5-catalog-taxonomy-schema.md) | `categories`, `product_categories`, `variant_attributes`, `variant_attribute_values` |
| **B** | [1.4](Phases/Phase1-Project-Foundation/phase1.4-customer-cart-schema.md) | `customers`, `addresses`, `carts`, `cart_items` |
| **C** | [1.6](Phases/Phase1-Project-Foundation/phase1.6-product-schema.md) | `products`, `product_variants`, `product_images` (+ heaviest seed: 40 products with images) |
| **D** | [1.7](Phases/Phase1-Project-Foundation/phase1.7-order-payment-delivery-schema.md) | `orders`, `order_items`, `payments`, `deliveries` |
| **E** | [1.3](Phases/Phase1-Project-Foundation/phase1.3-identity-location-schema.md) | `users`, `employees`, `refresh_tokens`, `cities` |

---

## Phase Progress Tracker

Each phase is split into subphases. Tick a subphase when **all** tasks in its doc are done; tick the phase when all its subphases are done.

- [ ] **Phase 1:** Project Foundation & Database → [phase1-project-foundation.md](Phases/Phase1-Project-Foundation/phase1-project-foundation.md)
  - [x] 1.1 Project Scaffolding — **E** → [phase1.1-project-scaffolding.md](Phases/Phase1-Project-Foundation/phase1.1-project-scaffolding.md)
  - [x] 1.2 Database Tooling — **E** → [phase1.2-database-tooling.md](Phases/Phase1-Project-Foundation/phase1.2-database-tooling.md)
  - [x] 1.3 Identity & Location Schema — **E** → [phase1.3-identity-location-schema.md](Phases/Phase1-Project-Foundation/phase1.3-identity-location-schema.md)
  - [x] 1.4 Customer & Cart Schema — **B** → [phase1.4-customer-cart-schema.md](Phases/Phase1-Project-Foundation/phase1.4-customer-cart-schema.md)
  - [ ] 1.5 Catalog Taxonomy Schema — **A** → [phase1.5-catalog-taxonomy-schema.md](Phases/Phase1-Project-Foundation/phase1.5-catalog-taxonomy-schema.md)
  - [ ] 1.6 Product Schema — **C** → [phase1.6-product-schema.md](Phases/Phase1-Project-Foundation/phase1.6-product-schema.md)
  - [ ] 1.7 Order, Payment & Delivery Schema — **D** → [phase1.7-order-payment-delivery-schema.md](Phases/Phase1-Project-Foundation/phase1.7-order-payment-delivery-schema.md)
  - [ ] 1.8 Migration Integration & Verification — **E + all** → [phase1.8-migration-integration-verification.md](Phases/Phase1-Project-Foundation/phase1.8-migration-integration-verification.md)
- [ ] **Phase 2:** Full-Stack Dockerization → [phase2-full-stack-dockerization.md](Phases/Phase2-Full-Stack-Dockerization/phase2-full-stack-dockerization.md)
  - [ ] 2.1 Development Dockerfiles — **E** → [phase2.1-development-dockerfiles.md](Phases/Phase2-Full-Stack-Dockerization/phase2.1-development-dockerfiles.md)
  - [ ] 2.2 Compose Orchestration & Networking — **E** → [phase2.2-compose-orchestration-networking.md](Phases/Phase2-Full-Stack-Dockerization/phase2.2-compose-orchestration-networking.md)
  - [ ] 2.3 Stack Verification & Developer Docs — **E** → [phase2.3-stack-verification-developer-docs.md](Phases/Phase2-Full-Stack-Dockerization/phase2.3-stack-verification-developer-docs.md)
- [ ] **Phase 3:** Authentication System → [phase3-authentication-system.md](Phases/Phase3-Authentication-System/phase3-authentication-system.md)
  - [ ] 3.1 Auth API Endpoints — **E** → [phase3.1-auth-api-endpoints.md](Phases/Phase3-Authentication-System/phase3.1-auth-api-endpoints.md)
  - [ ] 3.2 Auth Middleware & Role Guards — **E** → [phase3.2-auth-middleware-role-guards.md](Phases/Phase3-Authentication-System/phase3.2-auth-middleware-role-guards.md)
  - [ ] 3.3 Auth Pages & Zustand Store — **B** → [phase3.3-auth-pages-zustand-store.md](Phases/Phase3-Authentication-System/phase3.3-auth-pages-zustand-store.md)
  - [ ] 3.4 Session Handling & Route Protection — **B** → [phase3.4-session-handling-route-protection.md](Phases/Phase3-Authentication-System/phase3.4-session-handling-route-protection.md)
- [ ] **Phase 4:** Product Catalog & Browsing → [phase4-product-catalog-browsing.md](Phases/Phase4-Product-Catalog-Browsing/phase4-product-catalog-browsing.md)
  - [ ] 4.1 Catalog Read APIs — **C** → [phase4.1-catalog-read-apis.md](Phases/Phase4-Product-Catalog-Browsing/phase4.1-catalog-read-apis.md)
  - [ ] 4.2 Image Serving Endpoint — **C** → [phase4.2-image-serving-endpoint.md](Phases/Phase4-Product-Catalog-Browsing/phase4.2-image-serving-endpoint.md)
  - [ ] 4.3 Product Listing, Search & Category Navigation UI — **A** → [phase4.3-product-listing-search-category-navigation-ui.md](Phases/Phase4-Product-Catalog-Browsing/phase4.3-product-listing-search-category-navigation-ui.md)
  - [ ] 4.4 Product Detail Page — **A** → [phase4.4-product-detail-page.md](Phases/Phase4-Product-Catalog-Browsing/phase4.4-product-detail-page.md)
- [ ] **Phase 5:** Shopping Cart & Checkout → [phase5-shopping-cart-checkout.md](Phases/Phase5-Shopping-Cart-Checkout/phase5-shopping-cart-checkout.md)
  - [ ] 5.1 Cart APIs — **D** → [phase5.1-cart-apis.md](Phases/Phase5-Shopping-Cart-Checkout/phase5.1-cart-apis.md)
  - [ ] 5.2 Address & City APIs — **D** → [phase5.2-address-city-apis.md](Phases/Phase5-Shopping-Cart-Checkout/phase5.2-address-city-apis.md)
  - [ ] 5.3 Order Placement & History APIs — **D** → [phase5.3-order-placement-history-apis.md](Phases/Phase5-Shopping-Cart-Checkout/phase5.3-order-placement-history-apis.md)
  - [ ] 5.4 Cart UI & Add-to-Cart Wiring — **B** → [phase5.4-cart-ui-add-to-cart-wiring.md](Phases/Phase5-Shopping-Cart-Checkout/phase5.4-cart-ui-add-to-cart-wiring.md)
  - [ ] 5.5 Address Management & Checkout UI — **B** → [phase5.5-address-management-checkout-ui.md](Phases/Phase5-Shopping-Cart-Checkout/phase5.5-address-management-checkout-ui.md)
  - [ ] 5.6 Order History & Detail UI — **B** → [phase5.6-order-history-detail-ui.md](Phases/Phase5-Shopping-Cart-Checkout/phase5.6-order-history-detail-ui.md)
- [ ] **Phase 6:** Payment Integration → [phase6-payment-integration.md](Phases/Phase6-Payment-Integration/phase6-payment-integration.md)
  - [ ] 6.1 Webhook Infrastructure — **E** → [phase6.1-webhook-infrastructure.md](Phases/Phase6-Payment-Integration/phase6.1-webhook-infrastructure.md)
  - [ ] 6.2 Payment Sessions & Cash on Delivery — **D** → [phase6.2-payment-sessions-cash-on-delivery.md](Phases/Phase6-Payment-Integration/phase6.2-payment-sessions-cash-on-delivery.md)
  - [ ] 6.3 Payment Event Handlers & Order Status — **D** → [phase6.3-payment-event-handlers-order-status.md](Phases/Phase6-Payment-Integration/phase6.3-payment-event-handlers-order-status.md)
  - [ ] 6.4 Payment UI — **B** → [phase6.4-payment-ui.md](Phases/Phase6-Payment-Integration/phase6.4-payment-ui.md)
- [ ] **Phase 7:** Inventory & Admin Dashboard → [phase7-inventory-admin-dashboard.md](Phases/Phase7-Inventory-Admin-Dashboard/phase7-inventory-admin-dashboard.md)
  - [ ] 7.1 Product, Variant & Image Admin APIs — **C** → [phase7.1-product-variant-image-admin-apis.md](Phases/Phase7-Inventory-Admin-Dashboard/phase7.1-product-variant-image-admin-apis.md)
  - [ ] 7.2 Category Admin APIs — **C** → [phase7.2-category-admin-apis.md](Phases/Phase7-Inventory-Admin-Dashboard/phase7.2-category-admin-apis.md)
  - [ ] 7.3 Order & Delivery Admin APIs — **C** → [phase7.3-order-delivery-admin-apis.md](Phases/Phase7-Inventory-Admin-Dashboard/phase7.3-order-delivery-admin-apis.md)
  - [ ] 7.4 Inventory & Employee Admin APIs — **C** → [phase7.4-inventory-employee-admin-apis.md](Phases/Phase7-Inventory-Admin-Dashboard/phase7.4-inventory-employee-admin-apis.md)
  - [ ] 7.5 Admin Layout & Catalog Management UI — **B** → [phase7.5-admin-layout-catalog-management-ui.md](Phases/Phase7-Inventory-Admin-Dashboard/phase7.5-admin-layout-catalog-management-ui.md)
  - [ ] 7.6 Operations Admin UI — **B** → [phase7.6-operations-admin-ui.md](Phases/Phase7-Inventory-Admin-Dashboard/phase7.6-operations-admin-ui.md)
- [ ] **Phase 8:** Email Notifications → [phase8-email-notifications.md](Phases/Phase8-Email-Notifications/phase8-email-notifications.md)
  - [ ] 8.1 Email Service & Templates — **D** → [phase8.1-email-service-templates.md](Phases/Phase8-Email-Notifications/phase8.1-email-service-templates.md)
  - [ ] 8.2 Email Triggers Integration — **D** → [phase8.2-email-triggers-integration.md](Phases/Phase8-Email-Notifications/phase8.2-email-triggers-integration.md)
- [ ] **Phase 9:** Reports & Analytics → [phase9-reports-analytics.md](Phases/Phase9-Reports-Analytics/phase9-reports-analytics.md)
  - [ ] 9.1 Sales Report APIs — **C** → [phase9.1-sales-report-apis.md](Phases/Phase9-Reports-Analytics/phase9.1-sales-report-apis.md)
  - [ ] 9.2 Inventory & Customer Report APIs + CSV Export — **C** → [phase9.2-inventory-customer-report-apis-csv-export.md](Phases/Phase9-Reports-Analytics/phase9.2-inventory-customer-report-apis-csv-export.md)
  - [ ] 9.3 Report UI Foundations — **A** → [phase9.3-report-ui-foundations.md](Phases/Phase9-Reports-Analytics/phase9.3-report-ui-foundations.md)
  - [ ] 9.4 Report Pages — **A** → [phase9.4-report-pages.md](Phases/Phase9-Reports-Analytics/phase9.4-report-pages.md)
- [ ] **Phase 10:** Polish, Testing & Deployment → [phase10-polish-testing-deployment.md](Phases/Phase10-Polish-Testing-Deployment/phase10-polish-testing-deployment.md)
  - [ ] 10.1 Storefront Polish — **A** → [phase10.1-storefront-polish.md](Phases/Phase10-Polish-Testing-Deployment/phase10.1-storefront-polish.md)
  - [ ] 10.2 Admin, Cart & Checkout Polish — **B** → [phase10.2-admin-cart-checkout-polish.md](Phases/Phase10-Polish-Testing-Deployment/phase10.2-admin-cart-checkout-polish.md)
  - [ ] 10.3 Product Backend Validation & Tests — **C** → [phase10.3-product-backend-validation-tests.md](Phases/Phase10-Polish-Testing-Deployment/phase10.3-product-backend-validation-tests.md)
  - [ ] 10.4 Order Backend Validation & Tests — **D** → [phase10.4-order-backend-validation-tests.md](Phases/Phase10-Polish-Testing-Deployment/phase10.4-order-backend-validation-tests.md)
  - [ ] 10.5 Security Hardening — **E** → [phase10.5-security-hardening.md](Phases/Phase10-Polish-Testing-Deployment/phase10.5-security-hardening.md)
  - [ ] 10.6 Production Deployment — **E** → [phase10.6-production-deployment.md](Phases/Phase10-Polish-Testing-Deployment/phase10.6-production-deployment.md)

---

## Phase Summaries

### Phase 1: Project Foundation & Database
Set up the entire development environment, scaffold frontend and backend projects, containerize PostgreSQL, configure Flyway migrations, and create and seed all database tables.
**Lead:** E | **All members** own one schema subphase each (migrations, constraints, indexes, seed data).
→ [Full Details](Phases/Phase1-Project-Foundation/phase1-project-foundation.md)

### Phase 2: Full-Stack Dockerization
Containerize all application layers (frontend, backend, DB, migrations, seed) for consistent local development with hot-reloading.
**Lead:** E (solo)
→ [Full Details](Phases/Phase2-Full-Stack-Dockerization/phase2-full-stack-dockerization.md)

### Phase 3: Authentication System
Build the entire custom JWT auth flow — registration, login, token refresh, logout, route protection middleware, and frontend auth pages.
**Lead:** E (backend auth) + B (frontend auth UI)
→ [Full Details](Phases/Phase3-Authentication-System/phase3-authentication-system.md)

### Phase 4: Product Catalog & Browsing
The core customer-facing storefront — product listing with filters, product detail with variants, category navigation, and image serving.
**Lead:** C (backend APIs) + A (frontend storefront UI)
→ [Full Details](Phases/Phase4-Product-Catalog-Browsing/phase4-product-catalog-browsing.md)

### Phase 5: Shopping Cart & Checkout
Enable customers to build orders and complete purchases — cart management, order placement with atomic stock deduction, address management, and checkout flow.
**Lead:** D (backend APIs) + B (frontend cart/checkout UI)
→ [Full Details](Phases/Phase5-Shopping-Cart-Checkout/phase5-shopping-cart-checkout.md)

### Phase 6: Payment Integration
Connect to Lemon Squeezy for processing payments — payment sessions, webhook handling, order status transitions, and the checkout payment UI.
**Lead:** D (Lemon Squeezy integration) + E (webhook infrastructure) + B (payment UI)
→ [Full Details](Phases/Phase6-Payment-Integration/phase6-payment-integration.md)

### Phase 7: Inventory & Admin Dashboard
Backend management tools — admin CRUD for products/categories/variants, inventory tracking, order management, and employee administration.
**Lead:** C (backend admin APIs) + B (frontend admin UI)
→ [Full Details](Phases/Phase7-Inventory-Admin-Dashboard/phase7-inventory-admin-dashboard.md)

### Phase 8: Email Notifications
Transactional emails via Nodemailer — order confirmation, delivery status updates, and welcome emails.
**Lead:** D (solo)
→ [Full Details](Phases/Phase8-Email-Notifications/phase8-email-notifications.md)

### Phase 9: Reports & Analytics
Business intelligence — sales reports, inventory reports, customer insights, data visualization, and CSV/PDF exports.
**Lead:** C (backend report queries) + A (frontend charts/dashboard)
→ [Full Details](Phases/Phase9-Reports-Analytics/phase9-reports-analytics.md)

### Phase 10: Polish, Testing & Deployment
Final quality pass — responsive design audit, API validation, security hardening, testing, and production deployment.
**Lead:** E leads deployment | **All members** polish their own areas.
→ [Full Details](Phases/Phase10-Polish-Testing-Deployment/phase10-polish-testing-deployment.md)

---

## Proposed Folder Structure

```text
BrightBuy/
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # UI components (shadcn/ui)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API fetch functions
│   │   ├── store/          # Zustand state management
│   │   ├── types/          # TypeScript interfaces
│   │   └── lib/            # Utility functions
│   ├── public/             # Static assets
│   ├── tailwind.config.ts  # Tailwind configuration
│   └── package.json
├── backend/                # Express.js application
│   ├── src/
│   │   ├── controllers/    # API request handlers
│   │   ├── services/       # Business logic layer
│   │   ├── models/         # Raw SQL queries and database logic
│   │   ├── routes/         # Express route definitions
│   │   ├── middleware/     # Auth, error handling, etc.
│   │   ├── utils/          # Helper functions (JWT, hashing)
│   │   ├── config/         # Database connection config
│   │   └── index.js        # Server entry point
│   ├── db/
│   │   ├── init/           # Init scripts for Docker (e.g., 01-create-db.sql) run before Flyway
│   │   ├── migrations/     # Flyway versioned raw SQL scripts (V1__...)
│   │   └── seed/           # Raw SQL seed data scripts
│   └── package.json
├── Docs/                   # Project documentation
│   ├── Database/
│   │   └── DB_Schema.md    # Single source of truth for DB schema
│   ├── Phases/
│   │   ├── Phase1-Project-Foundation/
│   │   │   ├── phase1-project-foundation.md       # Phase overview: status, members, subphase links
│   │   │   ├── phase1.1-project-scaffolding.md     # Subphase docs: tasks, contracts, assignee
│   │   │   └── ... phase1.8-migration-integration-verification.md
│   │   ├── ...
│   │   └── Phase10-Polish-Testing-Deployment/ → phase10-polish-testing-deployment.md + phase10.1-storefront-polish.md … phase10.6-production-deployment.md
│   ├── SRS/
│   │   └── srs.md
│   ├── tech stack/
│   │   └── tech stack.md
│   └── overallplan.md      # THIS FILE — master navigation hub
├── docker-compose.yml
├── .gitignore
└── README.md
```

