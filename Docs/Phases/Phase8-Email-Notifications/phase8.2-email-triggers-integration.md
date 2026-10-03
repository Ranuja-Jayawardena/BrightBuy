# Phase 8.2: Email Triggers Integration

> **Parent Phase:** [Phase 8: Email Notifications](phase8-email-notifications.md)
> **Status:** Not Started
> **Assigned To:** D
> **Depends On:** 8.1, 3.1 (E), 5.3, 6.3, 7.3 (C)
> **Blocks:** 10.4

---

## Goal

Send the right email whenever a key event happens.

---

## Tasks

- [ ] Welcome email after successful registration (`POST /api/auth/register`, owned by E — coordinate review)
- [ ] Order confirmation email after successful order placement (`POST /api/orders`)
- [ ] Payment confirmation email inside `handlePaymentSuccess` (6.3)
- [ ] Delivery status email when an admin updates delivery status (`PUT /api/admin/deliveries/:id/status`, owned by C — coordinate review)
- [ ] All triggers fire **after** the DB transaction commits and never block or fail the API response

---

## Definition of Done

- Each of the four events delivers its email to a test inbox; an SMTP failure does not break the API.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

