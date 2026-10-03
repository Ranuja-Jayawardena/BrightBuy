# Phase 3.4: Session Handling & Route Protection

> **Parent Phase:** [Phase 3: Authentication System](phase3-authentication-system.md)
> **Status:** Not Started
> **Assigned To:** B
> **Depends On:** 3.3, 3.1
> **Blocks:** 4.4, 5.4, 7.5 (anything that needs a logged-in user on the frontend)

---

## Goal

Keep users logged in without them noticing, and guard pages that require authentication.

---

## Tasks

- [ ] Shared API client in `frontend/src/services/` — intercepts `401` responses, silently calls `POST /api/auth/refresh`, retries the original request once
- [ ] Prevent multiple refresh calls running at the same time (queue requests while a refresh is in progress)
- [ ] Protected route wrapper component — redirects unauthenticated users to `/login` (with a `?redirect=` back-link)
- [ ] Admin route wrapper — redirects non-admin users away from `/admin/*`
- [ ] Auth-aware navbar — Login/Register for guests, profile menu + logout for authenticated users

---

## Definition of Done

- An expired access token refreshes silently with no visible error.
- Guests hitting `/cart`, `/checkout`, or `/admin` are redirected correctly.
- Other frontend members (A) reuse the shared API client and wrappers.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

