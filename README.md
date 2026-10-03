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
- **Media Storage:** Binary Data (`BYTEA`) stored directly in PostgreSQL
- **Payments:** Lemon Squeezy integration
- **Email:** Nodemailer with standard SMTP

### Strict Architectural Guidelines
1. **NO ORMs or Query Builders:** Pure, raw parameterized SQL with `pg` driver only.
2. **NO Third-party Auth Services:** Custom JWT implementation with refresh token rotation.
3. **NO External Storage (e.g. S3):** Images are stored directly in PostgreSQL.
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
├── docker-compose.yml      # Orchestration for Postgres, Flyway, and Seed runner
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
Copy the `.env.example` templates in both `frontend` and `backend`:

```bash
# Frontend
cp frontend/.env.example frontend/.env.local

# Backend
cp backend/.env.example backend/.env
```

### 3. Database Tooling (Postgres, Flyway, Seed)
To run migrations and seeds locally using Docker Compose, make sure Docker is running and execute:
```bash
docker-compose up db migrations seed
```
This will start PostgreSQL on port 5432, run the Flyway migrations from `backend/db/migrations/`, and apply the seed scripts from `backend/db/seed/`.

**Default Seed Credentials:**
- Admin: `admin@brightbuy.com` / `password123`
- Employee: `employee1@brightbuy.com` / `password123`

### 4. Running the Development Servers
From the root directory:

```bash
npm run dev
```

This will run:
- Frontend at: `http://localhost:3000`
- Backend API at: `http://localhost:5000`

---

## 👥 Team Assignments & Phase Tracking
See [Docs/overallplan.md](Docs/overallplan.md) for full phase plans, subphases, and assigned team members.
