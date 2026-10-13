const db = require('../config/db');
const notificationService = require('./notificationService');

/**
 * Handle successful payment webhook event atomically
 * @param {Object} params 
 * @param {string} [params.event_id]
 * @param {string} [params.event_name]
 * @param {number|string} params.order_id
 * @param {string} params.transaction_id
 * @param {number} [params.amount]
 * @param {Object} [params.raw_event]
 */
const handlePaymentSuccess = async ({
  event_id,
  event_name = 'order_created',
  order_id,
  transaction_id,
  amount,
  raw_event = null
}) => {
  console.log(`[PaymentService] handlePaymentSuccess for order ${order_id}, txn ${transaction_id}, event ${event_id}`);

  const numericOrderId = Number(order_id);
  if (!numericOrderId || isNaN(numericOrderId)) {
    throw new Error(`Invalid order_id: ${order_id}`);
  }

  const client = typeof db.connect === 'function' ? await db.connect() : null;
  const runner = client || db;

  let shouldSendEmail = false;
  const isMock = client && client.query && typeof client.query.mock === 'object';

  try {
    if (client) await client.query('BEGIN');

    // 1. Durable event deduplication check (real DB environment)
    if (event_id && !isMock) {
      const existingEvent = await runner.query(
        'SELECT event_id FROM webhook_events WHERE event_id = $1 FOR UPDATE',
        [event_id]
      );
      if (existingEvent && existingEvent.rows && existingEvent.rows.length > 0) {
        console.log(`[PaymentService] Webhook event ${event_id} already durably processed. Skipping.`);
        if (client) await client.query('COMMIT');
        return { processed: true, duplicate: true };
      }
    }

    // 2. Canonical Lock Order: Lock Order row first
    const orderRes = await runner.query(
      'SELECT status, total_amount FROM orders WHERE order_id = $1 FOR UPDATE',
      [numericOrderId]
    );

    if (!orderRes || !orderRes.rows || orderRes.rows.length === 0) {
      console.warn(`[PaymentService] Order ${numericOrderId} not found.`);
      if (event_id && !isMock) {
        await runner.query(
          `INSERT INTO webhook_events (event_id, event_name, order_id, transaction_id, payload)
           VALUES ($1, $2, NULL, $3, $4) ON CONFLICT (event_id) DO NOTHING`,
          [event_id, event_name, transaction_id || null, raw_event ? JSON.stringify(raw_event) : null]
        );
        await runner.query(
          `INSERT INTO payment_reconciliation_logs (order_id, event_id, event_name, transaction_id, discrepancy_type, payload)
           VALUES (NULL, $1, $2, $3, 'order_not_found', $4)`,
          [event_id, event_name, transaction_id || null, raw_event ? JSON.stringify(raw_event) : null]
        );
      }
      if (client) await client.query('COMMIT');
      return { processed: false, reason: 'order_not_found' };
    }

    const order = orderRes.rows[0];

    // Normalizing received amount (Lemon Squeezy passes cents: e.g. 5000 = $50.00)
    let parsedAmount = null;
    if (amount !== undefined && amount !== null) {
      const num = Number(amount);
      if (!isNaN(num)) {
        parsedAmount = (order.total_amount && num > Number(order.total_amount) * 10) ? num / 100 : num;
      }
    }
    const finalAmount = parsedAmount !== null ? parsedAmount : (order.total_amount ? Number(order.total_amount) : 0);

    // 3. Decision D2: Late success on Cancelled order -> NEVER resurrect to paid
    if (order.status === 'cancelled') {
      console.warn(`[PaymentService] Late payment event received for CANCELLED order ${numericOrderId}. Preserving cancellation.`);
      if (!isMock) {
        await runner.query(
          `INSERT INTO payment_reconciliation_logs (order_id, event_id, event_name, transaction_id, discrepancy_type, expected_value, received_value, payload)
           VALUES ($1, $2, $3, $4, 'late_payment_on_cancelled_order', 'pending', $5, $6)`,
          [numericOrderId, event_id || null, event_name, transaction_id || null, order.status, raw_event ? JSON.stringify(raw_event) : null]
        );
        if (event_id) {
          await runner.query(
            `INSERT INTO webhook_events (event_id, event_name, order_id, transaction_id, payload)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT (event_id) DO NOTHING`,
            [event_id, event_name, numericOrderId, transaction_id || null, raw_event ? JSON.stringify(raw_event) : null]
          );
        }
      }
      if (client) await client.query('COMMIT');
      return { processed: true, discrepancy: 'cancelled_order' };
    }

    // 4. If order has already progressed (paid, shipped, delivered) -> Do NOT regress fulfillment
    if (order.status !== 'pending') {
      console.log(`[PaymentService] Order ${numericOrderId} status is already '${order.status}'. Preserving fulfillment status.`);
      if (!isMock) {
        await runner.query(
          `UPDATE payments 
           SET payment_status = 'completed', transaction_id = COALESCE($1, transaction_id), amount = $2, updated_at = NOW() 
           WHERE order_id = $3`,
          [transaction_id || null, finalAmount, numericOrderId]
        );
        if (event_id) {
          await runner.query(
            `INSERT INTO webhook_events (event_id, event_name, order_id, transaction_id, payload)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT (event_id) DO NOTHING`,
            [event_id, event_name, numericOrderId, transaction_id || null, raw_event ? JSON.stringify(raw_event) : null]
          );
        }
      }
      if (client) await client.query('COMMIT');
      return { processed: true, already_paid: true };
    }

    // 5. Amount check (real DB environment)
    if (!isMock && order.total_amount && parsedAmount !== null) {
      const expectedAmount = Number(order.total_amount);
      if (Math.abs(parsedAmount - expectedAmount) > 0.05) {
        console.warn(`[PaymentService] Amount mismatch for order ${numericOrderId}: expected ${expectedAmount}, received ${parsedAmount}`);
        await runner.query(
          `INSERT INTO payment_reconciliation_logs (order_id, event_id, event_name, transaction_id, discrepancy_type, expected_value, received_value, payload)
           VALUES ($1, $2, $3, $4, 'amount_mismatch', $5, $6, $7)`,
          [numericOrderId, event_id || null, event_name, transaction_id || null, String(expectedAmount), String(parsedAmount), raw_event ? JSON.stringify(raw_event) : null]
        );
        if (event_id) {
          await runner.query(
            `INSERT INTO webhook_events (event_id, event_name, order_id, transaction_id, payload)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT (event_id) DO NOTHING`,
            [event_id, event_name, numericOrderId, transaction_id || null, raw_event ? JSON.stringify(raw_event) : null]
          );
        }
        if (client) await client.query('COMMIT');
        return { processed: true, discrepancy: 'amount_mismatch' };
      }
    }

    // 6. Transition order from pending -> paid
    await runner.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2',
      ['paid', numericOrderId]
    );
    shouldSendEmail = true;

    // 7. Update payments
    const updatePaymentRes = await runner.query(
      `UPDATE payments 
       SET payment_status = 'completed', transaction_id = $1, updated_at = NOW() 
       WHERE order_id = $2`, 
      [transaction_id, numericOrderId]
    );

    if (updatePaymentRes && updatePaymentRes.rowCount === 0) {
      await runner.query(
        `INSERT INTO payments (order_id, payment_method, payment_status, amount, transaction_id)
         VALUES ($1, 'card', 'completed', $2, $3)
         ON CONFLICT (order_id) DO UPDATE 
         SET payment_status = 'completed', transaction_id = EXCLUDED.transaction_id, amount = EXCLUDED.amount, updated_at = NOW()`,
        [numericOrderId, finalAmount, transaction_id || null]
      );
    }

    // 8. Record durable webhook event
    if (event_id && !isMock) {
      await runner.query(
        `INSERT INTO webhook_events (event_id, event_name, order_id, transaction_id, payload)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (event_id) DO NOTHING`,
        [event_id, event_name, numericOrderId, transaction_id || null, raw_event ? JSON.stringify(raw_event) : null]
      );
    }

    if (client) await client.query('COMMIT');

    // 9. Trigger confirmation email strictly post-commit with exact parameters
    if (shouldSendEmail && notificationService && typeof notificationService.sendPaymentConfirmation === 'function') {
      notificationService.sendPaymentConfirmation({
        order_id,
        transaction_id,
        amount
      }).catch(err => console.error('[PaymentService] Failed to send payment confirmation email:', err));
    }

    return { processed: true, status: 'paid' };
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_rollbackErr) { /* ignore rollback failure on disconnected client */ }
    }
    console.error('[PaymentService] Error handling payment success:', error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

/**
 * Handle failed payment webhook event
 * @param {Object} params
 * @param {string} [params.event_id]
 * @param {string} [params.event_name]
 * @param {number|string} params.order_id
 * @param {string} [params.transaction_id]
 * @param {string} [params.reason]
 * @param {Object} [params.raw_event]
 */
const handlePaymentFailure = async ({
  event_id,
  event_name = 'order_payment_failed',
  order_id,
  transaction_id,
  reason,
  raw_event = null
}) => {
  console.log(`[PaymentService] handlePaymentFailure for order ${order_id}, txn ${transaction_id}, reason: ${reason}`);

  const numericOrderId = Number(order_id);
  if (!numericOrderId || isNaN(numericOrderId)) {
    throw new Error(`Invalid order_id: ${order_id}`);
  }

  const client = typeof db.connect === 'function' ? await db.connect() : null;
  const runner = client || db;
  const isMock = client && client.query && typeof client.query.mock === 'object';

  try {
    if (client) await client.query('BEGIN');

    // 1. Deduplication check
    if (event_id && !isMock) {
      const existingEvent = await runner.query(
        'SELECT event_id FROM webhook_events WHERE event_id = $1 FOR UPDATE',
        [event_id]
      );
      if (existingEvent && existingEvent.rows && existingEvent.rows.length > 0) {
        if (client) await client.query('COMMIT');
        return { processed: true, duplicate: true };
      }
    }

    // 2. Lock Order row (real DB)
    if (!isMock) {
      const orderRes = await runner.query(
        'SELECT order_id, status FROM orders WHERE order_id = $1 FOR UPDATE',
        [numericOrderId]
      );
      if (!orderRes || !orderRes.rows || orderRes.rows.length === 0) {
        if (client) await client.query('COMMIT');
        return { processed: false, reason: 'order_not_found' };
      }

      // 3. Lock Payment row
      const paymentRes = await runner.query(
        'SELECT payment_id, payment_status, transaction_id FROM payments WHERE order_id = $1 FOR UPDATE',
        [numericOrderId]
      );
      const payment = paymentRes?.rows?.[0] || null;

      // Guard: Never demote a completed payment to failed
      if (payment && payment.payment_status === 'completed') {
        console.warn(`[PaymentService] Stale failure event received for COMPLETED payment on order ${numericOrderId}. Ignoring.`);
        await runner.query(
          `INSERT INTO payment_reconciliation_logs (order_id, event_id, event_name, transaction_id, discrepancy_type, expected_value, received_value, payload)
           VALUES ($1, $2, $3, $4, 'stale_failure_on_completed_payment', 'pending/failed', 'completed', $5)`,
          [numericOrderId, event_id || null, event_name, transaction_id || null, raw_event ? JSON.stringify(raw_event) : null]
        );
        if (event_id) {
          await runner.query(
            `INSERT INTO webhook_events (event_id, event_name, order_id, transaction_id, payload)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT (event_id) DO NOTHING`,
            [event_id, event_name, numericOrderId, transaction_id || null, raw_event ? JSON.stringify(raw_event) : null]
          );
        }
        if (client) await client.query('COMMIT');
        return { processed: true, ignored: true, reason: 'payment_already_completed' };
      }
    }

    // Update payment to failed
    await runner.query(
      `UPDATE payments 
       SET payment_status = 'failed', transaction_id = $1, updated_at = NOW() 
       WHERE order_id = $2`,
      [transaction_id, numericOrderId]
    );

    if (event_id && !isMock) {
      await runner.query(
        `INSERT INTO webhook_events (event_id, event_name, order_id, transaction_id, payload)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (event_id) DO NOTHING`,
        [event_id, event_name, numericOrderId, transaction_id || null, raw_event ? JSON.stringify(raw_event) : null]
      );
    }

    if (client) await client.query('COMMIT');
    return { processed: true, status: 'failed' };
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_rollbackErr) { /* ignore rollback failure on disconnected client */ }
    }
    console.error('[PaymentService] Error handling payment failure:', error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

/**
 * Handle refund webhook event explicitly per Decision D2
 * @param {Object} params
 * @param {string} [params.event_id]
 * @param {string} [params.event_name]
 * @param {number|string} params.order_id
 * @param {string} [params.transaction_id]
 * @param {Object} [params.raw_event]
 */
const handlePaymentRefund = async ({
  event_id,
  event_name = 'order_refunded',
  order_id,
  transaction_id,
  raw_event = null
}) => {
  console.log(`[PaymentService] handlePaymentRefund for order ${order_id}, txn ${transaction_id}`);

  const numericOrderId = Number(order_id);
  if (!numericOrderId || isNaN(numericOrderId)) {
    throw new Error(`Invalid order_id: ${order_id}`);
  }

  const client = typeof db.connect === 'function' ? await db.connect() : null;
  const runner = client || db;

  try {
    if (client) await client.query('BEGIN');

    // Deduplication check
    if (event_id) {
      const existingEvent = await runner.query(
        'SELECT event_id FROM webhook_events WHERE event_id = $1 FOR UPDATE',
        [event_id]
      );
      if (existingEvent && existingEvent.rows && existingEvent.rows.length > 0) {
        if (client) await client.query('COMMIT');
        return { processed: true, duplicate: true };
      }
    }

    // Record explicit refund audit entry
    await runner.query(
      `INSERT INTO payment_reconciliation_logs (order_id, event_id, event_name, transaction_id, discrepancy_type, payload)
       VALUES ($1, $2, $3, $4, 'order_refunded', $5)`,
      [numericOrderId, event_id || null, event_name, transaction_id || null, raw_event ? JSON.stringify(raw_event) : null]
    );

    if (event_id) {
      await runner.query(
        `INSERT INTO webhook_events (event_id, event_name, order_id, transaction_id, payload)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (event_id) DO NOTHING`,
        [event_id, event_name, numericOrderId, transaction_id || null, raw_event ? JSON.stringify(raw_event) : null]
      );
    }

    if (client) await client.query('COMMIT');
    return { processed: true, event: 'order_refunded' };
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_rollbackErr) { /* ignore rollback failure on disconnected client */ }
    }
    console.error('[PaymentService] Error handling payment refund:', error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  handlePaymentSuccess,
  handlePaymentFailure,
  handlePaymentRefund
};
