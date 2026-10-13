# Phase 6: Payment Integration

> **Status:** Complete
> **Members:** D (Lemon Squeezy integration), E (webhook infrastructure), B (payment UI)
> **Phase Dependencies:** Phase 5 must be complete (orders exist to pay for)
> **DB Schema Reference:** [DB_Schema.md](../../Database/DB_Schema.md)

---

## Overview

Connect to Lemon Squeezy to process payments. D creates payment sessions, handles success/failure, updates payment records, and supports Cash on Delivery. E builds the webhook infrastructure: endpoint, signature verification, and routing events. B adds payment method selection and the payment redirect/return pages to checkout.

---

## What's Done

- **6.1 Webhook Infrastructure:** Webhook route implemented with HMAC signature verification and passed to D's handlers.
- **6.2 Payment Sessions & Cash on Delivery:** `createSession` endpoint added for Lemon Squeezy card checkout and COD.
- **6.3 Payment Event Handlers & Order Status:** Webhook handlers implemented to update `payments` and `orders` based on transaction status.

---

## Subphases

| # | Subphase | Assigned | Depends On | Status |
|---|----------|----------|------------|--------|
| 6.1 | [Webhook Infrastructure](phase6.1-webhook-infrastructure.md) | E | 3.2 | Complete |
| 6.2 | [Payment Sessions & Cash on Delivery](phase6.2-payment-sessions-cash-on-delivery.md) | D | 5.3 | Complete |
| 6.3 | [Payment Event Handlers & Order Status](phase6.3-payment-event-handlers-order-status.md) | D | 6.1, 6.2 | Complete |
| 6.4 | [Payment UI](phase6.4-payment-ui.md) | B | 6.2, 5.5 | Complete |

---

## Dependency Flow

```mermaid
graph LR
    S61["6.1 Webhooks (E)"] --> S63["6.3 Event Handlers (D)"]
    S62["6.2 Sessions & COD (D)"] --> S63
    S62 --> S64["6.4 Payment UI (B)"]
    S55["5.5 Checkout UI (B)"] --> S64
```

---

## Shared Contract: Webhook → Payment Handler Interface

To keep E's and D's work separate, the webhook router (6.1) calls these functions, which D exports from `backend/src/services/paymentService.js` (6.3):

```js
handlePaymentSuccess({ order_id, transaction_id, amount, raw_event })
handlePaymentFailure({ order_id, transaction_id, reason, raw_event })
```

E can stub these functions until 6.3 is done.

---

## Key Decisions & Notes

- **Added 6.4 Payment UI (B):** The original plan had no frontend work for payments (choosing a method, redirecting to Lemon Squeezy, success/failure return pages). It's assigned to B, who owns the checkout UI.

---

## Related Fixes & Patches

Payment flows are guarded and clarified by the following post-development fix items in [Docs/Fixes/overallplan.md](../../Fixes/overallplan.md):
- **[Fix 4.1: Staff Cart & Purchase Policy Enforcement](../../Fixes/Fix4-Role-Permissions-Operations/fix4.1-staff-cart-purchase-restriction.md):** Rejects payment session initialization attempts initiated by administrator or employee accounts.
- **[Fix 4.3: Order Delivery Mode & Courier Tracking Code Fulfillment](../../Fixes/Fix4-Role-Permissions-Operations/fix4.3-order-delivery-mode-fulfillment.md):** Aligns cash on delivery (COD) vs prepaid payment flows with chosen delivery method (Store Pickup vs Courier Delivery).

## Fix 7 follow-up

Database integrity and concurrency work is tracked separately in [Fix 7](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7-database-integrity-concurrency.md). The existing completion status above describes the original scope; it does not certify these follow-up protections.

- [Fix 7.4: Order Transitions & Payment Event Consistency](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7.4-order-payment-consistency.md)
- [Fix 7.9: Checkout & Admin Conflict Handling](../../Fixes/Fix7-Database-Integrity-Concurrency/fix7.9-checkout-admin-ui.md)

Read the Fix 7 contracts and prerequisites before implementation. Preserve the existing API and UI behavior unless an explicit contract decision documents a change; update both trackers only after verification.
