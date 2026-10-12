# Phase 3.4: Session Handling & Route Protection

> **Parent Phase:** [Phase 3: Authentication System](phase3-authentication-system.md)
> **Status:** Complete
> **Assigned To:** B
> **Depends On:** 3.3, 3.1
> **Blocks:** 4.4, 5.4, 7.5 (anything that needs a logged-in user on the frontend)

---

## Goal

Keep users logged in without them noticing, and guard pages that require authentication.

---

## Tasks

- [x] Shared API client in `frontend/src/services/` — intercepts `401` responses, silently calls `POST /api/auth/refresh`, retries the original request once
- [x] Prevent multiple refresh calls running at the same time (queue requests while a refresh is in progress)
- [x] Protected route wrapper component — redirects unauthenticated users to `/login` (with a `?redirect=` back-link)
- [x] Admin route wrapper — redirects non-admin users away from `/admin/*`
- [x] Auth-aware navbar — Login/Register for guests, profile menu + logout for authenticated users

---

## Definition of Done

- An expired access token refreshes silently with no visible error.
- Guests hitting `/cart`, `/checkout`, or `/admin` are redirected correctly.
- Other frontend members (A) reuse the shared API client and wrappers.

---

## Key Decisions & Notes

1. **Dedicated Staff Login Portal (`/admin/login`) (Post-Phase 10 Polish):** A separate back-office login page was introduced at `/admin/login` with staff-specific branding ("BrightBuy Operations & Staff Sign In"). This page uses the same backend `POST /api/auth/login` endpoint but adds a frontend role check after authentication: if a customer account tries to log in here, they are shown a clear rejection message ("Access restricted to authorized staff & administrators") instead of being silently redirected. Staff who log in here land directly on `/admin`.
2. **AdminRoute Guard Updated:** The `AdminRoute` wrapper component now redirects unauthenticated users to `/admin/login?redirect=...` instead of the customer-facing `/login?redirect=...`. This ensures staff see the dedicated back-office portal when their session expires or when they first visit any `/admin/*` route.
3. **Dual-Portal Access:** Staff are not restricted to `/admin/login`. They can also log in via the standard customer `/login` page, which detects admin roles post-login and automatically redirects them to `/admin` (see phase3.3 Key Decisions).

