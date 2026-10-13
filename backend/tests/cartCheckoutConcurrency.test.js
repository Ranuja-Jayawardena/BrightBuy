process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_1234567890_test';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_1234567890_test';
process.env.FRONTEND_URL = 'http://localhost:3000';

const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/db');
const cartModel = require('../src/models/cartModel');
const orderModel = require('../src/models/orderModel');
const notificationService = require('../src/services/notificationService');
const { signAccessToken } = require('../src/utils/jwt');

jest.setTimeout(30000);

describe('Fix 8.3: Cart Uniqueness & Checkout Concurrency Matrix Tests', () => {
  let customer1Token;
  let customer2Token;
  let staffToken;
  let customer1Id;
  let customer2Id;
  let testVariantId;

  beforeAll(async () => {
    // 1. Fetch 2 distinct customers from DB or insert test fixtures
    const custRes = await db.query('SELECT customer_id, user_id FROM customers ORDER BY customer_id ASC LIMIT 2');
    customer1Id = custRes.rows[0].customer_id;
    customer2Id = custRes.rows[1].customer_id;

    customer1Token = signAccessToken({
      user_id: custRes.rows[0].user_id,
      email: 'cust1@brightbuy.test',
      role: 'customer',
      customer_id: customer1Id,
    });

    customer2Token = signAccessToken({
      user_id: custRes.rows[1].user_id,
      email: 'cust2@brightbuy.test',
      role: 'customer',
      customer_id: customer2Id,
    });

    staffToken = signAccessToken({
      user_id: 999,
      email: 'staff@brightbuy.test',
      role: 'admin',
      employee_id: 10,
    });

    // 2. Fetch an active variant with sufficient stock
    const varRes = await db.query(
      'SELECT variant_id FROM product_variants WHERE is_active = true AND stock_quantity > 20 ORDER BY variant_id ASC LIMIT 1'
    );
    testVariantId = varRes.rows[0].variant_id;
  });

  afterAll(async () => {
    // Cleanup any lingering test idempotency keys
    await db.query("DELETE FROM order_idempotency_keys WHERE idempotency_key LIKE 'test-matrix-%'");
    await db.end();
  });

  describe('1. Cart Uniqueness & Atomic Creation', () => {
    it('Concurrent first cart reads/creates return one cart row and identical cart ID', async () => {
      // Clean customer1 cart first
      await db.query('DELETE FROM carts WHERE customer_id = $1', [customer1Id]);

      // Fire 5 concurrent getOrCreateCart calls
      const results = await Promise.all([
        cartModel.getOrCreateCart(customer1Id),
        cartModel.getOrCreateCart(customer1Id),
        cartModel.getOrCreateCart(customer1Id),
        cartModel.getOrCreateCart(customer1Id),
        cartModel.getOrCreateCart(customer1Id),
      ]);

      const firstId = results[0];
      expect(results.every(id => id === firstId)).toBe(true);

      const dbCheck = await db.query('SELECT COUNT(*) FROM carts WHERE customer_id = $1', [customer1Id]);
      expect(parseInt(dbCheck.rows[0].count)).toBe(1);
    });

    it('Existing item added concurrently twice yields one item and 409 conflict', async () => {
      const cartId = await cartModel.getOrCreateCart(customer1Id);
      await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

      // Execute two simultaneous add requests for same variant
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/cart/items')
          .set('Cookie', [`access_token=${customer1Token}`])
          .set('x-skip-rate-limit', 'true')
          .send({ variant_id: testVariantId, quantity: 1 }),
        request(app)
          .post('/api/cart/items')
          .set('Cookie', [`access_token=${customer1Token}`])
          .set('x-skip-rate-limit', 'true')
          .send({ variant_id: testVariantId, quantity: 1 }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);

      const conflictRes = res1.status === 409 ? res1 : res2;
      expect(conflictRes.body.error).toBe('conflict');

      // Verify only 1 item in cart
      const itemsInCart = await db.query('SELECT * FROM cart_items WHERE cart_id = $1 AND variant_id = $2', [
        cartId,
        testVariantId,
      ]);
      expect(itemsInCart.rows).toHaveLength(1);
      expect(itemsInCart.rows[0].quantity).toBe(1);
    });

    it('Staff accounts are strictly forbidden from modifying shopping carts (403)', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Cookie', [`access_token=${staffToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ variant_id: testVariantId, quantity: 1 });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('forbidden');
    });
  });

  describe('2. Checkout Concurrency & Idempotency Key Replay', () => {
    it('Same request key replay returns original order, HTTP 200, and is_replay flag', async () => {
      const spySendEmail = jest.spyOn(notificationService, 'sendOrderConfirmation');

      // Populate cart
      const cartId = await cartModel.getOrCreateCart(customer1Id);
      await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
      await cartModel.addItemToCart(cartId, testVariantId, 1);

      const idempotencyKey = `test-matrix-key-${Date.now()}`;

      // 1st Checkout with idempotency key
      const res1 = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customer1Token}`])
        .set('X-Idempotency-Key', idempotencyKey)
        .set('x-skip-rate-limit', 'true')
        .send({ delivery_mode: 'store_pickup' });

      expect(res1.status).toBe(201);
      const originalOrderId = res1.body.order.order_id;
      expect(originalOrderId).toBeDefined();

      // Email was triggered for new order
      expect(spySendEmail).toHaveBeenCalledWith(originalOrderId);
      spySendEmail.mockClear();

      // Refill cart with another item
      await cartModel.addItemToCart(cartId, testVariantId, 2);

      // 2nd Checkout replay with identical key and parameters
      const res2 = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customer1Token}`])
        .set('X-Idempotency-Key', idempotencyKey)
        .set('x-skip-rate-limit', 'true')
        .send({ delivery_mode: 'store_pickup' });

      expect(res2.status).toBe(200);
      expect(res2.headers['x-idempotency-replayed']).toBe('true');
      expect(res2.body.is_replay).toBe(true);
      expect(res2.body.order.order_id).toBe(originalOrderId);

      // Crucial: No duplicate order-confirmation email job on replay
      expect(spySendEmail).not.toHaveBeenCalled();

      // Cart refill was untouched!
      const remainingItems = await cartModel.getCartItems(cartId);
      expect(remainingItems.length).toBeGreaterThan(0);
      expect(remainingItems[0].quantity).toBe(2);

      spySendEmail.mockRestore();
    });

    it('Reusing same idempotency key with changed parameters rejects with 409 conflict', async () => {
      const idempotencyKey = `test-matrix-conflict-${Date.now()}`;

      // Set up cart and create initial order
      const cartId = await cartModel.getOrCreateCart(customer1Id);
      await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
      await cartModel.addItemToCart(cartId, testVariantId, 1);

      const res1 = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customer1Token}`])
        .set('X-Idempotency-Key', idempotencyKey)
        .set('x-skip-rate-limit', 'true')
        .send({ delivery_mode: 'store_pickup' });

      expect(res1.status).toBe(201);

      // Attempt to reuse key with changed delivery_mode / address
      const res2 = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customer1Token}`])
        .set('X-Idempotency-Key', idempotencyKey)
        .set('x-skip-rate-limit', 'true')
        .send({ address_id: 1, delivery_mode: 'home_delivery' });

      expect(res2.status).toBe(409);
      expect(res2.body.error).toBe('conflict');
      expect(res2.body.message).toContain('different request parameters');
    });

    it('Idempotency keys are strictly bound to customer (Customer 2 cannot replay Customer 1 key)', async () => {
      const idempotencyKey = `test-matrix-cross-${Date.now()}`;

      // Customer 1 places order with key
      const cart1 = await cartModel.getOrCreateCart(customer1Id);
      await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cart1]);
      await cartModel.addItemToCart(cart1, testVariantId, 1);

      const res1 = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customer1Token}`])
        .set('X-Idempotency-Key', idempotencyKey)
        .set('x-skip-rate-limit', 'true')
        .send({ delivery_mode: 'store_pickup' });
      expect(res1.status).toBe(201);

      // Customer 2 uses the exact same key string: Customer 2 has their own cart and order, isolated!
      const cart2 = await cartModel.getOrCreateCart(customer2Id);
      await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cart2]);
      await cartModel.addItemToCart(cart2, testVariantId, 1);

      const res2 = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customer2Token}`])
        .set('X-Idempotency-Key', idempotencyKey)
        .set('x-skip-rate-limit', 'true')
        .send({ delivery_mode: 'store_pickup' });

      expect(res2.status).toBe(201);
      expect(res2.body.order.order_id).not.toBe(res1.body.order.order_id);
    });

    it('Concurrent double checkout on same cart creates exactly one order and prevents double deduction', async () => {
      const cartId = await cartModel.getOrCreateCart(customer1Id);
      await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
      await cartModel.addItemToCart(cartId, testVariantId, 2);

      const initialStockRes = await db.query('SELECT stock_quantity FROM product_variants WHERE variant_id = $1', [
        testVariantId,
      ]);
      const initialStock = initialStockRes.rows[0].stock_quantity;

      // Two simultaneous checkouts without idempotency key
      const [order1, order2] = await Promise.all([
        request(app)
          .post('/api/orders')
          .set('Cookie', [`access_token=${customer1Token}`])
          .set('x-skip-rate-limit', 'true')
          .send({ delivery_mode: 'store_pickup' }),
        request(app)
          .post('/api/orders')
          .set('Cookie', [`access_token=${customer1Token}`])
          .set('x-skip-rate-limit', 'true')
          .send({ delivery_mode: 'store_pickup' }),
      ]);

      const statuses = [order1.status, order2.status].sort();
      expect(statuses).toEqual([201, 400]);

      const failedRes = order1.status === 400 ? order1 : order2;
      expect(failedRes.body.error).toBe('cart_empty');

      // Verify stock was deducted exactly once (by 2 units)
      const finalStockRes = await db.query('SELECT stock_quantity FROM product_variants WHERE variant_id = $1', [
        testVariantId,
      ]);
      expect(finalStockRes.rows[0].stock_quantity).toBe(initialStock - 2);
    });
  });
});
