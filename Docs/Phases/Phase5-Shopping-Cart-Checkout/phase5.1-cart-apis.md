# Phase 5.1: Cart APIs

> **Parent Phase:** [Phase 5: Shopping Cart & Checkout](phase5-shopping-cart-checkout.md)
> **Status:** Not Started
> **Assigned To:** D
> **Depends On:** 3.2
> **Blocks:** 5.3, 5.4
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Let authenticated customers manage their shopping cart.

---

## Tasks

- [ ] Auto-create a cart for the customer if one doesn't exist
- [ ] `GET /api/cart` — cart with line items, variant details, and subtotals
- [ ] `POST /api/cart/items` — add a variant (enforce `(cart_id, variant_id)` uniqueness, validate stock, reject inactive variants)
- [ ] `PUT /api/cart/items/:id` — update quantity (validate against available stock)
- [ ] `DELETE /api/cart/items/:id` — remove an item
- [ ] Make sure customers can only touch their own cart items
- [ ] Protect all routes with `requireAuth` (from 3.2)

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

