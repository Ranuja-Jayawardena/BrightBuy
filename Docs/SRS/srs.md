# Software Requirements Specification
**for Retail Inventory and Online Order Management System**
**Prepared by Group 16 | July 27, 2026**

## 1. Introduction
### 1.1 Purpose
The purpose of this project is to design and implement a web-based Retail Inventory and Online Order Management System for BrightBuy. The system is intended to provide customers with a convenient online shopping experience by allowing them to browse products, select variants, add items to a cart, and complete purchases. It also enables administrators to manage products, monitor inventory, process orders, and generate reports.

### 1.2 Document Conventions
Follows IEEE SRS guidelines.
*   **Shall**: Mandatory requirement.
*   **Should**: Recommended practice.
*   **May**: Optional feature.
*   **REQ-X.X**: Functional Requirements.
*   **NFR-X.X**: Non-Functional Requirements.
*   **BR-XX**: Business Rules.

### 1.3 Intended Audience
Project Managers, Software Developers, Database Administrators, Testers, Administrators, Customers.

### 1.4 Product Scope
Web-based online retail platform.
*   **Customers**: Browse products/variants, create accounts, add to cart, checkout, select delivery/payment.
*   **Inventory**: Real-time stock, validate availability, monitor levels.
*   **Initial Scope**: Delivery limited to Texas. Categories limited to electronic gadgets and toys.

## 2. Overall Description
### 2.1 Product Perspective
A web-based platform serving as the backbone of BrightBuy's e-commerce operations, integrating user-facing interfaces with core business logic and centralized data management.

### 2.2 Product Functions
**User Operations:** Registration/Login, Browse/Search Products, Shopping Cart, Order/Checkout, Delivery Options, Payment (Credit/Debit, COD).
**Inventory and Admin Operations:** Stock Management, Admin Management (products, categories, variants), Reports.

### 2.3 User Classes
*   **Admin Users**: Full administrative access.
*   **Registered Customers**: Full customer access to order.
*   **Guest Users**: Read-only access to browse products.

### 2.4 Operating Environment
*   **Backend**: Express.js REST API
*   **Frontend**: Next.js
*   **Database**: PostgreSQL
*   **Hosting**: Local Docker / Cloud

### 2.5 Design and Implementation Constraints
*   **Secure Passwords**: Passwords must be securely encrypted using bcrypt.
*   **Transaction Integrity**: The system must follow ACID properties.
*   **Atomic Operations**: Orders and inventory updates must be completed as a single transaction.
*   **Database Constraints**: `(cart_id, variant_id)` must be unique to prevent duplicate cart items. `(variant_id, attribute_id)` must be unique.
*   **Historical Accuracy**: Delivery addresses must be stored as structured snapshots directly within the `deliveries` table at the time of checkout.

### 2.8 Database Design Requirements
*   **Primary/Foreign Keys**: Strict relational integrity across all entities.
*   **Indexing**: Establish indexes on high-traffic columns (SKUs, timestamps, credentials).
*   **Normalization**: All relational schemata must be normalized to a minimum of Third Normal Form (3NF).
*   **Initial Data Population**: The database must be seeded with exactly 40 products distributed across 10 distinct categories for demonstration purposes.

## 3. External Interface Requirements
### 3.1 User Interfaces
Modern Look (Material Design principles), Responsive (mobile to desktop), Standard Controls (always-visible search and cart), and a UI Theme utilizing a Green and White primary color palette.

### 3.3 Software Interfaces (Aligned with Tech Stack)
*   **Operating Systems**: Linux / Windows environments.
*   **DBMS**: PostgreSQL (Raw SQL via `pg` driver, NO ORMs).
*   **Backend**: Express.js.
*   **Frontend**: Next.js (React).
*   **Authentication**: Fully custom JWT (JSON Web Tokens) with `HttpOnly` cookies.
*   **Payment Gateway**: Lemon Squeezy.
*   **Notifications**: Nodemailer for emails.
*   **File Storage**: Stored directly in PostgreSQL as `BYTEA` or Base64.

## 4. System Features
### 4.1 Catalog Browsing and Variant Selection
*   **REQ-1.1 to 1.4**: Interface to filter catalog, display SKUs/pricing/stock per variant, search engine, and guest permissions.

### 4.2 Customer Registration and Authentication
*   **REQ-2.1 to 2.4**: Verified email, bcrypt hashing, custom JWT session management, protected checkout for authenticated users only.

### 4.3 Shopping Cart and Order Processing
*   **REQ-3.1 to 3.6**: Add/remove/update cart, inventory audit before payment, atomic stock deduction linked with order creation, fulfillment (Store Pickup / Home Delivery), ETA calculations (5 days for Metro Texas, 7 days for Regional Texas). Out-of-stock items must disable the "Add to Cart" button (no backorders allowed).

### 4.4 Real-Time Inventory Management
*   **REQ-4.1 to 4.5**: Precise persistent quantity tracking, stock deduction only on successful payment, triggers to reject negative balances, immutable audit trails for manual overrides.

### 4.5 Business Reports and Analytics
*   **REQ-5.1 to 5.6**: Quarterly revenue, top-selling items, order volume summaries, CSV/PDF data exports.

### 4.6 Administrator Management Tools
*   **REQ-6.1 to 6.4**: Create/edit/delete products and categories, enforce SKU uniqueness, bulk import/export.

### 4.7 Secure Payment Processing
*   **REQ-7.1 to 7.5**: Lemon Squeezy/COD options, permanently link transaction IDs to orders, require positive gateway confirmation.

## 5. Non-Functional Requirements
*   **Reliability (NFR-REL)**: Data integrity, Transactional Reliability (ACID), Error Recovery.
*   **Performance (NFR-PERF)**: <2s response time for pages, <3s for queries.
*   **Availability (NFR-AVAIL)**: 99.5% operational uptime.
*   **Security (NFR-SEC)**: Data encryption (TLS/HTTPS), Role-Based Authorization (RBAC).

## 6. Business Rules & Additional Requirements
*   **BR-01**: Fulfillment restricted to Texas during launch.
*   **BR-02 & BR-03**: 5-7 business day delivery estimations based on region (Metro vs Regional Texas). Out-of-stock items cannot be purchased.
*   **BR-06**: Order finalization contingent upon verified payment.
*   **BR-09**: Credential security mandates bcrypt hashing.
*   **BR-11**: Architectural guards must prevent negative inventory balances.
*   **Regulatory Compliance**: Texas state privacy laws, PCI-DSS compliance.

## Appendices
*   **Appendix A (Glossary)**: ACID, API, bcrypt, COD, DBMS, ER Diagram, HTTPS, JWT, PCI-DSS, RBAC, REST, SKU.
*   **Appendix D (Team Members)**: Jayawardena R.T.K, Gamage K.G.T.S.S, Gunarathna I.K.L, Nishaya K.A.R, Munasinghe B. S. M. P.
