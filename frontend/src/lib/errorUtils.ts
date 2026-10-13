/**
 * Utility functions for user-friendly error formatting and database conflict mapping.
 * Ensures no raw SQL syntax, constraint names, or internal codes are leaked to users.
 */

export function sanitizeConflictError(err: unknown, fallback = 'An unexpected error occurred. Please try again.'): string {
  if (!err) return fallback;

  let raw = '';
  if (typeof err === 'string') {
    raw = err;
  } else if (err instanceof Error) {
    raw = err.message;
  } else if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, any>;
    raw = obj.message || obj.error || JSON.stringify(err);
  } else {
    raw = String(err);
  }

  // 1. Super Admin Guard Trigger & Self-Modification
  if (/last active super admin/i.test(raw) || /super_admin/i.test(raw) && /last/i.test(raw)) {
    return 'Cannot deactivate or change the role of the last active Super Admin. At least one Super Admin must remain active.';
  }
  if (/cannot deactivate your own account/i.test(raw) || /cannot demote yourself/i.test(raw)) {
    return 'You cannot deactivate or demote your own account.';
  }

  // 2. Category Hierarchy Acyclic Guard (V33)
  if (/circular category|cycle|hierarchy cycle|ancestor/i.test(raw)) {
    return 'Cannot set parent category: circular hierarchy loop detected. A category cannot be its own ancestor.';
  }

  // 3. Checkout Concurrency & Idempotency
  if (/IDEMPOTENCY_CONFLICT/i.test(raw) || /uq_order_idempotency_customer_key/i.test(raw) || /concurrent request with same idempotency/i.test(raw)) {
    return 'A checkout request with this submission is already being processed. Please check your order history.';
  }
  if (/idx_carts_customer_id_unique/i.test(raw) || /cart.*modified/i.test(raw)) {
    return 'Your cart was modified in another session. We have updated your cart. Please review before proceeding.';
  }
  if (/insufficient stock/i.test(raw)) {
    // Clean up "Insufficient stock for: SKU (requested X, available Y)"
    const match = raw.match(/insufficient stock for:? (.*)/i);
    return match ? `Insufficient stock available for ${match[1].trim()}.` : 'Some items in your cart exceed available stock. We have updated your cart.';
  }
  if (/cart is empty/i.test(raw)) {
    return 'Your cart is empty. Please add items to your cart before checking out.';
  }

  // 4. Order & Delivery Transitions
  if (/invalid.*transition|chk_order_status|invalid_order_transition/i.test(raw)) {
    return 'The requested order status change is not permitted from the current order state.';
  }
  if (/chk_deliveries_mode_status|invalid_delivery_status/i.test(raw)) {
    return 'The selected delivery status is not valid for this fulfillment mode.';
  }
  if (/tracking number is required/i.test(raw)) {
    return 'A tracking number is required when shipping home delivery orders.';
  }
  if (/idx_payments_order_id_unique/i.test(raw) || /idx_deliveries_order_id_unique/i.test(raw)) {
    return 'A record for this order has already been created. Please refresh the page.';
  }

  // 5. Inventory Adjustments & Audit
  if (/adjustment reason|reason is required|audit/i.test(raw)) {
    return 'An adjustment reason is required for audit logging.';
  }

  // 6. Generic PostgreSQL Cleanups
  if (/duplicate key|unique constraint/i.test(raw)) {
    return 'A record with this information already exists.';
  }
  if (/foreign key constraint/i.test(raw)) {
    return 'The requested operation references an item or category that is no longer available.';
  }
  if (/check constraint/i.test(raw)) {
    return 'The submitted data did not satisfy required validation rules.';
  }
  if (/P0001/i.test(raw)) {
    // Strip "error: P0001: " prefix if present
    const clean = raw.replace(/^error:\s*P0001:\s*/i, '').trim();
    return clean || fallback;
  }

  // 7. Network & Server Errors
  if (/failed to fetch|networkerror/i.test(raw)) {
    return 'Network connection issue. Please check your internet connection and try again.';
  }

  return raw || fallback;
}
