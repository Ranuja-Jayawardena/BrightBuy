# Fix 4.1: Staff Cart & Purchase Policy Enforcement

> **Parent Group:** [Fix 4: Role Permissions & Operations](fix4-role-permissions-operations.md)
> **Status:** Not Started
> **Assigned To:** Member B (Frontend Cart UI & Navbar) & Member D (Backend Cart API)
> **Depends On:** —
> **Blocks:** —
> **Priority:** High
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (tables: `users`, `employees`, `carts`)

---

## Problem Description

1. When an employee or administrator navigates the public storefront and clicks "Add to Cart", they get a generic Javascript alert. Instead, they should see a clear, informative popup explanation stating that staff and administrator accounts are restricted from purchasing items or maintaining shopping carts.
2. When logged in as an administrator or employee, the navigation bar still displays a shopping cart icon with item badges, which is confusing and irrelevant for staff members.

---

## Technical Solution

### 1. Storefront Navbar Cart Icon
In `frontend/src/components/Navbar.tsx`:
- Check user authentication and role:
  - If `user?.role === 'admin'`, hide the cart icon completely from both desktop and mobile navigation headers.
  - Only show the cart icon to guest visitors and users with `role === 'customer'`.

### 2. Add to Cart Warning Dialog
In `frontend/src/app/products/[id]/page.tsx`:
- When "Add to Cart" is clicked:
  - If `user?.role === 'admin'`: intercept before sending request and trigger a modal dialog (`StaffPurchaseRestrictedModal`).
  - Dialog content:
    - Title: **Staff Account Restricted**
    - Message: *"Employees and administrators cannot make store purchases or add items to cart. Please log out and sign in with a standard customer account to place orders."*
    - Actions: `Continue Browsing` or `Log Out`.
- In `frontend/src/app/cart/page.tsx`:
  - If an admin navigates directly to `/cart`, redirect them to `/admin` or show an access notice.

### 3. Backend Verification
- Ensure `backend/src/controllers/cartController.js` reliably returns `403 Forbidden` with structured JSON:
  `{ "error": "forbidden", "message": "Administrative and staff accounts cannot create or modify shopping carts" }`.

---

## Tasks

### Backend — Member D
- [ ] In `backend/src/controllers/cartController.js`:
  - Verify all cart endpoints (`GET /api/cart`, `POST /api/cart/items`, `PUT /api/cart/items/:id`, `DELETE /api/cart/items/:id`) enforce customer-only access and return 403 Forbidden for staff accounts.

### Frontend — Member B
- [ ] In `frontend/src/components/Navbar.tsx`:
  - Conditionally render the cart icon only when `user?.role !== 'admin'`.
- [ ] In `frontend/src/app/products/[id]/page.tsx`:
  - Add `StaffPurchaseRestrictedModal` triggered whenever a staff user attempts to add items to cart.
- [ ] In `frontend/src/app/cart/page.tsx`:
  - Add route protection redirecting staff to `/admin` or displaying the restriction banner.

---

## Affected Files

- `frontend/src/components/Navbar.tsx`
- `frontend/src/app/products/[id]/page.tsx`
- `frontend/src/app/cart/page.tsx`
- `backend/src/controllers/cartController.js`

---

## Definition of Done

1. Administrators and staff members never see a cart icon anywhere in the storefront navigation.
2. Clicking "Add to Cart" while authenticated as staff displays the explanatory modal dialog and prevents request dispatch.
3. Attempting to directly load `/cart` as staff blocks checkout actions.
