const db = require('../config/db');

/**
 * Handle successful payment
 * @param {Object} params 
 * @param {string} params.order_id
 * @param {string} params.transaction_id
 * @param {number} params.amount
 * @param {Object} params.raw_event
 */
const handlePaymentSuccess = async ({ order_id, transaction_id, amount, raw_event }) => {
  console.log(`handlePaymentSuccess called for order ${order_id}, transaction ${transaction_id}`);
  
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query('SELECT status FROM orders WHERE order_id = $1 FOR UPDATE', [order_id]);
    
    if (orderRes.rows.length === 0) {
      throw new Error(`Order ${order_id} not found`);
    }

    const order = orderRes.rows[0];

    // Ignore events for orders that are already paid
    if (order.status === 'paid') {
      console.log(`Order ${order_id} is already paid. Ignoring success event.`);
      await client.query('ROLLBACK');
      return;
    }

    // Move the order from pending -> paid
    await client.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2', ['paid', order_id]);

    // Save transaction_id and set payment_status = 'completed'
    await client.query(
      `UPDATE payments 
       SET payment_status = 'completed', transaction_id = $1, updated_at = NOW() 
       WHERE order_id = $2`, 
      [transaction_id, order_id]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error handling payment success:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Handle failed payment
 * @param {Object} params
 * @param {string} params.order_id
 * @param {string} params.transaction_id
 * @param {string} params.reason
 * @param {Object} params.raw_event
 */
const handlePaymentFailure = async ({ order_id, transaction_id, reason, raw_event }) => {
  console.log(`handlePaymentFailure called for order ${order_id}, transaction ${transaction_id}, reason: ${reason}`);
  
  try {
    // Set payment_status = 'failed', leave order 'pending'
    await db.query(
      `UPDATE payments 
       SET payment_status = 'failed', transaction_id = $1, updated_at = NOW() 
       WHERE order_id = $2`,
      [transaction_id, order_id]
    );
  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
};

module.exports = {
  handlePaymentSuccess,
  handlePaymentFailure
};
