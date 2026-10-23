# Presentation Intro Script — Team Member E (DevOps & Architecture)

**Target Audience:** Lecturer / Evaluator  
**Format:** Spoken verbal overview (No slides)  
**Estimated Time:** ~3 minutes

---

## Spoken Script

"Good morning. I’ll be giving an overview of the architecture and infrastructure for our project, **BrightBuy**, which is a retail inventory and online order management system specialized for consumer tech products.

### 1. Project & Tech Stack Choices

For our frontend, we used **Next.js with TypeScript, Tailwind CSS, and shadcn/ui**, with **Zustand** for state management. We used standard `fetch` within React hooks instead of external data-fetching libraries to keep the bundle size small and data flow straightforward.

For the backend, we built a REST API using **Node.js and Express** connected to **PostgreSQL 15**. Following the project guidelines, we wrote pure **raw SQL using the `pg` driver without any ORMs**. This gives us direct control over database transactions, indexing, and query performance. Database schema changes and seed data are managed deterministically using **Flyway migrations**.

For authentication, we implemented a custom **JWT solution** using access tokens and `HttpOnly` refresh cookies for session security without third-party auth services.

Product media is stored in **AWS S3** using presigned URLs and immutable hashing, which offloads media handling from our database and application servers.

### 2. Atomic Checkout & Inventory Concurrency

One critical requirement was managing atomic checkout without inventory race conditions. If two customers try to purchase the last available unit simultaneously:

- The checkout runs inside a single PostgreSQL transaction.
- We first lock the customer's cart row, and then acquire row-level locks on the product variants using `SELECT ... FOR UPDATE`, ordered by variant ID to prevent deadlocks.
- The transactions execute sequentially: the first request validates stock, creates the order and delivery records, deducts inventory, and commits.
- When the second request unblocks, it reads the updated zero-stock value and rolls back cleanly with an out-of-stock response.
- We also use `X-Idempotency-Key` headers so that duplicate submissions or network retries return the existing order rather than re-deducting stock.

### 3. Containerization & Email Service

The entire application is containerized using **Docker and Docker Compose**. Frontend, backend, PostgreSQL, Flyway migrations, and our Nginx reverse proxy all run in networked containers, ensuring parity between local development and production.

For transactional notifications, we built an email service using **Nodemailer via SMTP**. It handles order confirmations and delivery status updates asynchronously so it doesn't block the API response.

### 4. CI/CD & Hosting

Our CI/CD is automated using **GitHub Actions**:

- On pull requests and pushes to `dev`, the CI workflow runs linters, database migrations against a test PostgreSQL container, and backend unit/integration tests.
- Our `main` branch is protected. Once changes are merged into `main`, the CD pipeline automatically connects via SSH to our cloud server, pulls the repository, rebuilds the containers, and verifies the health endpoint.

For hosting, the application is deployed on an **AWS EC2 instance (Ubuntu 22.04 LTS)** in `us-east-1` with an Elastic IP. It runs our production Docker Compose stack, fronted by **Nginx** as a reverse proxy managing routing and SSL.

With that technical overview, I’ll hand over to the team to demonstrate the features."

---

## Quick Reference / Speaking Points

- **Project:** BrightBuy — consumer tech retail and order management system.
- **Frontend:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, Zustand (standard `fetch`, no heavy libraries).
- **Backend & DB:** Express.js + PostgreSQL 15, pure raw SQL via `pg` (no ORMs), Flyway migrations.
- **Auth & Storage:** Custom JWT with `HttpOnly` cookies; AWS S3 for media storage.
- **Atomic Checkout:** Single transaction with `SELECT ... FOR UPDATE` on cart and sorted variant IDs. First checkout commits, second sees 0 stock and rolls back. Idempotency keys prevent duplicate orders on retry.
- **Containerization:** Multi-container Docker Compose (frontend, backend, db, Nginx).
- **Email:** Asynchronous Nodemailer SMTP for order and shipping notifications.
- **CI/CD:** GitHub Actions (lint, test, migration checks on PR/dev; auto-deploy on `main`).
- **Hosting:** AWS EC2 (Ubuntu 22.04 LTS, `us-east-1`, Elastic IP) running Docker Compose with Nginx reverse proxy.
