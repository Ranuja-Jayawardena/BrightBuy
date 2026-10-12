# Fix 1.1: Customer Profile Management & Navigation

> **Parent Group:** [Fix 1: Customer Account & Storefront UX](fix1-customer-account-storefront.md)
> **Status:** Not Started
> **Assigned To:** Member E (Backend Auth & Profile API) & Member A (Storefront Profile UI & Navbar)
> **Depends On:** —
> **Blocks:** —
> **Priority:** High
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (tables: `users`, `customers`)

---

## Problem Description

1. **No Profile Editing:** Currently, customers cannot view or update their profile information (name, phone number) after registration.
2. **Missing Navigation Access:** In the customer storefront navbar, logged-in customers see "Welcome, {name}" and a "Logout" button, but have no link or dropdown menu to navigate to their profile page, addresses, or orders.

---

## Root Cause

- The backend only provides `GET /api/auth/me` to read the current session user. There is no `PUT /api/auth/profile` endpoint in `authController.js` to update customer data.
- The frontend route `/profile` does not exist in `frontend/src/app`.
- In `frontend/src/components/Navbar.tsx`, customer account navigation links are omitted in favor of a static text greeting.

---

## Tasks

### Backend — Member E
- [ ] Implement `PUT /api/auth/profile` in `backend/src/controllers/authController.js`:
  - Validate request body: `first_name` (string, 1-50 chars), `last_name` (string, 1-50 chars), `phone` (optional string, max 20 chars).
  - Update `customers` table for `req.user.user_id` where `role = 'customer'`.
  - Return updated user object `{ user: { user_id, email, role, first_name, last_name, phone } }`.
- [ ] Implement `PUT /api/auth/password` in `backend/src/controllers/authController.js`:
  - Accept `{ current_password, new_password }`.
  - Verify `current_password` with bcrypt against `users.password_hash`.
  - Validate `new_password` meets minimum security rules (e.g., minimum 8 characters).
  - Hash and update password in `users` table.
- [ ] Wire routes into `backend/src/routes/authRoutes.js` protected with `requireAuth`.

### Frontend — Member A
- [ ] Create `/profile` page in `frontend/src/app/profile/page.tsx`:
  - Protected with `ProtectedRoute`.
  - Display personal information form (`first_name`, `last_name`, `email` [read-only], `phone`).
  - Provide a separate "Change Password" section/tab with current password, new password, and confirmation fields.
  - Show clear success and error alerts.
- [ ] Update `frontend/src/components/Navbar.tsx`:
  - For logged-in customers, replace the plain text greeting with an interactive user menu or explicit links:
    - Profile (`/profile`)
    - My Orders (`/orders`)
    - My Addresses (`/addresses`)
    - Logout

---

## API Contracts

### `PUT /api/auth/profile`
```http
PUT /api/auth/profile
Content-Type: application/json
Cookie: access_token=...

{
  "first_name": "Jane",
  "last_name": "Doe",
  "phone": "+1-555-0199"
}
```
**Response 200:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "user_id": 14,
    "email": "jane@example.com",
    "role": "customer",
    "first_name": "Jane",
    "last_name": "Doe",
    "phone": "+1-555-0199"
  }
}
```

### `PUT /api/auth/password`
```http
PUT /api/auth/password
Content-Type: application/json
Cookie: access_token=...

{
  "current_password": "OldPassword123!",
  "new_password": "NewSecurePassword456!"
}
```
**Response 200:**
```json
{
  "message": "Password updated successfully"
}
```

---

## Affected Files

- `backend/src/controllers/authController.js`
- `backend/src/routes/authRoutes.js`
- `frontend/src/components/Navbar.tsx`
- `frontend/src/app/profile/page.tsx`
- `frontend/src/store/useAuthStore.ts`

---

## Definition of Done

1. Authenticated customer can navigate to `/profile` via the navbar.
2. Updating first name, last name, or phone modifies the database and reflects immediately in the UI and navbar.
3. Password update succeeds with correct current password and rejects invalid credentials.
4. Unauthorized users are redirected to `/login`.
