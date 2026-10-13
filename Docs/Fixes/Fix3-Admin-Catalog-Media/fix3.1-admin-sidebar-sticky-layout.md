# Fix 3.1: Admin Sticky Sidebar Layout

> **Parent Group:** [Fix 3: Admin Catalog & Media Management](fix3-admin-catalog-media.md)
> **Status:** Complete
> **Assigned To:** Member B (Frontend Admin UI Layout)
> **Depends On:** —
> **Blocks:** —
> **Priority:** Medium
> **DB Schema Reference:** —

---

## Problem Description

On the admin dashboard and management pages (`/admin`, `/admin/products`, `/admin/orders`, `/admin/reports`), scrolling down through long lists or data tables causes the desktop sidebar navigation to scroll out of view off the top of the screen. Administrators lose access to navigation links and must scroll back to the top of the page.

---

## Root Cause

In `frontend/src/app/admin/layout.tsx`:
```tsx
<aside className="hidden md:flex flex-col w-64 border-r bg-muted/20 shrink-0 p-4">
```
The `<aside>` is rendered as a normal block in a flex row without `sticky` positioning, viewport height limitation, or independent overflow handling.

---

## Tasks

### Frontend — Member B
- [x] In `frontend/src/app/admin/layout.tsx`:
  - Update the desktop `<aside>` classes to include:
    `sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto`
  - Ensure the sidebar stays locked in place while the `<main>` content container scrolls freely.
  - Test on various viewport heights (laptop and desktop monitors).

---

## Affected Files

- `frontend/src/app/admin/layout.tsx`

---

## Definition of Done

1. When navigating down long pages in the admin dashboard, the desktop sidebar remains completely anchored and visible.
2. If the sidebar navigation list ever exceeds the viewport height, the sidebar scrolls independently within its own column without affecting the main page.
