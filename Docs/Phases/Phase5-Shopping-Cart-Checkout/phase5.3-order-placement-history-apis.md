# Phase 5.3: Order Placement & History APIs

> **Parent Phase:** [Phase 5: Shopping Cart & Checkout](phase5-shopping-cart-checkout.md)
> **Status:** Not Started
> **Assigned To:** D
> **Depends On:** 5.1, 5.2
> **Blocks:** 5.5, 5.6, 6.2, 7.3, 8.2
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Turn a cart into an order safely (atomic stock deduction) and let customers view their order history.

---

## Tasks

- [ ] `POST /api/orders` — in **one transaction**: lock variant rows (`SELECT ... FOR UPDATE`), validate stock, create `orders` + `order_items` (with `unit_price` snapshot) + `deliveries` (address snapshot + ETA), decrement stock, clear the cart
- [ ] Reject the order if the cart is empty or any item is out of stock (roll back everything)
- [ ] Calculate `estimated_delivery_days` from the city's `is_main_city` (5 or 7 business days)
- [ ] `GET /api/orders` — the customer's order history
- [ ] `GET /api/orders/:id` — order detail with items, delivery info, and payment status (own orders only)

See the [business rules](phase5-shopping-cart-checkout.md#business-rules-apply-across-subphases) in the parent phase.

---

## API Contracts

### `POST /api/orders`
```
Request Body: { address_id, delivery_mode: "home_delivery" | "store_pickup" }
Response 201: {
  message: "Order placed successfully",
  order: { order_id, status, total_amount, order_date,
    items: [...], delivery: { delivery_id, estimated_delivery_days, ... } }
}
Response 400: { error: "Cart is empty" }
Response 400: { error: "Insufficient stock for: [variant names]" }
```

### `GET /api/orders`
```
Response 200: { orders: [{ order_id, order_date, status, total_amount, item_count }] }
```

### `GET /api/orders/:id`
```
Response 200: {
  order: { order_id, order_date, status, total_amount,
    items: [{ variant_id, product_name, variant_name, quantity, unit_price }],
    delivery: { delivery_mode, delivery_address_line1, city_name, delivery_status, tracking_number, estimated_delivery_days },
    payment: { payment_method, payment_status } | null }
}
Response 404: { error: "Order not found" }
```

---

## Definition of Done

- Two customers ordering the last unit at the same time can't both succeed.
- A failure at any step leaves stock and cart unchanged.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

