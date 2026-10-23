# BrightBuy

**Retail Inventory and Online Order Management System**  
Developed by **Group 16** (September 2026)

---

## 🌟 Overview

BrightBuy is a full-stack retail and e-commerce platform designed to support customer storefront browsing, administrative catalog and inventory management, order processing, and analytical reporting.

---

## 🛠️ Tech Stack & Constraints

- **Frontend:** Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, Zustand
- **Backend:** Express.js, pure SQL via `pg` (Node Postgres)
- **Database:** PostgreSQL (containerized with Docker)
- **Migrations:** Flyway (versioned SQL migrations `V1__` through `V19__`)
- **Authentication:** Custom JWT with `HttpOnly` cookies (Access & Refresh tokens)
- **Media Storage:** AWS S3 object storage (lecturer-approved) or Binary Data (`BYTEA`) in PostgreSQL
- **Payments:** Lemon Squeezy integration
- **Email:** Nodemailer with standard SMTP

Transactional email is queued in PostgreSQL and retried by the backend worker up to five times. Apply migration V25 before starting the updated backend. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and a verified `EMAIL_FROM` in `backend/.env`; without credentials, jobs eventually fail and need manual requeue after SMTP is configured. Account verification and password reset links use `FRONTEND_URL` and expire after 24 hours and 1 hour respectively. Verification is currently informational and does not prevent login.

For email links sent to customers, configure `FRONTEND_URL` as a public HTTPS origin. Transactional welcome, order, payment, and delivery emails omit storefront links while it points to localhost or a non-HTTPS URL. SMTP acceptance does not guarantee inbox placement; check the recipient's spam warning and SPF/DKIM/DMARC results when messages are filtered.

### Strict Architectural Guidelines
1. **NO ORMs or Query Builders:** Pure, raw parameterized SQL with `pg` driver only.
2. **NO Third-party Auth Services:** Custom JWT implementation with refresh token rotation.
3. **Media Storage:** AWS S3 cloud object storage (lecturer-approved) or direct PostgreSQL `BYTEA` binary storage.
4. **NO TanStack Query:** Standard `fetch()` or `axios` with React `useEffect`.

---

## 📂 Project Structure

```text
BrightBuy/
├── frontend/               # Next.js frontend application (App Router, TS, Tailwind, Zustand)
│   ├── src/
│   │   ├── app/            # App Router pages and layouts
│   │   ├── components/     # UI components (shadcn/ui and custom)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client fetchers
│   │   ├── store/          # Zustand client state stores
│   │   ├── types/          # TypeScript interfaces & types
│   │   └── lib/            # Utilities (cn, formatters, etc.)
│   ├── public/             # Static assets
│   └── package.json
├── backend/                # Express.js backend REST API
│   ├── src/
│   │   ├── controllers/    # Route controllers / HTTP handlers
│   │   ├── services/       # Core business logic
│   │   ├── models/         # Raw SQL queries and database logic
│   │   ├── routes/         # Express router definitions
│   │   ├── middleware/     # Auth guards, role checks, validation, error handler
│   │   ├── utils/          # JWT signing, password hashing helpers
│   │   ├── config/         # Database pool (`pg.Pool`) and environment configs
│   │   └── index.js        # Express server entry point
│   ├── db/
│   │   ├── init/           # Docker init scripts (e.g. 01-create-db.sql)
│   │   ├── migrations/     # Flyway versioned migration scripts (V1__...)
│   │   └── seed/           # Seed SQL data scripts (01_... to 07_...)
│   └── package.json
├── Docs/                   # Architectural documentation, DB schema, and phase plans
│   ├── Database/           # Single source of truth for DB schema (DB_Schema.md)
│   ├── Phases/             # Phase-by-phase implementation subphases
│   ├── SRS/                # Software Requirements Specification
│   ├── tech stack/         # Tech stack and constraints
│   └── overallplan.md      # Master progress tracker and team allocations
├── docker-compose.yml      # Full-stack orchestration: db, migrations, seed, backend, frontend
├── .gitignore
├── package.json            # Monorepo runner scripts
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Docker & Docker Compose**: For running PostgreSQL, Flyway, and database seeds

### 1. Installation
Clone the repository and install all dependencies:

```bash
# Install root orchestration tools
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Environment Variables
Copy the `.env.example` templates in both `frontend` and `backend`. **Both files are required** — `docker-compose.yml` loads them via `env_file` and will refuse to start if they are missing:

