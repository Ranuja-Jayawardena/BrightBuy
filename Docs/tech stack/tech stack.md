# BrightBuy Tech Stack

## Frontend
- **Framework:** Next.js
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **State Management:** Zustand
- **Data Fetching:** Standard `fetch()` or `Axios` using React `useEffect`. No abstraction libraries like TanStack Query.

## Backend
- **Framework:** Express.js
- **Architecture:** Standard RESTful API endpoints.

## Database
- **Database Management System:** PostgreSQL
- **Migration Tool:** Flyway (via Docker). Executes raw `.sql` files to manage database version control.
- **Query Method:** Raw SQL (using `pg` driver). 
- **Constraint:** NO ORMs or query builders (e.g., Prisma, TypeORM, Knex) are allowed. Must write pure SQL to demonstrate database proficiency.

## Authentication
- **Method:** JWT (JSON Web Tokens)
- **Strategy:** Short-lived Access Tokens paired with Long-lived Refresh Tokens.
- **Storage:** `HttpOnly` Cookies (for robust XSS protection).
- **Constraint:** Fully custom implementation. No third-party authentication services or libraries like Supabase or Better Auth are permitted.

## File & Media Storage
- **Method:** Directly in PostgreSQL
- **Format:** Binary Data (`BYTEA` column) or Base64 Strings. No third-party storage (like AWS S3 or Cloudinary) is permitted.

## Payments
- **Gateway:** Lemon Squeezy

## Email Service
- **Library:** Nodemailer
- **Method:** Standard SMTP with a demo/dummy email account (e.g., Gmail App Passwords) to keep it simple and framework-agnostic.

## Orchestration & Deployment
- **Tool:** Docker & Docker Compose
- **Scope:** Full-stack containerization. The database, migrations (Flyway), seeding, backend API, and frontend UI are all orchestrated locally via `docker-compose.yml`.
