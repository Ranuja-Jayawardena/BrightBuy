# Phase 8.2: Email Triggers Integration

> **Parent Phase:** [Phase 8: Email Notifications](phase8-email-notifications.md)
> **Status:** Complete
> **Assigned To:** D
> **Depends On:** 8.1, 3.1 (E), 5.3, 6.3, 7.3 (C)
> **Blocks:** 10.4

---

## Goal

Send the right email whenever a key event happens.

---

## Tasks

- [x] Welcome email after successful registration (`POST /api/auth/register`, owned by E — coordinate review)
- [x] Order confirmation email after successful order placement (`POST /api/orders`)
- [x] Payment confirmation email inside `handlePaymentSuccess` (6.3)
- [x] Delivery status email when an admin updates delivery status (`PUT /api/admin/deliveries/:id/status`, owned by C — coordinate review)
- [x] All triggers fire **after** the DB transaction commits and never block or fail the API response

---

## Definition of Done

- Each of the four events delivers its email to a test inbox; an SMTP failure does not break the API.

---

## Key Decisions & Notes

- **Non-blocking triggers:** Every trigger fires after the database transaction has committed (`COMMIT`).
- **Failure isolation:** All triggers execute asynchronously and handle errors without throwing, guaranteeing that email failures or SMTP timeouts never degrade or fail the user-facing API response.
- **Hook coordination:**
  - `authController.js` (`register`): calls `notificationService.sendWelcome`.
  - `orderController.js` (`createOrder`): calls `notificationService.sendOrderConfirmation`.
  - `paymentService.js` (`handlePaymentSuccess`): calls `notificationService.sendPaymentConfirmation`.
  - `adminOrderService.js` (`updateDelivery`): connects to `notificationService.onDeliveryStatusChanged` / `sendDeliveryStatusUpdate`.

