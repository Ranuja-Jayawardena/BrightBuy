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

## 👥 Team Assignments & Phase Tracking
See [Docs/overallplan.md](Docs/overallplan.md) for full phase plans, subphases, and assigned team members.
