# Fix 8.9: Checkout & Admin Conflict Handling

> **Parent:** [Fix 8](fix8-database-integrity-concurrency.md)
> **Status:** Not Started
> **Assigned To:** B
> **Priority:** High
> **Depends On:** 8.1 D3/D8 for mocks; actual 8.3–8.8 API handoffs for integration
> **Blocks:** 8.10 combined regression, 8.12

## Read and preserve

[Phase 5.4 cart](../../Phases/Phase5-Shopping-Cart-Checkout/phase5.4-cart-ui-add-to-cart-wiring.md), [5.5 checkout](../../Phases/Phase5-Shopping-Cart-Checkout/phase5.5-address-management-checkout-ui.md), [5.6 history](../../Phases/Phase5-Shopping-Cart-Checkout/phase5.6-order-history-detail-ui.md), [6.4 payments](../../Phases/Phase6-Payment-Integration/phase6.4-payment-ui.md), [7.6 admin operations](../../Phases/Phase7-Inventory-Admin-Dashboard/phase7.6-operations-admin-ui.md), [Fix 4.1](../Fix4-Role-Permissions-Operations/fix4.1-staff-cart-purchase-restriction.md), [4.2](../Fix4-Role-Permissions-Operations/fix4.2-employee-lifecycle-role-management.md), [4.3](../Fix4-Role-Permissions-Operations/fix4.3-order-delivery-mode-fulfillment.md), and [frontend rules](../../../frontend/AGENTS.md).

Files: frontend/src/app/cart/page.tsx; checkout/page.tsx, checkout/return/page.tsx, checkout/cancel/page.tsx, checkout/success/[id]/page.tsx; admin/orders, admin/employees, admin/categories, admin/inventory and admin/products/[id]/page.tsx; store/useCartStore.ts; services/api.ts. Verify actual fetch call sites before edits.

## Tasks

- [ ] Obtain the completed contract template from each backend owner. Never guess HTTP codes, new JSON fields, idempotency headers, or refund states.
- [ ] Generate and preserve checkout identity as D3 specifies, including retries after a lost response and authentication refresh. Inspect apiFetch's automatic 401 replay: it must reuse the same request identity and body.
- [ ] Prevent accidental repeated submissions visually, while relying on the DB/backend for concurrency guarantees.
- [ ] Retain input and show actionable conflicts for cart changes, out-of-stock, invalid order transitions, last-admin rejection, category cycles, and audit validation.
- [ ] Refetch authoritative state after a conflict; do not leave optimistic UI state showing a change that rolled back.
- [ ] Payment return/cancel pages must read server state rather than marking an order paid from a URL parameter. Preserve COD and home/pickup behavior.
- [ ] If D5 requires an inventory reason, collect it only in the approved manual-edit flows and keep actor identity server-owned.
- [ ] Keep role restrictions and error text understandable; do not expose constraint names/SQL to users.
- [ ] Coordinate cart-store ownership with A and the actual Fix 6.4 handoff. Direct URL rendering and safe upload UI are pending in the revised Fix 6 baseline; once delivered, preserve their identity/retry behavior and cart URL fields. No UI redesign, query-library introduction, or per-role DB connection logic.

## Verification

- [ ] Double click, two tabs, timeout then retry, and expired access-token replay create no duplicate order.
- [ ] New intentional order after cart refill uses new identity.
- [ ] A cart mutation conflicting with checkout leaves understandable, accurate cart state.
- [ ] Staff cannot buy; customers cannot edit another customer's order/cart.
- [ ] Admin conflict screens reflect server state; self-deactivation/demotion remains disabled.
- [ ] Catalog upload, variant editing, both fulfillment modes, and order history retain existing behavior.
- [ ] Run frontend lint/build and record browser flow evidence; mock UI verification is not backend integration proof.

## Definition of Done

All backend contract handoffs are consumed, browser scenarios and frontend checks pass, and A receives any shared storefront/store changes for 8.10.
