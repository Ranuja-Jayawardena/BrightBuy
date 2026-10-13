# Phase 5.1: Cart APIs

> **Parent Phase:** [Phase 5: Shopping Cart & Checkout](phase5-shopping-cart-checkout.md)
> **Status:** Complete
> **Assigned To:** D
> **Depends On:** 3.2
> **Blocks:** 5.3, 5.4
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Let authenticated customers manage their shopping cart.

---

## Tasks

- [x] Auto-create a cart for the customer if one doesn't exist
- [x] `GET /api/cart` — cart with line items, variant details, and subtotals
- [x] `POST /api/cart/items` — add a variant (enforce `(cart_id, variant_id)` uniqueness, validate stock, reject inactive variants)
- [x] `PUT /api/cart/items/:id` — update quantity (validate against available stock)
- [x] `DELETE /api/cart/items/:id` — remove an item
- [x] Make sure customers can only touch their own cart items
- [x] Protect all routes with `requireAuth` (from 3.2)

---

## API Contracts

### `GET /api/cart`
```
Response 200: {
  cart: {
    cart_id,
    items: [
      { cart_item_id, variant_id, variant_sku, variant_name, product_name,
        primary_image_id, price, quantity, subtotal, stock_quantity }
    ],
    total: 149.98
  }
}
```

### `POST /api/cart/items`
```
Request Body: { variant_id, quantity }
Response 201: { message: "Item added to cart", cart_item: { cart_item_id, variant_id, quantity } }
Response 400: { error: "Insufficient stock" }
Response 409: { error: "Item already in cart — use PUT to update quantity" }
```

### `PUT /api/cart/items/:id`
```
Request Body: { quantity }
Response 200: { message: "Quantity updated", cart_item: { cart_item_id, quantity } }
Response 400: { error: "Insufficient stock" }
```

### `DELETE /api/cart/items/:id`
```
Response 200: { message: "Item removed from cart" }
```

---

## Definition of Done

- All four endpoints match the contracts; customers can't access other customers' carts.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

## Fix 7 follow-up

Database integrity and concurrency work is tracked separately in [Fix 7](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 7.3: Cart Uniqueness & Checkout Concurrency](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7.3-cart-checkout-concurrency.md)

Read the Fix 7 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
