# Fix 4.3: Order Fulfillment: Courier Tracking vs. Store Pickup

> **Parent Group:** [Fix 4: Role Permissions & Operations](fix4-role-permissions-operations.md)
> **Status:** In Progress
> **Assigned To:** Member D (Backend Orders & Deliveries) & Member B (Admin Orders UI)
> **Depends On:** —
> **Blocks:** —
> **Priority:** Medium
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md) (tables: `orders`, `deliveries`)

---

## Problem Description

In the admin order details page (`/admin/orders/[id]`), all orders display a **Courier Tracking Code** input field with shipping status choices (`Pending`, `Processing`, `Shipped`, `Out for Delivery`, `Delivered`).
However, BrightBuy supports two distinct fulfillment modes:
1. **Home Delivery (`home_delivery`):** Dispatched via courier services, requiring a third-party tracking number to allow package tracing.
2. **Store Pickup / Gate Purchase (`store_pickup`):** Customer collects their goods directly at the retail store/warehouse gate. Courier tracking numbers do not exist for gate purchases, and courier delivery transitions ("Out for delivery") make no operational sense.

---

## Technical Solution & Fulfillment Workflows

### 1. Delivery Mode Differentiation
- When `delivery_mode === 'store_pickup'`:
  - Hide the "Courier Tracking Code" input or render a disabled badge: *"N/A — Store Pickup / Gate Collection"*.
  - Use pickup-appropriate status options:
    - `pending` -> `processing` -> `ready_for_pickup` -> `collected` (or `cancelled`).
  - In customer order history: display pickup instructions and Order ID verification badge.
- When `delivery_mode === 'home_delivery'`:
  - Keep the Courier Tracking Code field editable.
  - Require a tracking number when transitioning status to `shipped`.
  - Use courier status options:
    - `pending` -> `processing` -> `shipped` -> `out_for_delivery` -> `delivered` (or `cancelled`).

---

## Tasks

### Backend — Member D
- [x] In `backend/src/services/adminOrderService.js`:
  - When updating delivery status for `store_pickup`, support `ready_for_pickup` and `collected` status transitions.
  - Optional validation: Do not require or enforce tracking number format on `store_pickup`.
- [x] In `backend/src/controllers/adminOrderController.js`:
  - Return `delivery_mode` clearly in order summary and details.

### Frontend — Member B
- [ ] In `frontend/src/app/admin/orders/[id]/page.tsx`:
  - Check `order.delivery.delivery_mode`:
    - If `store_pickup`: Adjust title to "Store Pickup & Gate Fulfillment". Hide the courier tracking code input. Show pickup status options.
    - If `home_delivery`: Show "Courier & Shipping Management" with tracking number input and courier status options.
- [ ] In `frontend/src/app/admin/orders/page.tsx`:
  - Add a "Fulfillment Mode" badge in the orders list table (`Home Delivery` vs. `Store Pickup`).

---

## Affected Files

- `backend/src/services/adminOrderService.js`
- `backend/src/controllers/adminOrderController.js`
- `frontend/src/app/admin/orders/page.tsx`
- `frontend/src/app/admin/orders/[id]/page.tsx`
- `frontend/src/app/orders/[id]/page.tsx`

---

## Definition of Done

1. Store pickup orders clearly display as gate pickups without prompting for courier tracking numbers.
2. Dispatchers can mark pickup orders as `ready_for_pickup` and `collected`.
3. Courier home delivery orders continue to track third-party courier codes seamlessly.
