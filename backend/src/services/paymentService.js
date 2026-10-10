// Stubbed payment handlers for Phase 6.1

/**
 * Handle successful payment
 * @param {Object} params 
 * @param {string} params.order_id
 * @param {string} params.transaction_id
 * @param {number} params.amount
 * @param {Object} params.raw_event
 */
const handlePaymentSuccess = async ({ order_id, transaction_id, amount, raw_event }) => {
  console.log(`[STUB] handlePaymentSuccess called for order ${order_id}, transaction ${transaction_id}`);
  // To be implemented in 6.3
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
  console.log(`[STUB] handlePaymentFailure called for order ${order_id}, transaction ${transaction_id}, reason: ${reason}`);
  // To be implemented in 6.3
};

module.exports = {
  handlePaymentSuccess,
  handlePaymentFailure
};
