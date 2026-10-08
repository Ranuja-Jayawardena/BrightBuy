# Phase 2.1: Development Dockerfiles

> **Parent Phase:** [Phase 2: Full-Stack Dockerization](phase2-full-stack-dockerization.md)
> **Status:** Complete
> **Assigned To:** E
> **Depends On:** 1.8
> **Blocks:** 2.2

---

## Goal

Build development images for the frontend and backend that support hot-reloading.

---

## Tasks

- [x] Write `frontend/Dockerfile.dev` for Next.js with hot-reloading via volume mounts
- [x] Write `backend/Dockerfile.dev` for Express.js with hot-reloading (nodemon) via volume mounts
- [x] Add `.dockerignore` files for frontend and backend (exclude `node_modules`, `.next`, `.env`)
- [x] Make sure `node_modules` inside the container is not overwritten by the host mount (anonymous volume)

---

## Definition of Done

- Both images build successfully and start their dev servers inside a container.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

