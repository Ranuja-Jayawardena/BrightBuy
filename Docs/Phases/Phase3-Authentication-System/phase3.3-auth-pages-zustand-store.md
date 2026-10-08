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

_Record any implementation decisions, trade-offs, or deviations from the plan here._

