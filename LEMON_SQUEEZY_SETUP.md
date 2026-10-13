# BrightBuy — Lemon Squeezy Payment Gateway Integration Guide

> **Target Audience:** DevOps Engineers, Backend Developers, and System Administrators  
> **Project:** BrightBuy Retail Inventory & Order Management System  
> **Date:** October 2026  
> **Live EC2 Public IP:** `18.208.53.186`  
> **Repository Root File:** `LEMON_SQUEEZY_SETUP.md`

---

## 1. Executive Summary & Architecture

BrightBuy supports two checkout payment methods:
1. **Cash on Delivery (COD):** Processed internally; order is immediately confirmed with status `pending`/`cod_pending`.
2. **Credit / Debit Card:** Processed via **Lemon Squeezy Hosted Checkout**.

### Payment & Webhook Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Frontend as Next.js Frontend (/checkout)
    participant Backend as Express API (/api)
    participant LS as Lemon Squeezy
    participant DB as PostgreSQL (EC2)
    participant Mailer as Nodemailer Service

    Customer->>Frontend: Selects "Card" & clicks "Pay Now"
    Frontend->>Backend: POST /api/payments/create-session (order_id)
    Backend->>LS: POST /v1/checkouts (custom_price = order total * 100, custom.order_id)
    LS-->>Backend: Returns checkout session URL
    Backend-->>Frontend: { checkout_url: "https://brightbuy.lemonsqueezy.com/checkout/buy/..." }
    Frontend->>Customer: Redirects browser to Lemon Squeezy Hosted Checkout
    Customer->>LS: Enters card details and completes payment
    LS-->>Customer: Redirects browser back to BrightBuy: /checkout/return?order_id=...
    par Asynchronous Webhook Verification
        LS->>Backend: POST /api/webhooks/lemonsqueezy (X-Signature: HMAC-SHA256)
        Note over Backend: Verifies HMAC signature using LEMON_SQUEEZY_WEBHOOK_SECRET
        Backend->>DB: UPDATE payments SET payment_status='completed'
        Backend->>DB: UPDATE orders SET status='paid'
        Backend->>Mailer: Triggers order & payment confirmation email to customer
        Backend-->>LS: HTTP 200 OK
    end
    Customer->>Frontend: Views payment success & receipt on /checkout/return
```

---

## 2. Lemon Squeezy Credentials & Identifiers

| Parameter | Current Value | Notes |
|:---|:---|:---|
| **Store ID** | `495997` | Lemon Squeezy BrightBuy Store |
| **Variant ID** | `2238318` | Variant ID of "BrightBuy Store Order" product |
| **Product Pricing Type** | *Pay what you want* | Minimum: `$0.01`. Backend sends real order total via `custom_price` in cents |
| **API Key (Bearer Token)** | `eyJ0eXAi...` *(Full key below)* | Used for `https://api.lemonsqueezy.com/v1/checkouts` |
| **Webhook Signing Secret** | `bb_secret_webhook_2026_lemon_secure` | Secret string for HMAC SHA-256 signature verification |
| **Webhook Endpoint** | `http://18.208.53.186/api/webhooks/lemonsqueezy` | Route on AWS EC2 Nginx / Express stack |