```bash
# Frontend
cp frontend/.env.example frontend/.env

# Backend
cp backend/.env.example backend/.env
```

> The backend `.env` DB settings (`localhost:5433`) are for running the backend on your host. When the backend runs inside Docker, `docker-compose.yml` overrides them to `db:5432` automatically.

### 3. Running the Full Stack via Docker (Recommended)
You can run the entire stack (Database, Migrations, Seed, Backend, and Frontend) using Docker Compose with hot-reloading enabled. Ensure Docker is running and execute:
```bash
docker compose up --build
```
Services start in this order: `db` (healthy) → `migrations` (Flyway, exits) → `seed` (exits) → `backend` → `frontend`.
- PostgreSQL on host port `5433` (internal `db:5432`)
- Backend API at: `http://localhost:5000` (health: `http://localhost:5000/api/health`)
- Frontend at: `http://localhost:3000`

Seed scripts only run when the database is empty, so restarting the stack never duplicates data.

Hot-reloading: source folders are bind-mounted into the containers. Edits to `backend/src` restart nodemon, and edits to `frontend/src` trigger Next.js fast refresh. File-watch polling is enabled so this also works with Windows bind mounts.

**Default Seed Credentials:**
- Admin: `admin@brightbuy.com` / `password123`
- Employee: `employee1@brightbuy.com` / `password123`

### 4. Running Locally without Docker (Alternative)
If you prefer not to use Docker for the frontend and backend, you can start just the database tooling:
```bash
docker compose up db migrations seed
```
Then, start the frontend and backend development servers manually from the root directory:

```bash
npm run dev
```

This will run:
- Frontend at: `http://localhost:3000`
- Backend API at: `http://localhost:5000`

### 5. Everyday Docker Commands

| Task | Command |
|------|---------|
| Start in background | `docker compose up -d` |
| Rebuild after `package.json` changes | `docker compose up -d --build` |
| Stop (keep data) | `docker compose down` |
| **Reset DB** (wipe data, re-run migrations + seed) | `docker compose down -v` then `docker compose up --build` |
| View all logs (follow) | `docker compose logs -f` |
| View one service's logs | `docker compose logs -f backend` (or `frontend`, `db`, `migrations`, `seed`) |
| Service status | `docker compose ps -a` |
| Open a psql shell | `docker compose exec db psql -U postgres -d brightbuy` |

### 6. Common Errors

| Symptom | Cause / Fix |
|---------|-------------|
| `env file ... not found` on `up` | Create `frontend/.env` and `backend/.env` from the `.env.example` files (step 2). |
| `port is already allocated` (5433 / 5000 / 3000) | Another process (local Postgres, a running `npm run dev`) is using the port. Stop it, or change the host-side port in `docker-compose.yml`. |
| `migrations` exits with a Flyway validation/checksum error | An already-applied migration file was edited. Never edit applied migrations — add a new `V__` file. For local dev, reset with `docker compose down -v`. |
| `seed` exits with an error | A seed script failed (seeds stop on the first SQL error). Check `docker compose logs seed`, fix the script, then reset with `docker compose down -v`. |
| `backend`/`frontend` never start | They wait for `seed` to complete successfully. Check `docker compose logs migrations seed`. |
| `/api/health` returns `database: disconnected` | Check `docker compose ps` that `db` is healthy. When running the backend on the host, `backend/.env` must use `DB_HOST=localhost`, `DB_PORT=5433`, and the credentials from `.env.example`. |
| New npm package not found in the container | `node_modules` lives in an anonymous volume. Rebuild with `docker compose up -d --build --renew-anon-volumes`. |
| Code changes don't hot-reload | Edit files inside `frontend/` or `backend/` (bind-mounted), or restart the service: `docker compose restart frontend` (or `backend`). |

---

## 🌐 Production Deployment (AWS EC2)

The production deployment previously ran on **AWS EC2** using a containerized multi-service stack orchestrated by Docker Compose.

> **Status:** **Decommissioned on 2026-10-23.** The cloud EC2 instance was permanently terminated, the Elastic IP released, and cloud media storage deleted to eliminate cloud hosting costs. The complete AWS CLI audit trail and teardown log are documented in [Docs/Deployment/aws-infrastructure.md](Docs/Deployment/aws-infrastructure.md).

### Architecture Overview

