# Phase 7.6: Operations Admin UI (Orders, Inventory, Employees)

> **Parent Phase:** [Phase 7: Inventory & Admin Dashboard](phase7-inventory-admin-dashboard.md)
> **Status:** Complete
> **Assigned To:** B
> **Depends On:** 7.3, 7.4, 7.5
> **Blocks:** 10.2

---

## Goal

Build the day-to-day operations screens for admins.

---

## Tasks

- [x] Order management page — table with status filter, date range, customer search, and pagination
- [x] Order detail view — items, customer, delivery details, payment status
- [x] Order status and delivery status update controls (only valid next statuses shown; tracking number input)
- [x] Inventory dashboard — stock table with low-stock highlighting and a manual adjust modal (with reason)
- [x] Employee management page — employee list and a create-employee form

---

## Definition of Done

- Admins can process an order from `paid` to `delivered` and manage stock and employees from the UI.

---

## Key Decisions & Notes

- **Orders UI**: Built `frontend/src/app/admin/orders/page.tsx` with comprehensive filters (status, date range, customer query, pagination), quick status badges, and an interactive full order detail modal. Created `frontend/src/app/admin/orders/[id]/page.tsx` for deep linking and direct page viewing.
- **Workflow Protection**: Order status transitions strictly enforce backend state machine rules (`pending -> paid/cancelled`, `paid -> shipped/cancelled`, `shipped -> delivered/cancelled`) by dynamically computing only valid forward options. Terminal statuses (`delivered`, `cancelled`) display completion notices without further state editing.
- **Delivery & Fulfillment Updates**: Admins can update delivery state (`pending`, `processing`, `shipped`, `out_for_delivery`, `delivered`, `cancelled`) and edit/dispatch tracking codes via `PUT /api/admin/deliveries/:id/status`.
- **Inventory Management**: Built `frontend/src/app/admin/inventory/page.tsx` with KPI summary cards (monitored items, low stock warnings, out of stock, healthy), customizable warning threshold filter, and quick reason presets in the audited stock adjustment modal (`PUT /api/admin/inventory/:variantId`).
- **Staff Accounts**: Built `frontend/src/app/admin/employees/page.tsx` with employee roster list and a secure creation modal submitting to `POST /api/admin/employees` with front-end validation (min 8 char password, unique email error handling).
- **Dashboard Hub**: Upgraded `frontend/src/app/admin/page.tsx` to act as an operations hub displaying summary counts and direct links to all operational modules.

---

## Related Fixes & Patches

- **[Fix 4.2: Employee Lifecycle & Role Management](../../Fixes/Fix4-Role-Permissions-Operations/fix4.2-employee-lifecycle-role-management.md):** Adds active/inactive switch for employee accounts and restricts employee role modifications to Super Admin.
- **[Fix 4.3: Order Delivery Mode & Courier Tracking Code Fulfillment](../../Fixes/Fix4-Role-Permissions-Operations/fix4.3-order-delivery-mode-fulfillment.md):** Updates admin order management and delivery update modal to differentiate Store Pickup (no tracking code required) from Courier Home Delivery (courier name and tracking code required).


