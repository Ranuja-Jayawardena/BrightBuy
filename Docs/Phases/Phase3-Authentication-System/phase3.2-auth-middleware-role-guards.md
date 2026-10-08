# Phase 3.2: Auth Middleware & Role Guards

> **Parent Phase:** [Phase 3: Authentication System](phase3-authentication-system.md)
> **Status:** Complete
> **Assigned To:** E
> **Depends On:** 3.1
> **Blocks:** 5.1, 5.2, 6.1, 7.1 – 7.4, 9.1, 9.2 (all protected endpoints)

---

## Goal

Provide reusable Express middleware that every other backend member uses to protect their routes.

---

## Tasks

- [x] `requireAuth` middleware — verify the access token cookie and attach `req.user = { user_id, role, customer_id? }`
- [x] `requireRole('admin')` middleware — restrict a route to a given role, return `403` otherwise
- [x] Return a consistent `401` response for missing/expired tokens (so the frontend knows to refresh)
- [x] Short usage guide in this doc's notes (how C and D mount the middleware on their routers)

---

## Definition of Done

- C and D can protect any route with one line (e.g. `router.use(requireAuth, requireRole('admin'))`).
- `req.user` shape is documented below and stable.

---

## Key Decisions & Notes

### Usage Guide for Middleware

To protect a route so that only authenticated users can access it, use `requireAuth`.
To protect a route so that only specific roles (e.g., admin) can access it, use `requireAuth` followed by `requireRole('admin')`.

**Example:**
```javascript
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Protect a single route for any authenticated user
router.get('/my-orders', requireAuth, orderController.getMyOrders);

// Protect a route for admins only
router.post('/products', requireAuth, requireRole('admin'), productController.createProduct);

// Protect an entire router
router.use(requireAuth);
router.get('/profile', userController.getProfile);
```

When `requireAuth` succeeds, `req.user` will be populated with:
```javascript
{
  user_id: 1,
  role: 'customer',
  customer_id: 1 // only if the user is a customer
  // employee_id: 1 // only if the user is an employee/admin
}
```

