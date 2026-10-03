# Phase 5.2: Address & City APIs

> **Parent Phase:** [Phase 5: Shopping Cart & Checkout](phase5-shopping-cart-checkout.md)
> **Status:** Not Started
> **Assigned To:** D
> **Depends On:** 3.2
> **Blocks:** 5.3, 5.5
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Goal

Let customers manage saved delivery addresses, and expose the list of deliverable cities.

---

## Tasks

- [ ] `GET /api/cities` — public list of cities (with `is_main_city` for ETA display)
- [ ] `GET /api/addresses` — list the customer's saved addresses
- [ ] `POST /api/addresses` — add a new address
- [ ] `PUT /api/addresses/:id` — update an address
- [ ] `DELETE /api/addresses/:id` — remove an address
- [ ] `PUT /api/addresses/:id/default` — set as default (unset the previous default in the same transaction)
- [ ] Make sure customers can only touch their own addresses

---

## API Contracts

### `GET /api/cities`
```
Response 200: { cities: [{ city_id, city_name, state, is_main_city }] }
```

### `GET /api/addresses`
```
Response 200: {
  addresses: [
    { address_id, address_line1, address_line2, city_id, city_name, state, zip_code, is_default }
  ]
}
```

### `POST /api/addresses`
```
Request Body: { address_line1, address_line2?, city_id, zip_code }
Response 201: { message: "Address added", address: { address_id, ... } }
```

### `PUT /api/addresses/:id`
```
Request Body: { address_line1?, address_line2?, city_id?, zip_code? }
Response 200: { message: "Address updated", address: { address_id, ... } }
```

### `DELETE /api/addresses/:id`
```
Response 200: { message: "Address removed" }
```

### `PUT /api/addresses/:id/default`
```
Response 200: { message: "Default address updated" }
```

---

## Definition of Done

- All endpoints match the contracts; each customer always has at most one default address.

---

## Key Decisions & Notes

- `GET /api/cities` added here because the address form needs a city picker.

