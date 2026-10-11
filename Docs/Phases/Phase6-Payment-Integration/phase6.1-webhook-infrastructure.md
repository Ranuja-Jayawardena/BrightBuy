# Phase 6.1: Webhook Infrastructure

> **Parent Phase:** [Phase 6: Payment Integration](phase6-payment-integration.md)
> **Status:** Complete
> **Assigned To:** E
> **Depends On:** 3.2
> **Blocks:** 6.3

---

## Goal

Receive Lemon Squeezy webhook events securely and route them to D's payment handlers.

---

## Tasks

- [x] Configure Lemon Squeezy API key, store ID, and webhook secret as environment variables (add them to `.env.example`)
- [x] `POST /api/webhooks/lemonsqueezy` — use a raw body parser for this route only (needed for the signature check)
- [x] Verify the webhook signature (HMAC) and reject tampered requests with `401`
- [x] Parse the event type and call `handlePaymentSuccess` / `handlePaymentFailure` (see the [interface contract](phase6-payment-integration.md#shared-contract-webhook--payment-handler-interface))
- [x] Make the endpoint idempotent (ignore duplicate deliveries of the same event)
- [x] Exclude the webhook route from auth middleware
- [x] Document how to test webhooks locally (e.g. a tunnel or the Lemon Squeezy test mode)

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

- Implemented webhook routing before `express.json()` in `index.js` to ensure the raw request body is available for signature verification.
- Added in-memory set `processedWebhooks` for basic idempotency (max 1000 items). 
- Stubbed `handlePaymentSuccess` and `handlePaymentFailure` in `paymentService.js` for **D** to implement in Phase 6.3.
- **Testing Webhooks Locally:** To test webhooks locally, developers can use [ngrok](https://ngrok.com/) to create a public URL (e.g. `ngrok http 5000`) and set that URL as the webhook endpoint in the Lemon Squeezy Test Mode dashboard. Ensure `LEMON_SQUEEZY_WEBHOOK_SECRET` matches the one set in the Lemon Squeezy settings.

