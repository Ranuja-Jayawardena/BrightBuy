# Phase 3.3: Auth Pages & Zustand Store

> **Parent Phase:** [Phase 3: Authentication System](phase3-authentication-system.md)
> **Status:** Complete
> **Assigned To:** B
> **Depends On:** Phase 2 (can build against the [3.1 contracts](phase3.1-auth-api-endpoints.md#api-contracts) with mocks); 3.1 to integrate
> **Blocks:** 3.4

---

## Goal

Build the login and register pages and the client-side auth state.

---

## Tasks

- [x] Login page (`/login`) — email/password form built with shadcn/ui components
- [x] Register page (`/register`) — first name, last name, email, password, phone fields
- [x] Client-side form validation with inline error messages
- [x] Zustand auth store — `user`, `isAuthenticated`, `isLoading`, plus `login`, `register`, `logout`, `fetchMe` actions (using `fetch`/Axios — no TanStack Query)
- [x] Load the current user via `GET /api/auth/me` when the app starts
- [x] Connect the pages to the real endpoints once 3.1 is done

---

## Definition of Done

- A user can register, log in, and log out; the store reflects the auth state correctly.

---

## Key Decisions & Notes

1. **Hybrid Authentication Flow (Post-Phase 10 Polish):** The `/login` page was enhanced with smart role-based redirect logic. After successful authentication, if the user's role is `admin`, they are automatically forwarded to `/admin` instead of the customer homepage (`/`). Additionally, the `?redirect=` query parameter (set by route guards like `AdminRoute` and `ProtectedRoute`) is now honored, so users land on the page they originally tried to visit. This eliminates the confusing experience where admin staff logged in via `/login` and were dumped on the customer storefront with no obvious path to the admin dashboard.
2. **Staff Can Still Use `/login`:** The customer login portal does not block admin accounts. It simply detects them post-login and redirects intelligently. This ensures staff are never locked out if they navigate to the wrong login page by habit.

