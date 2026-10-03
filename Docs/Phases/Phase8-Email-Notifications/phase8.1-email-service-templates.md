# Phase 8.1: Email Service & Templates

> **Parent Phase:** [Phase 8: Email Notifications](phase8-email-notifications.md)
> **Status:** Not Started
> **Assigned To:** D
> **Depends On:** Phase 2
> **Blocks:** 8.2

---

## Goal

Build a reusable email sender and all the HTML templates.

---

## Tasks

**Setup**
- [ ] Configure Nodemailer with SMTP credentials (Gmail App Password)
- [ ] Store SMTP credentials in environment variables (add them to `.env.example`, never hard-code them)
- [ ] Reusable utility `sendEmail(to, subject, html)` that logs failures and never crashes the request
- [ ] `notificationService` with one function per event (`sendWelcome`, `sendOrderConfirmation`, `sendPaymentConfirmation`, `sendDeliveryStatusUpdate`)

**Email Templates (HTML)**
- [ ] Welcome email — greeting on successful registration
- [ ] Order confirmation — order summary, items, prices, delivery address, estimated delivery
- [ ] Payment confirmation — amount, method, transaction reference
- [ ] Delivery status update — new status, tracking number (if any)

---

## Definition of Done

- Each template can be sent to a test inbox from a small script and renders correctly.

---

## Key Decisions & Notes

_Record any implementation decisions, trade-offs, or deviations from the plan here._