```text
Incoming Traffic (HTTP 80 / HTTPS 443)
                    │
                    ▼
     ┌──────────────────────────────┐
     │    Nginx (Reverse Proxy)     │
     └──────────────┬───────────────┘
                    │
         ┌──────────┴──────────┐
         │ /api/*              │ /*
         ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│ Express Backend  │  │ Next.js Frontend │
│   (Port 5000)    │  │   (Port 3000)    │
└────────┬─────────┘  └──────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│        PostgreSQL Engine (Port 5432)         │
│  ├── brightbuy_prod (Live website data)      │
│  └── brightbuy_dev  (Remote team dev data)   │
└──────────────────────────────────────────────┘
```

### Remote Development Database (For Local Development)
All team members can point their local `backend/.env` directly to the shared remote PostgreSQL engine on AWS without needing to run a local database:
```env
DB_HOST=18.208.53.186
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=BrightBuy2026SecurePass!
DB_NAME=brightbuy_dev
```
> **Environment Isolation:** Team members connect exclusively to `brightbuy_dev`. The live production site connects exclusively to `brightbuy_prod`. Experiments, test runs, and seed resets in `brightbuy_dev` never touch or corrupt live production data.

### Automated CI/CD Workflow (GitHub Actions)
1. **Continuous Integration (`.github/workflows/ci.yml`):**
   - Automatically triggers on every push and pull request targeting `main`.
   - Starts a PostgreSQL test container with Flyway migrations.
   - Runs Jest test suites (91 unit & integration tests) and product validation tests.
   - Verifies Next.js production build (`npm run build`) and ESLint checks.
   - Verifies backend and frontend production Docker images build successfully.
2. **Continuous Deployment (`.github/workflows/cd.yml`):**
   - Automatically triggers on push/merge to `main` upon passing CI checks.
   - Securely SSHes into the EC2 instance using GitHub repository secrets (`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`).
   - Pulls the latest `main` commit.
   - Executes `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build --remove-orphans`.
   - Performs a curl health check verifying HTTP 200 OK before completing the deployment.

---

## 👥 Team Members & Database Responsibilities (Who Did What)

Database responsibilities across BrightBuy were split among all 5 team members. Each member took end-to-end ownership of their schema domain: authoring the Flyway DDL migration files, foreign-key relationships, constraints, indexes, triggers, and corresponding seed datasets.

### Team Overview & DB Ownership Matrix

| Team Member | Role | Schema Domain | Tables Owned | Flyway Migrations | Seed Scripts |
|-------------|------|---------------|--------------|-------------------|--------------|
| **Rithmi** | Frontend – Storefront | [Catalog Taxonomy](Docs/Phases/Phase1-Project-Foundation/phase1.5-catalog-taxonomy-schema.md) | `categories`, `product_categories`, `variant_attributes`, `variant_attribute_values` | `V7`, `V8`, `V12`, `V13` | `03_taxonomy.sql`, `05_catalog_links.sql` |
| **Thinura** | Frontend – Admin/Cart | [Customer & Cart](Docs/Phases/Phase1-Project-Foundation/phase1.4-customer-cart-schema.md) | `customers`, `addresses`, `carts`, `cart_items` | `V5`, `V6`, `V14`, `V15`, `V29` | `02_customers.sql`, `06_carts.sql` |
| **Kavindu** | Backend – Products | [Product Catalog & Inventory](Docs/Phases/Phase1-Project-Foundation/phase1.6-product-schema.md) | `products`, `product_variants`, `product_images`, `inventory_adjustments` | `V9`, `V10`, `V11`, `V20`, `V22`, `V23`, `V26`, `V27`, `V28`, `V34` | `04_products.sql` (40 products / 70+ variants) |
| **Mayura** | Backend – Orders | [Orders, Payments & Deliveries](Docs/Phases/Phase1-Project-Foundation/phase1.7-order-payment-delivery-schema.md) | `orders`, `order_items`, `payments`, `deliveries`, `email_jobs` | `V16`, `V17`, `V18`, `V19`, `V25`, `V30`, `V31` | `07_orders.sql` |
| **Ranuja** | DevOps + Architecture | [Identity, Tooling & Scaffolding](Docs/Phases/Phase1-Project-Foundation/phase1.3-identity-location-schema.md) | `users`, `employees`, `super_admin_guard`, `refresh_tokens`, `cities`, `media_uploads`, `media_cleanup_ledger` | `V1`, `V2`, `V3`, `V4`, `V21`, `V24`, `V32`, `V33`, `V35`, `V36` | `01_identity.sql` |

