# Phase 5: Shopping Cart & Checkout

> **Status:** In Progress (3 / 6 subphases complete)
> **Members:** D (backend APIs), B (frontend cart/checkout UI)
> **Phase Dependencies:** Phase 3 (auth middleware) and Phase 4 (products/detail page)
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Overview

Let customers build orders and complete purchases. D builds the backend APIs for cart management, addresses, and order placement with atomic stock deduction. B builds the frontend: cart page, address management, checkout flow, and order history. All cart/checkout operations require authentication.

---

## What's Done

- [x] 5.1 Cart APIs (D)
- [x] 5.2 Address & City APIs (D)
- [x] 5.3 Order Placement & History APIs (D)

---

## Subphases

| # | Subphase | Assigned | Depends On | Status |
|---|----------|----------|------------|--------|
| 5.1 | [Cart APIs](phase5.1-cart-apis.md) | D | 3.2 | Complete |
| 5.2 | [Address & City APIs](phase5.2-address-city-apis.md) | D | 3.2 | Complete |
| 5.3 | [Order Placement & History APIs](phase5.3-order-placement-history-apis.md) | D | 5.1, 5.2 | Complete |
| 5.4 | [Cart UI & Add-to-Cart Wiring](phase5.4-cart-ui-add-to-cart-wiring.md) | B | 5.1, 4.4 | Complete |
| 5.5 | [Address Management & Checkout UI](phase5.5-address-management-checkout-ui.md) | B | 5.2, 5.3, 5.4 | Complete |
| 5.6 | [Order History & Detail UI](phase5.6-order-history-detail-ui.md) | B | 5.3 | Complete |

---

## Dependency Flow

```mermaid
graph LR
    S51["5.1 Cart APIs (D)"] --> S53["5.3 Order APIs (D)"]
    S52["5.2 Address APIs (D)"] --> S53
    S51 --> S54["5.4 Cart UI (B)"]
    S44["4.4 Detail Page (A)"] --> S54
    S52 --> S55["5.5 Checkout UI (B)"]
    S53 --> S55
    S54 --> S55
    S53 --> S56["5.6 Order History UI (B)"]
```

B can start UI work against the contracts in each D subphase with mock data while D builds the endpoints.

---

## Business Rules (apply across subphases)

- **Delivery ETA:** 5 business days for Metro Texas cities (`is_main_city = true`), 7 business days for Regional Texas cities (`is_main_city = false`).
- **Delivery modes:** Home Delivery or Store Pickup.
- **Stock validation:** Check stock when the order is placed, not just when an item is added to the cart.
- **Atomic operations:** Stock deduction and order creation happen in a single PostgreSQL transaction. If any variant is short on stock, the whole transaction rolls back.
- **Address snapshot:** Copy the delivery address fields into the `deliveries` table at checkout. Do not reference `addresses` by FK.

---

## Key Decisions & Notes

- **Added `GET /api/cities`** (5.2): the address form needs a city list to choose `city_id`. This endpoint was missing from the original plan.

---

## Related Fixes & Patches

This cart and checkout flow is extended and refined by the following post-development fix items in [Docs/Fixes/overallplan.md](../../Fixes/overallplan.md):
- **[Fix 1.4: Address Form Cancel Action & UI Feedback](../../Fixes/Fix1-Customer-Account-Storefront/fix1.4-address-form-cancel-feedback.md):** Fixes address creation/edit modal cancel button in checkout flow to cleanly restore previous state without unwanted side effects.
- **[Fix 3.4: Product Image Upload, Serving & Frontend Preview](../../Fixes/Fix3-Admin-Catalog-Media/fix3.4-product-image-upload-serving.md):** Ensures cart item thumbnails correctly resolve through `/api/images/:id`.
- **[Fix 4.1: Staff Cart & Purchase Policy Enforcement](../../Fixes/Fix4-Role-Permissions-Operations/fix4.1-staff-cart-purchase-restriction.md):** Enforces business rule prohibiting admin and employee accounts from placing orders; displays clear modal explaining policy and suppresses cart icon in navigation for staff.
- **[Fix 4.3: Order Delivery Mode & Courier Tracking Code Fulfillment](../../Fixes/Fix4-Role-Permissions-Operations/fix4.3-order-delivery-mode-fulfillment.md):** Standardizes delivery modes (`pickup` vs `home_delivery`) during order creation and defines fulfillment rules.

## Fix 7 follow-up

Database integrity and concurrency work is tracked separately in [Fix 7](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 7.3: Cart Uniqueness & Checkout Concurrency](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7.3-cart-checkout-concurrency.md)
- [Fix 7.9: Checkout & Admin Conflict Handling](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7.9-checkout-admin-ui.md)

Read the Fix 7 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
