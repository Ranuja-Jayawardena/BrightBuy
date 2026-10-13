const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../src/config/db');
const { handlePaymentSuccess, handlePaymentFailure, handlePaymentRefund } = require('../src/services/paymentService');
const adminOrderModel = require('../src/models/adminOrderModel');

jest.setTimeout(30000);

describe('Fix 8.4 & Fix 8.5: Order Transitions, Payment & Delivery Consistency Tests', () => {
  let testCustomerId;
  let testVariantId;
  let testCityId;
  const createdOrderIds = [];

  beforeAll(async () => {
    // 1. Get or create active customer
    const custRes = await db.query('SELECT customer_id FROM customers LIMIT 1');
    testCustomerId = custRes.rows[0].customer_id;

    // 2. Get active variant
    const varRes = await db.query('SELECT variant_id, stock_quantity FROM product_variants WHERE is_active = true LIMIT 1');
    testVariantId = varRes.rows[0].variant_id;

    // 3. Get valid city
    const cityRes = await db.query('SELECT city_id FROM cities LIMIT 1');
    testCityId = cityRes.rows[0].city_id;
  });

  afterAll(async () => {
    // Clean up created test orders and cascade
    if (createdOrderIds.length > 0) {
      await db.query('DELETE FROM webhook_events WHERE order_id = ANY($1)', [createdOrderIds]);
      await db.query('DELETE FROM payment_reconciliation_logs WHERE order_id = ANY($1)', [createdOrderIds]);
      await db.query('DELETE FROM deliveries WHERE order_id = ANY($1)', [createdOrderIds]);
      await db.query('DELETE FROM payments WHERE order_id = ANY($1)', [createdOrderIds]);
      await db.query('DELETE FROM order_items WHERE order_id = ANY($1)', [createdOrderIds]);
      await db.query('DELETE FROM orders WHERE order_id = ANY($1)', [createdOrderIds]);
    }
    await db.end();
  });

  // Helper to create a clean test order
  async function createTestOrder(status = 'pending', amount = 100.00) {
    const oRes = await db.query(
      `INSERT INTO orders (customer_id, status, total_amount)
       VALUES ($1, $2, $3) RETURNING order_id`,
      [testCustomerId, status, amount]
    );
    const orderId = oRes.rows[0].order_id;
    createdOrderIds.push(orderId);

    // Insert order_item
    await db.query(
      `INSERT INTO order_items (order_id, variant_id, quantity, unit_price)
       VALUES ($1, $2, 1, $3)`,
      [orderId, testVariantId, amount]
    );

    // Insert initial pending payment
    await db.query(
      `INSERT INTO payments (order_id, payment_method, payment_status, amount)
       VALUES ($1, 'card', 'pending', $2)`,
      [orderId, amount]
    );

    // Insert initial delivery
    await db.query(
      `INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status)
       VALUES ($1, 'home_delivery', '123 Test St', $2, '10001', 'pending')`,
      [orderId, testCityId]
    );

    return orderId;
  }

  describe('1. Fix 8.4: Order Status State Transitions & Trigger Guard (Decision D2)', () => {
    it('allows valid legal order status transitions (pending -> paid -> shipped -> delivered)', async () => {
      const orderId = await createTestOrder('pending');

      // pending -> paid
      const step1 = await adminOrderModel.updateOrderStatus(orderId, 'paid');
      expect(step1.status).toBe('paid');

      // paid -> shipped
      const step2 = await adminOrderModel.updateOrderStatus(orderId, 'shipped');
      expect(step2.status).toBe('shipped');

      // shipped -> delivered
      const step3 = await adminOrderModel.updateOrderStatus(orderId, 'delivered');
      expect(step3.status).toBe('delivered');
    });

    it('rejects invalid transitions in database via trigger (delivered -> pending, cancelled -> paid)', async () => {
      const orderId = await createTestOrder('delivered');

      // Database trigger blocks delivered -> pending
      await expect(
        db.query('UPDATE orders SET status = $1 WHERE order_id = $2', ['pending', orderId])
      ).rejects.toThrow(/Invalid order status transition/);

      const cancelOrderId = await createTestOrder('cancelled');
      // Database trigger blocks cancelled -> paid
      await expect(
        db.query('UPDATE orders SET status = $1 WHERE order_id = $2', ['paid', cancelOrderId])
      ).rejects.toThrow(/Invalid order status transition/);
    });

    it('treats updating to identical status as an idempotent no-op without error', async () => {
      const orderId = await createTestOrder('pending');
      const res = await adminOrderModel.updateOrderStatus(orderId, 'pending');
      expect(res.status).toBe('pending');
    });

    it('restores stock atomically and aggregated when transitioning to cancelled', async () => {
      const orderId = await createTestOrder('pending', 50.00);

      // Add a second item with same variant to verify aggregated SUM restore
      await db.query(
        `INSERT INTO order_items (order_id, variant_id, quantity, unit_price)
         VALUES ($1, $2, 2, 25.00)`,
        [orderId, testVariantId]
      );

      const beforeStockRes = await db.query('SELECT stock_quantity FROM product_variants WHERE variant_id = $1', [testVariantId]);
      const initialStock = beforeStockRes.rows[0].stock_quantity;

      // Cancel order
      await adminOrderModel.updateOrderStatus(orderId, 'cancelled');

      const afterStockRes = await db.query('SELECT stock_quantity FROM product_variants WHERE variant_id = $1', [testVariantId]);
      const finalStock = afterStockRes.rows[0].stock_quantity;

      // Restored 1 + 2 = 3 units
      expect(finalStock).toBe(initialStock + 3);
    });
  });

  describe('2. Fix 8.4: Payment Webhook Durable Deduplication & Protection', () => {
    it('applies payment success and deduplicates replay durably in database', async () => {
      const orderId = await createTestOrder('pending', 150.00);
      const eventId = `test_evt_succ_${orderId}`;

      // First delivery: transitions pending -> paid
      const result1 = await handlePaymentSuccess({
        event_id: eventId,
        order_id: orderId,
        transaction_id: `txn_${orderId}`,
        amount: 15000 // 150.00 in cents
      });
      expect(result1.processed).toBe(true);
      expect(result1.status).toBe('paid');

      const orderCheck = await db.query('SELECT status FROM orders WHERE order_id = $1', [orderId]);
      expect(orderCheck.rows[0].status).toBe('paid');

      // Replay same event: recognizes durable record and skips
      const result2 = await handlePaymentSuccess({
        event_id: eventId,
        order_id: orderId,
        transaction_id: `txn_${orderId}`,
        amount: 15000
      });
      expect(result2.processed).toBe(true);
      expect(result2.duplicate).toBe(true);
    });

    it('preserves fulfillment status when late success arrives for shipped/delivered orders', async () => {
      const orderId = await createTestOrder('pending', 120.00);
      await adminOrderModel.updateOrderStatus(orderId, 'paid');
      await adminOrderModel.updateOrderStatus(orderId, 'shipped');

      const result = await handlePaymentSuccess({
        event_id: `evt_late_${orderId}`,
        order_id: orderId,
        transaction_id: `txn_late_${orderId}`,
        amount: 12000
      });

      expect(result.already_paid).toBe(true);
      const check = await db.query('SELECT status FROM orders WHERE order_id = $1', [orderId]);
      expect(check.rows[0].status).toBe('shipped'); // Did not regress to paid
    });

    it('never resurrects cancelled order on late payment success; logs reconciliation audit', async () => {
      const orderId = await createTestOrder('cancelled', 80.00);

      const result = await handlePaymentSuccess({
        event_id: `evt_cancel_${orderId}`,
        order_id: orderId,
        transaction_id: `txn_cancel_${orderId}`,
        amount: 8000
      });

      expect(result.discrepancy).toBe('cancelled_order');
      const check = await db.query('SELECT status FROM orders WHERE order_id = $1', [orderId]);
      expect(check.rows[0].status).toBe('cancelled'); // Still cancelled

      // Verified audit entry exists
      const logCheck = await db.query('SELECT discrepancy_type FROM payment_reconciliation_logs WHERE order_id = $1', [orderId]);
      expect(logCheck.rows.length).toBeGreaterThan(0);
      expect(logCheck.rows[0].discrepancy_type).toBe('late_payment_on_cancelled_order');
    });

    it('does not demote completed payment when stale failure webhook arrives', async () => {
      const orderId = await createTestOrder('pending', 90.00);
      await handlePaymentSuccess({
        event_id: `evt_first_${orderId}`,
        order_id: orderId,
        transaction_id: `txn_first_${orderId}`,
        amount: 9000
      });

      // Subsequent stale failure event
      const failResult = await handlePaymentFailure({
        event_id: `evt_stale_fail_${orderId}`,
        order_id: orderId,
        transaction_id: `txn_first_${orderId}`,
        reason: 'Network drop'
      });

      expect(failResult.ignored).toBe(true);
      const payCheck = await db.query('SELECT payment_status FROM payments WHERE order_id = $1', [orderId]);
      expect(payCheck.rows[0].payment_status).toBe('completed'); // Not demoted to failed
    });

    it('records explicit refund audit log without demoting order state', async () => {
      const orderId = await createTestOrder('paid', 65.00);
      const refundResult = await handlePaymentRefund({
        event_id: `evt_refund_${orderId}`,
        order_id: orderId,
        transaction_id: `txn_refund_${orderId}`
      });

      expect(refundResult.event).toBe('order_refunded');
      const logCheck = await db.query('SELECT discrepancy_type FROM payment_reconciliation_logs WHERE order_id = $1', [orderId]);
      expect(logCheck.rows[0].discrepancy_type).toBe('order_refunded');
    });
  });

  describe('3. Fix 8.5: Delivery Cardinality & Mode Constraints (Decision D4)', () => {
    it('enforces 1:1 delivery cardinality per order (rejects second delivery)', async () => {
      const orderId = await createTestOrder('pending');

      // Attempting to insert a second delivery for same order must fail UNIQUE constraint
      await expect(
        db.query(
          `INSERT INTO deliveries (order_id, delivery_mode, delivery_address_line1, delivery_city_id, delivery_zip_code, delivery_status)
           VALUES ($1, 'home_delivery', '456 Second St', $2, '10001', 'pending')`,
          [orderId, testCityId]
        )
      ).rejects.toThrow(/idx_deliveries_order_id_unique/);
    });

    it('enforces valid delivery status by mode (chk_deliveries_mode_status)', async () => {
      const orderId = await createTestOrder('pending');

      // Home delivery allows shipped, out_for_delivery, delivered
      await expect(
        db.query("UPDATE deliveries SET delivery_status = 'shipped' WHERE order_id = $1", [orderId])
      ).resolves.toBeDefined();

      // Home delivery rejects store_pickup statuses like 'ready_for_pickup' or 'collected'
      await expect(
        db.query("UPDATE deliveries SET delivery_status = 'ready_for_pickup' WHERE order_id = $1", [orderId])
      ).rejects.toThrow(/chk_deliveries_mode_status/);

      // Change mode to store_pickup
      await db.query("UPDATE deliveries SET delivery_mode = 'store_pickup', delivery_status = 'pending' WHERE order_id = $1", [orderId]);

      // store_pickup allows ready_for_pickup, collected
      await expect(
        db.query("UPDATE deliveries SET delivery_status = 'ready_for_pickup' WHERE order_id = $1", [orderId])
      ).resolves.toBeDefined();

      // store_pickup rejects out_for_delivery
      await expect(
        db.query("UPDATE deliveries SET delivery_status = 'out_for_delivery' WHERE order_id = $1", [orderId])
      ).rejects.toThrow(/chk_deliveries_mode_status/);
    });

    it('enforces nonnegative unit_price on order_items and amount on payments', async () => {
      const orderId = await createTestOrder('pending');

      // Reject negative unit_price
      await expect(
        db.query(
          `INSERT INTO order_items (order_id, variant_id, quantity, unit_price)
           VALUES ($1, $2, 1, -10.00)`,
          [orderId, testVariantId]
        )
      ).rejects.toThrow(/chk_order_items_unit_price_nonnegative/);

      // Reject negative payment amount
      await expect(
        db.query('UPDATE payments SET amount = -50.00 WHERE order_id = $1', [orderId])
      ).rejects.toThrow(/chk_payments_amount_nonnegative/);
    });

    it('enforces 1:1 payment uniqueness per order (idx_payments_order_id_unique)', async () => {
      const orderId = await createTestOrder('pending');

      // Second payment for same order fails unique constraint
      await expect(
        db.query(
          `INSERT INTO payments (order_id, payment_method, payment_status, amount)
           VALUES ($1, 'cod', 'pending', 50.00)`,
          [orderId]
        )
      ).rejects.toThrow(/idx_payments_order_id_unique/);
    });
  });
});
