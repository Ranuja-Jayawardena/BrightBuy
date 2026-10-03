# Phase 10.5: Security Hardening

> **Parent Phase:** [Phase 10: Polish, Testing & Deployment](phase10-polish-testing-deployment.md)
> **Status:** Not Started
> **Assigned To:** E
> **Depends On:** Phase 3, 6.1
> **Blocks:** 10.6

---

## Tasks

- [ ] Rate limiting on auth endpoints (prevent brute force)
- [ ] CORS configuration (restrict to the frontend origin, allow credentials)
- [ ] SQL injection audit — confirm every query in the codebase uses parameterized queries (`$1, $2`)
- [ ] XSS protection review (Content-Security-Policy headers)
- [ ] Helmet.js middleware for HTTP security headers
- [ ] Unit tests for auth flows (login, refresh rotation, logout, role guards)

---

## Definition of Done

- Security checklist complete; auth tests pass.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

