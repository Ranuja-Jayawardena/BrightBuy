# Phase 8.1: Email Service & Templates

> **Parent Phase:** [Phase 8: Email Notifications](phase8-email-notifications.md)
> **Status:** Complete
> **Assigned To:** D
> **Depends On:** Phase 2
> **Blocks:** 8.2

---

## Goal

Build a reusable email sender and all the HTML templates.

---

## Tasks

**Setup**
- [x] Configure Nodemailer with SMTP credentials (Gmail App Password)
- [x] Store SMTP credentials in environment variables (add them to `.env.example`, never hard-code them)
- [x] Reusable utility `sendEmail(to, subject, html)` that logs failures and never crashes the request
- [x] `notificationService` with one function per event (`sendWelcome`, `sendOrderConfirmation`, `sendPaymentConfirmation`, `sendDeliveryStatusUpdate`)

**Email Templates (HTML)**
- [x] Welcome email — greeting on successful registration
- [x] Order confirmation — order summary, items, prices, delivery address, estimated delivery
- [x] Payment confirmation — amount, method, transaction reference
- [x] Delivery status update — new status, tracking number (if any)

---

## Definition of Done

- Each template can be sent to a test inbox from a small script and renders correctly.

---

## Key Decisions & Notes

- **Mailer Utility (`backend/src/utils/mailer.js`):** Configured Nodemailer with fallback test transport if `SMTP_USER` / `SMTP_PASS` are omitted in local development/testing, logging cleanly without throwing.
- **Templates (`backend/src/templates/emailTemplates.js`):** Designed responsive modern HTML & plain text transactional templates for welcome, order confirmation, payment receipt, and delivery updates.
- **Service (`backend/src/services/notificationService.js`):** Implemented all four notification functions with pure `pg` SQL queries and robust try/catch wrapping so API requests are never blocked or broken.

