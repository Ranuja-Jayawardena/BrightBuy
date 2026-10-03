# Phase 7.3: Order & Delivery Admin APIs

> **Parent Phase:** [Phase 7: Inventory & Admin Dashboard](phase7-inventory-admin-dashboard.md)
> **Status:** Not Started
> **Assigned To:** C
> **Depends On:** 3.2, 5.3
> **Blocks:** 7.6, 8.2
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Let admins view all orders and move orders and deliveries through their statuses.

---

## Tasks

- [ ] `GET /api/admin/orders` — all orders, filterable by status, date range, and customer; paginated
- [ ] `GET /api/admin/orders/:id` — admin order detail with customer info, items, payment, and delivery
- [ ] `PUT /api/admin/orders/:id/status` — enforce valid transitions (`pending → paid → shipped → delivered`, or `→ cancelled`)
- [ ] When an order is cancelled, restore stock for its items (same transaction)
- [ ] `PUT /api/admin/deliveries/:id/status` — update delivery status with an optional tracking number
- [ ] Leave a clear hook point (e.g. `notificationService.onDeliveryStatusChanged(...)`) where D adds the email trigger in 8.2
- [ ] Protect all routes with `requireAuth` + `requireRole('admin')`

---

## API Contracts

### `PUT /api/admin/orders/:id/status`
```
Request Body: { status: "paid" | "shipped" | "delivered" | "cancelled" }
Response 200: { message: "Order status updated", order: { order_id, status, updated_at } }
Response 400: { error: "Invalid status transition" }
```

### `PUT /api/admin/deliveries/:id/status`
```
Request Body: { delivery_status, tracking_number? }
Response 200: { message: "Delivery status updated", delivery: { delivery_id, delivery_status, tracking_number } }
```

---

## Definition of Done

- Invalid status transitions are rejected; cancelling restores stock.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

