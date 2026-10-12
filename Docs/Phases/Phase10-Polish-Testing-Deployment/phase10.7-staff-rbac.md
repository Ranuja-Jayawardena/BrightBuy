# Phase 10.7: Staff Role-Based Access Control (RBAC)

> **Parent Phase:** [Phase 10: Polish, Testing & Deployment](phase10-polish-testing-deployment.md)
> **Status:** Complete
> **Assigned To:** E
> **Depends On:** 10.2, 10.5
> **Blocks:** 10.6

---

## Tasks

- [x] **Database Migration:** Create Flyway migration `V21__add_employee_role.sql` adding `role VARCHAR(30) NOT NULL DEFAULT 'super_admin'` with check constraint (`super_admin`, `inventory_manager`, `order_dispatcher`, `catalog_manager`, `analyst`) to `employees` table
- [x] **Apply Database Migration:** Run migration against both local database and AWS EC2 PostgreSQL instance (`brightbuy_dev`)
- [x] **Auth Middleware Enhancement:** Update `authMiddleware.js` to extract `employee_role` during JWT verification and implement `requireStaffRole(...allowedRoles)` helper
- [x] **Backend Route Protection:** Apply granular staff role guards across administrative routes:
  - `/api/admin/employees`: Strictly `super_admin`
  - `/api/reports/*`: `super_admin`, `analyst`
  - `/api/admin/inventory/*`: `super_admin`, `inventory_manager`
  - `/api/admin/orders/*`: `super_admin`, `order_dispatcher`
  - `/api/admin/products/*`, `/api/admin/categories/*`: `super_admin`, `catalog_manager`
- [x] **Employee Creation API:** Update `createEmployee` model and controller to accept and persist `role` in the `employees` table
- [x] **Frontend Auth Store:** Update `useAuthStore.ts` and `User` interface to retain and expose `employee_role`
- [x] **Dynamic Admin Navigation:** Update `frontend/src/app/admin/layout.tsx` to conditionally display sidebar navigation tabs based on the logged-in staff member's role
- [x] **Employee Creation UI:** Update `frontend/src/app/admin/employees/page.tsx` creation modal with a role selection dropdown
- [x] **Verification & Testing:** Verify staff sub-role restrictions, blocked tab enforcement, and API 403 responses

---

## API Contracts

### `POST /api/admin/employees`
```
Authorization: Cookie (access_token with role: 'admin' and employee_role: 'super_admin')
Request Body: {
  email: "clerk@brightbuy.com",
  password: "password123",
  first_name: "Alex",
  last_name: "Morgan",
  role: "inventory_manager", // 'super_admin' | 'inventory_manager' | 'order_dispatcher' | 'catalog_manager' | 'analyst'
  phone: "555-0199"
}

Response 201: {
  employee: {
    employee_id: 4,
    user_id: 12,
    email: "clerk@brightbuy.com",
    first_name: "Alex",
    last_name: "Morgan",
    role: "inventory_manager",
    phone: "555-0199"
  }
}
Response 403: { error: "Forbidden: Insufficient privileges", message: "Only super administrators can manage employees", statusCode: 403 }
```

---

## Definition of Done

- Database schema includes `role` on `employees` with check constraints for all 5 operational roles.
- Existing employees remain fully operational as `super_admin` with no regressions.
- `requireStaffRole` middleware enforces least privilege across all admin endpoints.
- Admin UI dynamically adapts sidebar navigation to the current staff member's role.
- New employees can be created with designated roles from the admin UI.

---

## Key Decisions & Notes

1. **Current Context & Motivation (Post-Phase 10 Security Upgrade):**
   - In the initial system design (Phases 1–9), all internal staff were granted the single top-level `admin` role in `users`, and the `employees` table contained no role classification.
   - While staff actions were audited by `employee_id` (e.g. in `inventory_adjustments`), any employee could technically access sensitive financial revenue analytics (`/admin/reports`), delete product categories, or create new admin accounts.
   - To align with enterprise production standards and the **Principle of Least Privilege**, Subphase 10.7 partitions staff into granular operational sub-roles:
     - `super_admin`: Full system access (staff management, system settings).
     - `inventory_manager`: Products & inventory stock adjustments.
     - `order_dispatcher`: Order status and delivery processing.
     - `catalog_manager`: Product and category taxonomy CRUD.
     - `analyst`: Read-only access to sales, customer, and inventory analytics reports.

2. **Single Assignee Ownership (Member E):**
   - To maintain project consistency where subphases are owned by a single team member, Subphase 10.7 is assigned to **Member E** (DevOps & Security Architecture).
   - Member E owns the `users` and `employees` database tables (Phase 1.3), the JWT authentication and role middleware (Phase 3.2), and Security Hardening (Phase 10.5).

3. **Database Schema Strategy:**
   - Rather than altering `users.role` (which would break customer vs staff portal separation at `/admin/login`), the top-level `users.role` remains `'admin'`.
   - A new column `role VARCHAR(30)` is added to the `employees` table with a check constraint limiting it to the 5 valid staff roles.
   - Existing staff records default to `super_admin` ensuring zero breaking changes to existing tests and seeded accounts.

4. **Backend Middleware Architecture:**
   - `authMiddleware.js` extracts `req.user.employee_role` from the `employees` table during JWT verification.
   - A helper `requireStaffRole(...allowedRoles)` is added. `super_admin` always bypasses sub-role restrictions.
   - Granular restrictions are applied across `/api/admin/*` and `/api/reports/*`.

5. **Frontend Progressive Disclosure:**
   - The `/admin` sidebar navigation in `admin/layout.tsx` dynamically hides tabs not permitted for the active employee's sub-role.
   - The `/admin/employees` creation modal provides a role selector dropdown for assigning roles when onboarding new staff.
