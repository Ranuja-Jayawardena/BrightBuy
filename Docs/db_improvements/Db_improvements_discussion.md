# Database Improvements: Discussion

> **Status:** V27 and the backend timestamp edits exist in the working tree; application to a real database is unverified. Other items remain planned work.
> **Implementation plan:** [Fix 7: Database Integrity & Concurrency](../Fixes/Fix7-Database-Integrity-Concurrency/fix7-database-integrity-concurrency.md) assigns the work, dependencies, decision gates, tests, and rollout. Use that plan for execution; this file preserves the discussion and rationale.
> **Database:** PostgreSQL, with schema changes managed through Flyway migrations.

## Code prepared: catalog `updated_at` triggers

Flyway migration `V27__set_catalog_updated_at_on_update.sql` adds `BEFORE UPDATE` triggers to `products` and `product_variants`. PostgreSQL sets `NEW.updated_at` to the current transaction timestamp on every update, including direct SQL updates. The backend no longer assigns `updated_at` in its updates to these two tables. Their existing column defaults still supply the timestamp on insert.

The timestamp describes a change to that specific row. Updating a variant, product image, category assignment, or variant attribute does not update the parent `products.updated_at`. A no-op `UPDATE` still sets the row's timestamp to `CURRENT_TIMESTAMP`, matching the prior explicit-update behavior. Because this is the transaction start timestamp, multiple updates in one transaction can have the same value; it does not necessarily advance on every statement. Real database verification is tracked in [Fix 7.2](../Fixes/Fix7-Database-Integrity-Concurrency/fix7.2-catalog-timestamp-verification.md).

## Highest-priority database rules

The backend should continue to validate requests and coordinate workflows. The database should enforce invariants that must survive concurrent requests, future writers, imports, and direct SQL. The order below reflects the current code and the severity of a possible inconsistency; it is not an implementation commitment.