### Full API Key (Bearer Token)
```text
eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiJkMDIzZWNjYWRkZWNiMGZlNTM1ZTIzZWMyZGJhYjg2YTYyODU4ZDA0NTE5ZDJhY2Y2MjdhZDRmOWY2YjZlYTgzZWEwYTMwNTgwM2ZkZGMzOSIsImlhdCI6MTc5MTgxMTUzNy40ODIxLCJuYmYiOjE3OTE4MTE1MzcuNDgyMTAzLCJleHAiOjE4MDc0ODgwMDAuMDIyODAzLCJzdWIiOiI4MTU2NDc4Iiwic2NvcGVzIjpbXX0.xvZY1uTLQCydg176ORNLYi3BsYdBjy4p89AVoudaKDtbK64ASlcj6dCIyOueHQR4K48d8sPwArVYHMPLsgUZ_ZCmp6V3el5sgA--kR6--C0Rr7SgRC7IOK-KRRkS0WX3FDKaubFTSWlpuGWEm67lwKZQIAJ0R8JtpPWAnKcp7EKpupGGbGmCza7f6HR8dy9nAEtMtfK9LazwfHe_ryrOGSU6F0HSES5ZWUxNK0ju5atM87Xs9eDvj1UjsJtAk7T1Dg3WJ5wPQy3WpM0zIjjKxqxfcbTOSVOOVjv-jwAbruSHleMm6SMLB3BPhKiXtYQ8ur1jj1g0LFfWKe3ewDQUtv2k8KcAExdRMN85lgmRFkEHl0kL5VMIf3i1PdBGkj_eyrHEjcWj_86YgRK-gtj5Sca1JuKgMex1IhfXtSk_2HPNBBGE1e49-3t-_9lN7D2U2BBU1FQ-Vu9yRRkAdOeF_EhL2HdMISttYpfLXgR8n6gqcJOQB5TJCL7Aqp0VFgRxWG2HvSHYOU77qlNNoAbYY-4qy_but-f3MKTB22wThwJDKjy_Gtrd3Zm2B1Fj5yHTuiMk3_XimhHdB9W4zCqeR3Dsu2imZnSz_ziXBjvGYLiyAfifN-eRLWXJA7pj9_EYZ3BhRIzJv05kWSprTvdkNUPQ32TnPPLha9MKTNgbxC8
```

---

## 3. Lemon Squeezy Webhook Dashboard Configuration

To ensure orders update from `pending` to `paid` automatically:

1. Log into [app.lemonsqueezy.com](https://app.lemonsqueezy.com/).
2. In the left navigation, go to **Settings** ➔ **Webhooks**.
3. Click **"+"** or **New Webhook**.
4. Configure the fields as follows:
   - **Callback URL:**
     ```text
     http://18.208.53.186/api/webhooks/lemonsqueezy
     ```
     *(Note: When a custom domain with SSL is added in the future, change `http://18.208.53.186` to `https://yourdomain.com`).*
   - **Signing Secret:**
     ```text
     bb_secret_webhook_2026_lemon_secure
     ```
   - **Events to send:**
     - Check `order_created` (Required — signals that payment succeeded).
     - *(Optional)* Check `order_refunded` (For refunds if applicable).
5. Click **Save Webhook**.

---

## 4. AWS EC2 Server Setup Instructions

### Server Details
- **Public Elastic IP:** `18.208.53.186`
- **Instance ID:** `i-0a19078299834fba2`
- **User:** `ubuntu`
- **Stack Directory:** `/home/ubuntu/BrightBuy`
- **Production Environment File:** `/home/ubuntu/BrightBuy/.env.prod`

### Method A: Connect via SSH (Terminal)
If you have `brightbuy-key.pem`:
```bash
ssh -i brightbuy-key.pem ubuntu@18.208.53.186
```

### Method B: Connect via AWS Console (Browser)
1. Open the [AWS EC2 Console](https://console.aws.amazon.com/ec2/home?region=us-east-1#Instances:).
2. Select instance `i-0a19078299834fba2` (`18.208.53.186`).
3. Click **Connect** ➔ **EC2 Instance Connect** ➔ **Connect**.

---

### Step-by-Step Server Command

Once in the EC2 shell, run the following block:

```bash
# 1. Append the Payment Gateway environment variables to .env.prod
cat << 'EOF' >> /home/ubuntu/BrightBuy/.env.prod

# Payment Gateway (Lemon Squeezy) & Store Return Configuration
FRONTEND_URL=http://18.208.53.186
LEMON_SQUEEZY_STORE_ID=495997
LEMON_SQUEEZY_VARIANT_ID=2238318
LEMON_SQUEEZY_WEBHOOK_SECRET=bb_secret_webhook_2026_lemon_secure
LEMON_SQUEEZY_API_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiJkMDIzZWNjYWRkZWNiMGZlNTM1ZTIzZWMyZGJhYjg2YTYyODU4ZDA0NTE5ZDJhY2Y2MjdhZDRmOWY2YjZlYTgzZWEwYTMwNTgwM2ZkZGMzOSIsImlhdCI6MTc5MTgxMTUzNy40ODIxLCJuYmYiOjE3OTE4MTE1MzcuNDgyMTAzLCJleHAiOjE4MDc0ODgwMDAuMDIyODAzLCJzdWIiOiI4MTU2NDc4Iiwic2NvcGVzIjpbXX0.xvZY1uTLQCydg176ORNLYi3BsYdBjy4p89AVoudaKDtbK64ASlcj6dCIyOueHQR4K48d8sPwArVYHMPLsgUZ_ZCmp6V3el5sgA--kR6--C0Rr7SgRC7IOK-KRRkS0WX3FDKaubFTSWlpuGWEm67lwKZQIAJ0R8JtpPWAnKcp7EKpupGGbGmCza7f6HR8dy9nAEtMtfK9LazwfHe_ryrOGSU6F0HSES5ZWUxNK0ju5atM87Xs9eDvj1UjsJtAk7T1Dg3WJ5wPQy3WpM0zIjjKxqxfcbTOSVOOVjv-jwAbruSHleMm6SMLB3BPhKiXtYQ8ur1jj1g0LFfWKe3ewDQUtv2k8KcAExdRMN85lgmRFkEHl0kL5VMIf3i1PdBGkj_eyrHEjcWj_86YgRK-gtj5Sca1JuKgMex1IhfXtSk_2HPNBBGE1e49-3t-_9lN7D2U2BBU1FQ-Vu9yRRkAdOeF_EhL2HdMISttYpfLXgR8n6gqcJOQB5TJCL7Aqp0VFgRxWG2HvSHYOU77qlNNoAbYY-4qy_but-f3MKTB22wThwJDKjy_Gtrd3Zm2B1Fj5yHTuiMk3_XimhHdB9W4zCqeR3Dsu2imZnSz_ziXBjvGYLiyAfifN-eRLWXJA7pj9_EYZ3BhRIzJv05kWSprTvdkNUPQ32TnPPLha9MKTNgbxC8
EOF

# 2. Secure file permissions
chmod 600 /home/ubuntu/BrightBuy/.env.prod

# 3. Reload the backend container to pick up the updated environment variables
cd /home/ubuntu/BrightBuy
docker compose -f docker-compose.prod.yml restart backend

# 4. Verify backend status
docker compose -f docker-compose.prod.yml ps
```

---

## 5. Local Development Environment (`backend/.env`)

When running the project locally (`npm run dev`):
In `backend/.env`, ensure the following are defined:

```env
FRONTEND_URL=http://localhost:3000,http://18.208.53.186
LEMON_SQUEEZY_STORE_ID=495997
LEMON_SQUEEZY_VARIANT_ID=2238318
LEMON_SQUEEZY_WEBHOOK_SECRET=bb_secret_webhook_2026_lemon_secure
LEMON_SQUEEZY_API_KEY=eyJ0eXAi...
```

> **Note on Local Webhook Testing:** Lemon Squeezy cannot make HTTP requests directly to `localhost`. To test webhooks locally during development, use a tunnel like ngrok:
> ```bash
> ngrok http 8080
> ```
> And temporarily set the webhook URL in the Lemon Squeezy dashboard to `https://<ngrok-id>.ngrok-free.app/api/webhooks/lemonsqueezy`.

---

## 6. Codebase File Map & Flow

| File Path | Role in Payment Flow |
|:---|:---|
| `backend/src/routes/paymentRoutes.js` | Defines `POST /api/payments/create-session` (customer auth guard). |
| `backend/src/controllers/paymentController.js` | Validates order total, contacts Lemon Squeezy Checkout API (`https://api.lemonsqueezy.com/v1/checkouts`), passes `custom_price` in cents and `custom.order_id`. |
| `backend/src/routes/webhookRoutes.js` | Mounts `POST /api/webhooks/lemonsqueezy` with `express.raw({ type: 'application/json' })` parser. |
| `backend/src/controllers/webhookController.js` | Verifies `X-Signature` using crypto HMAC SHA-256 against `LEMON_SQUEEZY_WEBHOOK_SECRET`. Parses `order_created` events and deduplicates via in-memory set. |
| `backend/src/services/paymentService.js` | Atomic DB transaction: updates `payments` table (`status='completed'`, sets `transaction_id`), updates `orders` table (`status='paid'`), dispatches payment confirmation email. |
| `frontend/src/app/checkout/page.tsx` | UI where user selects "Credit/Debit Card", triggers checkout session creation, and redirects to returned URL. |
| `frontend/src/app/checkout/return/page.tsx` | Customer return landing page showing confirmation and link to view order history. |
| `nginx/default.conf` | Proxies `/api/` traffic directly to the Express backend container on port 5000. |

---

## 7. Verification Checklist & Testing

1. **Verify Checkout Session Generation:**
   - Log into BrightBuy as a customer (`http://18.208.53.186`).
   - Add items to cart and navigate to `/checkout`.
   - Select **Credit / Debit Card** and click **Place Order & Pay**.
   - **Expected Result:** Browser redirects to `https://brightbuy.lemonsqueezy.com/checkout/buy/...` displaying the exact order total.

2. **Verify Test Payment:**
   - On the Lemon Squeezy checkout page, enter test details:
     - Card Number: `4242 4242 4242 4242` (in test mode)
     - Expiry: Any future date (e.g., `12/28`)
     - CVC: `123`
   - Complete payment.
   - **Expected Result:** Lemon Squeezy redirects back to `http://18.208.53.186/checkout/return?order_id=...` with confirmation.

3. **Verify Webhook Execution on Server:**
   - On the EC2 server, inspect backend logs:
     ```bash
     docker logs --tail 50 -f $(docker ps -qf "name=backend")
     ```
   - Look for:
     ```text
     handlePaymentSuccess called for order <id>, transaction <txn_id>
     [Mailer] Payment confirmation email sent successfully...
     ```
   - Query PostgreSQL database:
     ```bash
     docker exec -it brightbuy-postgres psql -U postgres -d brightbuy_prod -c "SELECT order_id, status FROM orders ORDER BY order_id DESC LIMIT 3;"
     ```
   - Status must transition from `pending` to `paid`.

---

## 8. Live Verification Results & Fixes Applied

- **Multi-Origin Redirect URL Fix:** Updated paymentController.js to dynamically match the client origin against configured FRONTEND_URL origins, preventing comma-separated strings (localhost:3000,18.208.53.186) from causing 422 errors with the Lemon Squeezy Checkouts API.
- **Idempotent Payment Upsert:** Ensured payment attempts update existing payments rows rather than inserting duplicate records on retry.
- **Safe Webhook Order ID Parsing:** Updated webhookController.js to parse numeric order IDs cleanly, avoiding PostgreSQL integer conversion errors when processing webhooks.
- **Live EC2 Deployment Verified:**
  - Active environment variables loaded into brightbuy-backend-1.
  - Live checkout session created: returned real Lemon Squeezy URL (https://brightbuy-store.lemonsqueezy.com/checkout/custom/...).
  - Webhook endpoint verified: HMAC SHA-256 signature checked, database order updated to paid, payment marked completed, and confirmation email successfully dispatched.
