# Phase 3.2: Auth Middleware & Role Guards

> **Parent Phase:** [Phase 3: Authentication System](phase3-authentication-system.md)
> **Status:** Not Started
> **Assigned To:** E
> **Depends On:** 3.1
> **Blocks:** 5.1, 5.2, 6.1, 7.1 – 7.4, 9.1, 9.2 (all protected endpoints)

---

## Goal

Provide reusable Express middleware that every other backend member uses to protect their routes.

---

## Tasks

- [ ] `requireAuth` middleware — verify the access token cookie and attach `req.user = { user_id, role, customer_id? }`
- [ ] `requireRole('admin')` middleware — restrict a route to a given role, return `403` otherwise
- [ ] Return a consistent `401` response for missing/expired tokens (so the frontend knows to refresh)
- [ ] Short usage guide in this doc's notes (how C and D mount the middleware on their routers)

---

## Definition of Done

- C and D can protect any route with one line (e.g. `router.use(requireAuth, requireRole('admin'))`).
- `req.user` shape is documented below and stable.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