---

### Detailed Contributions by Team Member

#### Rithmi (Storefront & Catalog Taxonomy)
* **Schema Domain:** [Phase 1.5 – Catalog Taxonomy Schema](Docs/Phases/Phase1-Project-Foundation/phase1.5-catalog-taxonomy-schema.md)
* **Owned Tables:**
  - `categories`: Self-referencing hierarchical product categories (`parent_category_id`).
  - `product_categories`: Many-to-many junction connecting products to multiple categories.
  - `variant_attributes`: Attribute dimension definitions (e.g., Color, Size, Storage, Material).
  - `variant_attribute_values`: Normalized attribute-value assignments for individual product variants.
* **Flyway Migrations Authored:**
  - `V7__create_categories.sql`
  - `V8__create_variant_attributes.sql`
  - `V12__create_product_categories.sql`
  - `V13__create_variant_attribute_values.sql`
* **Seed Scripts Authored:**
  - `03_taxonomy.sql`: Category hierarchy tree and attribute dimension seed data.
  - `05_catalog_links.sql`: Product-category linkages and variant attribute-value mappings.
* **Key Database Logic & Optimization:**
  - Recursive self-referential category parent-child hierarchy.
  - Foreign key indexing on category and taxonomy lookup paths.

#### Thinura (Admin UI, Customer & Shopping Cart)
* **Schema Domain:** [Phase 1.4 – Customer & Cart Schema](Docs/Phases/Phase1-Project-Foundation/phase1.4-customer-cart-schema.md)
* **Owned Tables:**
  - `customers`: Customer profiles linked 1-to-1 with `users`.
  - `addresses`: Shipping and billing addresses linked to cities.
  - `carts`: Active customer shopping carts.
  - `cart_items`: Cart line items with variant associations and quantities.
* **Flyway Migrations Authored:**
  - `V5__create_customers.sql`
  - `V6__create_addresses.sql`
  - `V14__create_carts.sql`
  - `V15__create_cart_items.sql`
  - `V29__cart_uniqueness_and_checkout_concurrency.sql`
* **Seed Scripts Authored:**
  - `02_customers.sql`: Customer users, personal profiles, and addresses across multiple cities.
  - `06_carts.sql`: Sample active shopping carts and cart items.
* **Key Database Logic & Optimization:**
  - Partial unique index `idx_addresses_default` enforcing at most one default address per customer (`WHERE is_default = true`).
  - Strict composite uniqueness constraint `UNIQUE(cart_id, variant_id)` on `cart_items` to prevent duplicate line items.
  - Concurrency control and optimistic row locking during checkout cart state transitions.

#### Kavindu (Product Catalog & Inventory)
* **Schema Domain:** [Phase 1.6 – Product Schema](Docs/Phases/Phase1-Project-Foundation/phase1.6-product-schema.md)
* **Owned Tables:**
  - `products`: Master product catalog records, base SKUs, descriptions, and brands.
  - `product_variants`: Product variant SKUs, pricing, and stock levels.
  - `product_images`: Primary and secondary product image associations.
  - `inventory_adjustments`: Historical stock adjustment audit trail.
* **Flyway Migrations Authored:**
  - `V9__create_products.sql`
  - `V10__create_product_variants.sql`
  - `V11__create_product_images.sql`
  - `V20__create_inventory_adjustments.sql`
  - `V22__add_product_price_index.sql`
  - `V23__add_search_trgm_index.sql`
  - `V26__replace_image_data_with_image_url.sql`
  - `V27__set_catalog_updated_at_on_update.sql`
  - `V28__apparel_variant_matrix_seed.sql`
  - `V34__inventory_adjustment_audit_trigger.sql`
* **Seed Scripts Authored:**
  - `04_products.sql`: Heaviest dataset in the system — 40 comprehensive products across 8 categories with 70+ variants, SKUs, and cloud image URLs.
* **Key Database Logic & Optimization:**
  - GIN Trigram indexes (`pg_trgm`) on `product_name` and `brand` for high-performance fuzzy text search.
  - B-tree price index on `product_variants(price)` for fast range-based catalog filtering.
  - Inventory audit triggers (`V34`) automatically recording stock quantity deltas into `inventory_adjustments`.
  - Automated `updated_at` triggers updating catalog modification timestamps.

