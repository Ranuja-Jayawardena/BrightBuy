# Fix 4.2: Super Admin Employee Management & Deactivation

> **Parent Group:** [Fix 4: Role Permissions & Operations](fix4-role-permissions-operations.md)
> **Status:** Complete
> **Assigned To:** Member E (DevOps/Architecture & Auth Backend) & Member B (Admin Employees UI)
> **Depends On:** —
> **Blocks:** —
> **Priority:** Critical
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (tables: `users`, `employees`)

---

## Problem Description

1. A **Super Admin** must have full authority to:
   - Deactivate and activate employee accounts.
   - Change an employee's operational staff role (`inventory_manager`, `order_dispatcher`, `catalog_manager`, `analyst`, `super_admin`).
   - Edit employee contact details (name, phone).
2. Other employees (e.g., inventory managers or order dispatchers) must **never** see or access employee management options.
3. How to implement: **Both DB level and Backend level are required:**
   - DB level provides schema structure (`is_active` flag, constraints).
   - Backend level strictly verifies `super_admin` role in RBAC middleware, blocks deactivated accounts during login/session verification, and prevents super admin self-lockout.

---

## Technical Architecture & Implementation Layers

### Layer 1: Database Level
1. **Migration `V24__add_employee_active_status.sql`:**
   ```sql
   ALTER TABLE employees
   ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

   CREATE INDEX idx_employees_active ON employees(is_active);
   ```
2. **Role Constraint (from `V21`):** Role is validated against `('super_admin', 'inventory_manager', 'order_dispatcher', 'catalog_manager', 'analyst')`.

### Layer 2: Backend Security & RBAC
1. **Auth Enforcement during Login (`authController.js`):**
   - When an employee attempts to log in, query `employees.is_active`.
   - If `is_active === false`, reject immediately with `403 Forbidden` (`"Employee account has been deactivated. Contact Super Admin."`).
2. **Access Control (`adminRoutes.js`):**
   - Endpoints must be strictly wrapped with `requireAuth, requireRole('admin'), requireStaffRole('super_admin')`.
   - Non-super admins attempting to call these endpoints receive `403 Forbidden`.
3. **Guardrails:**
   - A super admin **cannot deactivate or demote their own account** (`req.user.employee_id !== targetId`).
   - Prevent deactivating the last active super admin in the system.
4. **Endpoints:**
   - `PUT /api/admin/employees/:id`: Update `role`, `first_name`, `last_name`, `phone`.
   - `PATCH /api/admin/employees/:id/status`: Update `is_active: boolean`.

### Layer 3: Frontend Presentation
1. In `frontend/src/app/admin/layout.tsx`:
   - The `/admin/employees` route is already restricted in `rolePermissions` to `super_admin`.
2. In `frontend/src/app/admin/employees/page.tsx`:
   - Add an **Active/Inactive switch** in the employee table.
   - Add an **Edit Employee modal** with:
     - Role dropdown selector (`Super Admin`, `Inventory Manager`, `Order Dispatcher`, `Catalog Manager`, `Business Analyst`).
     - First Name, Last Name, Phone inputs.
   - Disable self-deactivation button for the currently logged-in Super Admin.

---

## Tasks

### Backend & DB — Member E
- [x] Create Flyway migration `backend/db/migrations/V24__add_employee_active_status.sql`.
- [x] Update `backend/src/controllers/authController.js` login handler to check `employee.is_active` and block deactivated staff.
- [x] Implement `updateEmployee(id, body)` in `backend/src/models/adminInventoryModel.js` (or `adminEmployeeModel.js`).
- [x] Implement `setEmployeeStatus(id, isActive)` with self-deactivation protection.
- [x] Expose `PUT /api/admin/employees/:id` and `PATCH /api/admin/employees/:id/status` in `backend/src/routes/adminRoutes.js` guarded by `requireStaffRole('super_admin')`.
- [x] Update `Docs/Database/DB_Schema.md`.

### Frontend — Member B
- [x] In `frontend/src/app/admin/employees/page.tsx`:
  - [x] Add Active/Inactive toggle switch per employee row.
  - [x] Add "Edit Employee" action opening an edit modal.
  - [x] Implement form submission to `PUT /api/admin/employees/:id`.
  - [x] Disable editing/toggling of the current logged-in user's own status.

---

## API Contracts

### `PUT /api/admin/employees/:id`
```http
PUT /api/admin/employees/3
Content-Type: application/json
Cookie: access_token=...

{
  "first_name": "Marcus",
  "last_name": "Vance",
  "phone": "+1-555-0812",
  "role": "catalog_manager"
}
```
**Response 200:**
```json
{
  "employee": {
    "employee_id": 3,
    "user_id": 8,
    "first_name": "Marcus",
    "last_name": "Vance",
    "phone": "+1-555-0812",
    "role": "catalog_manager",
    "is_active": true
  }
}
```

### `PATCH /api/admin/employees/:id/status`
```http
PATCH /api/admin/employees/3/status
Content-Type: application/json
Cookie: access_token=...

{
  "is_active": false
}
```
**Response 200:**
```json
{
  "message": "Employee deactivated successfully",
  "employee_id": 3,
  "is_active": false
}
```

---

## Affected Files

- `backend/db/migrations/V24__add_employee_active_status.sql`
- `backend/src/controllers/authController.js`
- `backend/src/controllers/adminInventoryController.js`
- `backend/src/models/adminInventoryModel.js`
- `backend/src/routes/adminRoutes.js`
- `frontend/src/app/admin/employees/page.tsx`
- `Docs/Database/DB_Schema.md`

---

## Definition of Done

1. Super Admin can edit employee names, phone, and role.
2. Super Admin can deactivate an employee with a switch toggle.
3. Deactivated employees cannot log into the system; login returns 403 Forbidden.
4. Non-super admin staff cannot access the employee page or execute employee update APIs.
5. Super admin cannot deactivate their own account.

## Fix 7 follow-up

Database integrity and concurrency work is tracked separately in [Fix 7](../Fix7-Database-Integrity-Concurrency/fix7-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 7.6: Concurrent Super Admin Protection](../Fix7-Database-Integrity-Concurrency/fix7.6-super-admin-protection.md)
- [Fix 7.9: Checkout & Admin Conflict Handling](../Fix7-Database-Integrity-Concurrency/fix7.9-checkout-admin-ui.md)

Read the Fix 7 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
