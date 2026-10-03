# Phase 6.1: Webhook Infrastructure

> **Parent Phase:** [Phase 6: Payment Integration](phase6-payment-integration.md)
> **Status:** Not Started
> **Assigned To:** E
> **Depends On:** 3.2
> **Blocks:** 6.3

---

## Goal

Receive Lemon Squeezy webhook events securely and route them to D's payment handlers.

---

## Tasks

- [ ] Configure Lemon Squeezy API key, store ID, and webhook secret as environment variables (add them to `.env.example`)
- [ ] `POST /api/webhooks/lemonsqueezy` — use a raw body parser for this route only (needed for the signature check)
- [ ] Verify the webhook signature (HMAC) and reject tampered requests with `401`
- [ ] Parse the event type and call `handlePaymentSuccess` / `handlePaymentFailure` (see the [interface contract](phase6-payment-integration.md#shared-contract-webhook--payment-handler-interface))
- [ ] Make the endpoint idempotent (ignore duplicate deliveries of the same event)
- [ ] Exclude the webhook route from auth middleware
- [ ] Document how to test webhooks locally (e.g. a tunnel or the Lemon Squeezy test mode)

---

## API Contracts

### `POST /api/webhooks/lemonsqueezy`
```
(Received from Lemon Squeezy — not called by the frontend)
Payload: { event_type, data: { order_id, transaction_id, status, ... } }
Response 200: { received: true }
Response 401: { error: "Invalid signature" }
```

---

## Definition of Done

- Signed test events reach the stubbed handlers; unsigned or tampered events are rejected.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