#### Mayura (Orders, Payments & Deliveries)
* **Schema Domain:** [Phase 1.7 – Order, Payment & Delivery Schema](Docs/Phases/Phase1-Project-Foundation/phase1.7-order-payment-delivery-schema.md)
* **Owned Tables:**
  - `orders`: Order headers, order statuses, totals, and address snapshots.
  - `order_items`: Order line item snapshots with historical unit prices at time of purchase.
  - `payments`: Payment transaction records, gateway references, and payment methods.
  - `deliveries`: Shipment tracking numbers, carriers, and delivery stages.
  - `email_jobs`: Transactional email queue table for asynchronous reliable delivery.
* **Flyway Migrations Authored:**
  - `V16__create_orders.sql`
  - `V17__create_order_items.sql`
  - `V18__create_payments.sql`
  - `V19__create_deliveries.sql`
  - `V25__email_jobs_and_auth_tokens.sql`
  - `V30__order_transitions_and_payment_uniqueness.sql`
  - `V31__delivery_cardinality_and_mode_constraints.sql`
* **Seed Scripts Authored:**
  - `07_orders.sql`: Historical orders with items, payments, and delivery tracking.
* **Key Database Logic & Optimization:**
  - Order state machine transitions (`V30`) enforcing valid status lifecycles (`pending` → `processing` → `shipped` → `delivered` / `cancelled`).
  - Unique payment transaction constraints preventing double-charges and duplicate payment webhooks.
  - High-concurrency background job queue using `SELECT ... FOR UPDATE SKIP LOCKED` for transactional email processing (`email_jobs`).

#### Ranuja (DevOps, Architecture & Identity)
* **Schema Domains:** [Phase 1.1 Scaffolding](Docs/Phases/Phase1-Project-Foundation/phase1.1-project-scaffolding.md), [Phase 1.2 DB Tooling](Docs/Phases/Phase1-Project-Foundation/phase1.2-database-tooling.md), [Phase 1.3 Identity & Location](Docs/Phases/Phase1-Project-Foundation/phase1.3-identity-location-schema.md), [Phase 1.8 Integration](Docs/Phases/Phase1-Project-Foundation/phase1.8-migration-integration-verification.md)
* **Owned Tables:**
  - `users`: Core authentication table, bcrypt hashes, and primary system roles.
  - `employees`: Internal staff profiles with granular RBAC sub-roles.
  - `super_admin_guard`: Dedicated concurrency serialization gate preventing accidental super-admin lockout.
  - `refresh_tokens`: Hashed JWT refresh tokens with rotation and expiration timestamps.
  - `cities`: Geographical locations, states, and main-city shipping flags.
  - `media_uploads` & `media_cleanup_ledger`: S3 cloud media upload registry and orphan cleanup tracking.
* **Flyway Migrations Authored:**
  - `V1__create_users.sql`
  - `V2__create_cities.sql`
  - `V3__create_employees.sql`
  - `V4__create_refresh_tokens.sql`
  - `V21__add_employee_role.sql`
  - `V24__add_employee_active_status.sql`
  - `V32__super_admin_protection_trigger.sql`
  - `V33__category_cycle_prevention_trigger.sql`
  - `V35__app_database_role_and_grants.sql`
  - `V36__media_uploads_and_cleanup_ledger.sql`
* **Seed Scripts Authored:**
  - `01_identity.sql`: Supported cities, initial super admin, and department employee staff accounts.
* **Key Database Infrastructure & Logic:**
  - Dual-environment PostgreSQL architecture on AWS EC2 (`brightbuy_prod` for live site, `brightbuy_dev` for team remote development).
  - Flyway migration tooling, automated CI/CD database runners (`scripts/setup-ci-database.js`), and schema verification checks.
  - Strict PL/pgSQL triggers (`V32`) guaranteeing that at least one active `super_admin` always exists in the database.
  - Category cyclic dependency prevention trigger (`V33`) ensuring no circular parent-child loops occur in taxonomies.
  - Least-privilege application database role and permission grants (`V35`).

---

## 📖 Master Documentation
For complete requirements, phase breakdowns, and architecture specifications, refer to:
- [Docs/overallplan.md](Docs/overallplan.md) — Master phase tracker, milestones, and status.
- [Docs/Database/DB_Schema.md](Docs/Database/DB_Schema.md) — Single source of truth for all database tables, columns, indexes, and constraints.
- [Docs/Deployment/aws-infrastructure.md](Docs/Deployment/aws-infrastructure.md) — AWS EC2 infrastructure, S3 bucket configuration, and audit trail.

