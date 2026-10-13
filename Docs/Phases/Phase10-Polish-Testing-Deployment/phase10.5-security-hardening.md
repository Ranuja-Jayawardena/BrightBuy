# Phase 10.5: Security Hardening

> **Parent Phase:** [Phase 10: Polish, Testing & Deployment](phase10-polish-testing-deployment.md)
> **Status:** Complete
> **Assigned To:** E
> **Depends On:** Phase 3, 6.1
> **Blocks:** 10.6

---

## Tasks

- [x] Rate limiting on auth endpoints (prevent brute force)
- [x] CORS configuration (restrict to the frontend origin, allow credentials)
- [x] SQL injection audit — confirm every query in the codebase uses parameterized queries (`$1, $2`)
- [x] XSS protection review (Content-Security-Policy headers)
- [x] Helmet.js middleware for HTTP security headers
- [x] Unit tests for auth flows (login, refresh rotation, logout, role guards)

---

## Definition of Done

- Security checklist complete; auth tests pass.

---

## Key Decisions & Notes

- **Helmet & Media CORP Policy:** Configured `helmet` with `crossOriginResourcePolicy: { policy: 'cross-origin' }` to ensure customer-facing and admin product images served via `/api/images/:id` load seamlessly in Next.js `<img>` tags across domains without browser cross-origin blocks.
- **Content Security Policy (CSP):** Enforced baseline directives restricting scripts to `'self'`, styles to `'self'` and `'unsafe-inline'`, images to `'self'`, `data:`, and `blob:`, and object-src to `'none'`.
- **CORS Configuration:** Configured CORS with origin verification against `FRONTEND_URL` (with fallback to `http://localhost:3000`), `credentials: true`, allowed methods (`GET, POST, PUT, PATCH, DELETE, OPTIONS`), and allowed headers.
- **Rate Limiting:** Implemented `authLimiter` (20 requests per 15-minute window for sensitive `/api/auth/register`, `/api/auth/login`, and `/api/auth/refresh` endpoints) and `apiLimiter` (500 requests per 15-minute window across `/api/*`). Errors output standard `{ error: 'Too Many Requests', message: '...', statusCode: 429 }`.
- **SQL Injection Audit:** Audited all raw SQL queries across `models/`, `services/`, and `controllers/`. All dynamic queries use parameterized bindings (`$1, $2, ...`), with table sorting/period groupings constrained strictly to hardcoded whitelists.
- **Shared Error Contract Alignment:** Error handling middleware and 404 handlers standardized to `{ error: '...', message: '...', statusCode: ... }`.
- **Automated Test Suite:** Created 3 test suites (`auth.test.js`, `middleware.test.js`, `securityHeaders.test.js`) totaling 21 passing automated tests in Jest & Supertest covering login, registration, token refresh rotation, logout, `requireAuth`, `requireRole`, rate limiting, and security headers.

## Fix 8 follow-up

Database integrity and concurrency work is tracked separately in [Fix 8](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 8.11: Application & Migration Database Accounts](../../Fixes/Fix8-Database-Integrity-Concurrency/fix8.11-database-account-separation.md)

Read the Fix 8 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