| Priority | Invariant | Database mechanism | Why it matters |
| --- | --- | --- | --- |
| 1 | An order cannot make an invalid status transition, especially `cancelled -> paid`. | Transition trigger on `orders`; also fix the late-payment webhook behavior. | A late success event can mark a cancelled order paid after cancellation restored its stock. See [proposal 1](#1-enforce-valid-order-status-transitions). |
| 2 | One cart checkout cannot create two orders or discard a concurrent cart edit. | Coordinate checkout and cart mutations under a common lock/transaction strategy; consider a unique checkout request key for retries. | Variant locks prevent overselling, but two concurrent requests can order the same cart if stock suffices. An edit made after checkout reads the cart can be deleted when checkout clears it. See [checkout concurrency](#checkout-concurrency-and-payment-event-ordering). |
| 3 | A late failure event cannot change a completed payment back to `failed`. | Conditional, attempt-aware payment updates in the backend, with database uniqueness rules once payment attempts are defined. | The failure handler currently updates payments by `order_id` without checking their current status or transaction. See [payment event ordering](#checkout-concurrency-and-payment-event-ordering). |
| 4 | Each customer has at most one cart. | `UNIQUE (customer_id)` on `carts`, followed by an atomic insert/upsert in the backend. | Concurrent `getOrCreateCart` requests can each see no cart and insert one; the current schema has only a regular index. |
| 5 | At least one active super admin remains, if continuous administrative access is a hard requirement. | Concurrency-safe trigger or controlled database operation. | The backend count and update are separate operations, so simultaneous demotions or deactivations can both pass the check. See [proposal 2](#2-preserve-at-least-one-active-super-admin). |
| 6 | Each order has at most one delivery, if the intended relationship is one-to-one. | `UNIQUE (order_id)` on `deliveries`. | Order placement creates one delivery and detail queries read one, while the schema permits several. |
| 7 | Persisted delivery statuses and monetary amounts are valid. | `CHECK` constraints for allowed `deliveries.delivery_status`, `payments.amount >= 0`, and `order_items.unit_price >= 0`. | These values are currently less restricted in the database than in application logic. A simple constraint is clearer than a trigger. |

## Checkout concurrency and payment event ordering

**Duplicate checkout of one cart:** Order placement reads `cart_items` before locking variant rows. Two concurrent requests for the same customer can both read the same cart. The variant locks serialize stock checks and deductions, so stock should not go negative, but both requests can create orders if enough stock remains. Clearing the cart at the end does not undo the second order. Make checkout single-use for a given cart state or checkout request. A coordinated lock on the customer's cart during checkout, with all cart edit paths honoring the same lock, and a unique request key for safe retries are possible approaches. Choose the behavior for two intentional purchases separately from a retry of one request.

**Cart edits during checkout:** After checkout reads the item list, another request can add or change items before checkout's final `DELETE FROM cart_items WHERE cart_id = ...`. An added item may be removed without appearing in the new order. The checkout and cart edit paths need a common serialization rule; locking only product variants or only changing the checkout path does not protect edits to existing cart items. Test concurrent add, quantity change, removal, and checkout against a real PostgreSQL database.

**Late payment failure:** The failure handler sets `payment_status = 'failed'` on rows matching `order_id`, regardless of their current status or the event's transaction ID. A success handled first can leave an order `paid`, then a later failure event can mark its payment `failed`. Identify the payment attempt represented by each event and allow only valid payment-state changes. A completed payment must not be demoted by an older or unrelated failure. Decide how retry attempts are stored before choosing uniqueness constraints or updating by attempt ID. Test success-then-failure, failure-then-success, repeated events, and competing events.

These are workflow fixes backed by database locks or constraints where appropriate. A trigger alone does not identify an HTTP checkout retry or reconcile payment-provider events.

**Relevant code:** `backend/src/models/orderModel.js`, `backend/src/models/cartModel.js`, `backend/src/services/paymentService.js`, and `backend/src/controllers/paymentController.js`.

**Payment cardinality needs a decision before adding a constraint.** The payment-session code looks up the latest payment and updates it or inserts one, but concurrent requests can both insert. If `payments` represents one current payment per order, enforce `UNIQUE (order_id)` and use an atomic upsert. If it represents a history of retry attempts, model that history explicitly and enforce whichever rule applies to active attempts. Do not impose one row per order without deciding how retries should be stored.

**Inventory history also needs a definition.** The dedicated inventory adjustment path updates stock and inserts an `inventory_adjustments` row in one transaction. Product variant editing can change `stock_quantity` without such a row. If this table must be a complete audit of manual stock changes, use one authoritative write path that always records the employee and reason. A trigger should not invent missing audit details. If the table covers only the dedicated adjustment workflow, document that narrower meaning.

**Relevant code:** `backend/src/models/cartModel.js`, `backend/db/migrations/V14__create_carts.sql`, `backend/src/controllers/paymentController.js`, `backend/db/migrations/V18__create_payments.sql`, `backend/src/models/orderModel.js`, `backend/db/migrations/V19__create_deliveries.sql`, `backend/db/migrations/V17__create_order_items.sql`, `backend/src/models/adminInventoryModel.js`, and `backend/src/models/adminProductModel.js`.

## Additional database improvements

### Prevent a payment transaction ID from being linked twice

`payments.transaction_id` is currently nullable and has no uniqueness constraint. If the payment provider guarantees that each successful payment has a unique transaction ID, the database should prevent that ID from appearing on two payment rows. This is distinct from deciding whether an order can have multiple payment attempts: several attempts may exist, but the same provider transaction should not be credited to two orders.

Confirm the provider's ID semantics and inspect existing non-null values before adding a unique constraint or unique index. PostgreSQL uniqueness still permits multiple `NULL` values for payments without a transaction ID. Keep webhook verification and idempotent event handling in the backend; uniqueness is a final guard against duplicate association, not a complete webhook workflow.

**Relevant code:** `backend/db/migrations/V18__create_payments.sql`, `backend/src/services/paymentService.js`, and `backend/src/controllers/paymentController.js`.

### Use separate database accounts for migrations and the running API

The current migration files do not create PostgreSQL roles or grant/revoke privileges. Flyway needs permission to create or alter schema objects; the running API generally needs permission to read and change application data. Separate database accounts would let PostgreSQL enforce this difference. Review the actual deployment credentials and Flyway configuration before changing them; the fallback account in `backend/src/config/db.js` does not prove which credentials are used in production.

This is separate from `employees.role`. Employee roles describe a person's access through Express routes. A PostgreSQL application account describes what the backend process can do after it connects. Start with a migration account and an application account; introduce a read-only reporting account only if a separate reporting client needs direct database access. Test migrations, seeds, backend reads/writes, and future migration ownership/default privileges as part of any rollout.

**Relevant code:** `backend/src/config/db.js`, `backend/src/middleware/authMiddleware.js`, `backend/db/migrations/`, and the Docker/Flyway deployment configuration.

## Views and roles: current use and possible fit

No `CREATE VIEW` or `CREATE MATERIALIZED VIEW` statement appears in the current migration files, and the backend report models query base tables directly. The project does not currently use SQL views.

A regular view could centralize a stable reporting definition. For example, sales and customer reports both treat orders with `paid`, `shipped`, or `delivered` status as revenue-bearing. A `reportable_orders` view could expose those orders so both reports use the same rule. Agree first whether the business means order value or money actually collected. A regular view stores a query definition, not a second copy of the rows, and does not automatically improve performance. Add it when report definitions need to be shared or granted to a separate reporting account; the two current queries alone do not make it urgent.

A view could also present a convenient joined staff record, such as employee ID, email, role, and active status. That would simplify repeated reads, but it should **not** replace the current API authorization checks. The backend uses one pooled database connection and resolves each signed-in employee in `authMiddleware.js`; a normal view queried through that same connection does not know which HTTP user made the request. If a separate database reporting account is introduced, granting that account access to a restricted view can limit which columns it reads. Enforcing each employee's permissions inside PostgreSQL would require a separate, deliberate design, such as trusted session context and row-level security; a view alone is insufficient.

**Relevant code:** `backend/src/models/salesReportModel.js`, `backend/src/models/analyticsReportModel.js`, `backend/src/middleware/authMiddleware.js`, and `backend/db/migrations/V21__add_employee_role.sql`.

## Why consider triggers?

A trigger is useful when a database rule depends on a change across rows or on the transition from an old value to a new value. It can protect the rule regardless of whether a write comes from the current API, a future service, an import, or direct SQL. A trigger also runs as part of the writing transaction: if it rejects a change, that transaction fails. For simple valid values and uniqueness, prefer `CHECK`, foreign key, or unique constraints instead.

The three trigger proposals below need clear business rules and concurrency review before implementation. The examples describe PostgreSQL trigger behavior conceptually; they are not migration SQL.

## 1. Enforce valid order status transitions

### Current behavior

The `orders.status` check constraint limits stored values to `pending`, `paid`, `shipped`, `delivered`, and `cancelled`. It does not restrict transitions between those values. The admin service permits `pending -> paid/cancelled`, `paid -> shipped/cancelled`, and `shipped -> delivered/cancelled`, with no transitions from `delivered` or `cancelled`. The service checks the current status before the model updates it, but the database does not enforce that transition rule.

There is a concrete risk in the payment path. When an order is cancelled, the admin order model restores its item stock in the same transaction. If a card payment success event arrives afterwards, the payment handler currently ignores only orders already marked `paid`; it can update a `cancelled` order to `paid`. That can leave a paid order whose stock has already been restored.

### Proposed trigger

Use a `BEFORE UPDATE OF status` row trigger on `orders`. Compare `OLD.status` with `NEW.status` and reject transitions outside an agreed transition table. A no-op update can either be allowed or avoided with a `WHEN (OLD.status IS DISTINCT FROM NEW.status)` condition. The trigger should report a clear database error; it should not perform payment or stock operations itself.

### Decisions and implementation cautions

- Confirm the transition policy first, especially whether an admin may mark a `pending` card order `paid` without a completed payment.
- Update the payment webhook to handle success events for cancelled, shipped, or delivered orders deliberately. A trigger prevents an invalid status write but cannot decide whether a captured payment must be refunded or investigated.
- Keep cancellation stock restoration in the existing transaction. Do not add stock restoration to the status trigger as well, or the stock may be restored twice.
- Ensure API and webhook code map a rejected transition to the correct response or recovery path.
- Test a late payment success after cancellation, repeated events, normal transitions, direct SQL updates, and simultaneous admin/payment updates.

**Relevant code:** `backend/db/migrations/V16__create_orders.sql`, `backend/src/services/adminOrderService.js`, `backend/src/models/adminOrderModel.js`, and `backend/src/services/paymentService.js`.

## 2. Preserve at least one active super admin

### Current behavior

Before demoting or deactivating a `super_admin`, the staff service counts active super admins. The count and the subsequent employee update are separate database operations. If Alice and Bob are the only active super admins, concurrent requests could each count two and then deactivate one account. Both checks pass, leaving no active super admin. Direct database writes can bypass the service check entirely.

### Proposed trigger

Guard `employees` updates that change `role` away from `super_admin` or change `is_active` to false, and guard deletion of an active super admin if deletion is permitted. Reject a change that would leave zero active super admins. Fire only for relevant changes so ordinary profile edits are unaffected.

### Decisions and implementation cautions

- Treat this as a hard database invariant only if the team requires an active super admin at all times. Initial setup or disaster recovery may need a controlled bootstrap procedure.
- A simple `COUNT(*)` inside a trigger is **not enough** under concurrent transactions: each transaction could still see the other admin. The design must serialize competing removals with an appropriate lock or equivalent mechanism, then check the remaining active count.
- Consider account deletion through the `users` table: the foreign key can cascade to `employees`, so a guard on employee deletion matters if user deletion is possible.
- Keep the API's self-demotion and self-deactivation checks for helpful messages; the database trigger would enforce the global invariant.
- Test sequential and concurrent demotions, deactivations, deletions, promotion/activation, and initial staff setup.

**Relevant code:** `backend/db/migrations/V21__add_employee_role.sql`, `backend/db/migrations/V24__add_employee_active_status.sql`, `backend/src/services/adminInventoryService.js`, and `backend/src/models/adminInventoryModel.js`.

## 3. Prevent cycles in the category hierarchy

### Current behavior

`categories.parent_category_id` is a foreign key to another category. It confirms that the chosen parent exists, but allows a cycle such as `A -> B -> C -> A`. The category service currently uses a recursive query before changing a parent to reject cycles. Imports, direct SQL, or another future writer could bypass that application check.

### Proposed trigger

Use a `BEFORE INSERT OR UPDATE OF parent_category_id` row trigger on `categories`. Reject a category that names itself as parent. For a non-null parent, follow that parent's ancestor chain with a recursive query and reject the change if it reaches the category being modified. The foreign key should continue to handle nonexistent parents.

### Decisions and implementation cautions

- This is lower priority while the existing category API is the only writer. It becomes more valuable if categories are edited by imports or multiple services.
- Recheck concurrent reparenting. Two transactions could each perform a locally valid update that forms a cycle when both commit; a plain recursive check alone may not protect against this. The implementation needs a suitable locking or transaction strategy.
- Decide how deeply nested categories should be allowed, if there is a product limit. That is a separate rule from cycle prevention.
- Test self-parenting, a longer cycle, moving a valid subtree, deleting/deactivating a category, direct SQL writes, and concurrent reparenting.

**Relevant code:** `backend/db/migrations/V7__create_categories.sql`, `backend/src/services/adminCategoryService.js`, and `backend/src/models/adminCategoryModel.js`.

## Suggested implementation order

This was the discussion order. The [Fix 7 dependency map](../Fixes/Fix7-Database-Integrity-Concurrency/fix7-database-integrity-concurrency.md) now governs implementation and includes compatibility checks before enforcement. Views remain deferred.

1. Agree on the order/payment state policy, fix late success and failure events, then add the order transition guard.
2. Prevent concurrent checkout of the same cart and coordinate cart edits with checkout. Decide how a retry of the same request is identified.
3. Enforce one cart per customer and make cart creation atomic; check for existing duplicates before adding the constraint.
4. Add the super-admin guard if uninterrupted administrative access is a required invariant; design its concurrency control before writing the trigger.
5. Confirm the delivery relationship and add its uniqueness constraint if it is one-to-one. Add the simple delivery-status and nonnegative-amount checks after checking existing data.
6. Decide how payment attempts and inventory adjustments should be modeled before adding rules for them.
7. Add category cycle protection when category writes extend beyond the current API or the hierarchy becomes critical to other operations.
8. After confirming payment-provider ID semantics, guard against one transaction ID being associated with multiple payments.
9. Review database account privileges during deployment hardening. Add a reporting view when multiple reports or a separate reporting account have a concrete need for the same definition.

For each accepted proposal, add a new Flyway migration and update `Docs/Database/DB_Schema.md` and the related phase documentation. Do not edit an already-applied migration.
