# Phase 10.6: Production Deployment

> **Parent Phase:** [Phase 10: Polish, Testing & Deployment](phase10-polish-testing-deployment.md)
> **Status:** Not Started
> **Assigned To:** E
> **Depends On:** 10.1, 10.2, 10.3, 10.4, 10.5
> **Blocks:** — (final subphase)

---

## Tasks

- [ ] Deploy the frontend to Vercel
- [ ] Deploy the backend to Railway or Render
- [ ] Deploy the database to managed PostgreSQL (Railway or Render)
- [ ] Configure production environment variables on all platforms (JWT secrets, SMTP, Lemon Squeezy keys, DB URL)
- [ ] Run Flyway migrations against production
- [ ] Point the Lemon Squeezy webhook at the production URL
- [ ] Production build and smoke test (browse → register → cart → checkout → pay → admin → reports)
- [ ] Update `README.md` with deployment instructions and live URLs

---

## Definition of Done

- The full customer and admin flow works on the live URLs.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

