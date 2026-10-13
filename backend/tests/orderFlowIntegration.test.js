process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_1234567890_test';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_1234567890_test';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.LEMON_SQUEEZY_WEBHOOK_SECRET = 'test_webhook_secret_key_12345';

const request = require('supertest');
const crypto = require('crypto');
const db = require('../src/config/db');
const { signAccessToken } = require('../src/utils/jwt');

// Mock db
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
}));

// Mock models and services where appropriate
jest.mock('../src/models/cartModel', () => ({
  getOrCreateCart: jest.fn(),
  getCartItems: jest.fn(),
  getVariantInfo: jest.fn(),
  checkItemInCart: jest.fn(),
  addItemToCart: jest.fn(),
  updateCartItemQuantity: jest.fn(),
  removeCartItem: jest.fn(),
  getCartItemDetails: jest.fn(),
}));

jest.mock('../src/models/addressModel', () => ({
  getAddresses: jest.fn(),
  getAddressByIdAndCustomer: jest.fn(),
  addAddress: jest.fn(),
  updateAddress: jest.fn(),
  removeAddress: jest.fn(),
  setDefaultAddress: jest.fn(),
}));

jest.mock('../src/models/orderModel', () => ({
  createOrder: jest.fn(),
  getOrders: jest.fn(),
  getOrderById: jest.fn(),
}));

jest.mock('../src/models/adminOrderModel', () => ({
  findOrders: jest.fn(),
  findOrderById: jest.fn(),
  updateOrderStatus: jest.fn(),
  updateDeliveryStatus: jest.fn(),
}));

jest.mock('../src/services/notificationService', () => ({
  sendOrderConfirmation: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
  sendPaymentConfirmation: jest.fn().mockResolvedValue({ messageId: 'msg-2' }),
  sendDeliveryStatusUpdate: jest.fn().mockResolvedValue({ messageId: 'msg-3' }),
  onDeliveryStatusChanged: jest.fn().mockResolvedValue({ messageId: 'msg-4' }),
}));

const cartModel = require('../src/models/cartModel');
const addressModel = require('../src/models/addressModel');
const orderModel = require('../src/models/orderModel');
const adminOrderModel = require('../src/models/adminOrderModel');
const notificationService = require('../src/services/notificationService');
const { handlePaymentSuccess } = require('../src/services/paymentService');

const app = require('../src/index');

describe('Order & Checkout Backend Validation, Integration & Error Format Tests', () => {
  let customerToken;
  let adminToken;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();

    customerToken = signAccessToken({ user_id: 1, role: 'customer' });
    adminToken = signAccessToken({ user_id: 2, role: 'admin' });

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    db.connect.mockResolvedValue(mockClient);

    // Default DB mock for requireAuth customer/admin lookup
    db.query.mockImplementation(async (sql, params) => {
      if (typeof sql === 'string' && sql.includes('SELECT customer_id FROM customers')) {
        return { rows: [{ customer_id: 10 }] };
      }
      if (typeof sql === 'string' && sql.includes('SELECT employee_id FROM employees')) {
        return { rows: [{ employee_id: 5 }] };
      }
      return { rows: [] };
    });
  });

  // Shared validation helper for Phase 10 Error Response Shape: { error, message, statusCode }
  function assertStandardError(res, expectedStatus, expectedErrorCode) {
    expect(res.status).toBe(expectedStatus);
    expect(res.body).toEqual({
      error: expectedErrorCode || expect.any(String),
      message: expect.any(String),
      statusCode: expectedStatus,
    });
  }

  describe('1. Cart Endpoint Validation & Error Responses', () => {
    it('GET /api/cart returns 200 with formatted cart data', async () => {
      cartModel.getOrCreateCart.mockResolvedValue(101);
      cartModel.getCartItems.mockResolvedValue([
        {
          cart_item_id: 1,
          variant_id: 2,
          price: '29.99',
          quantity: 2,
          subtotal: '59.98',
          product_name: 'Shirt',
          variant_name: 'Blue',
          primary_image_id: 12,
        },
      ]);

      const res = await request(app)
        .get('/api/cart')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.cart).toEqual({
        cart_id: 101,
        items: [
          expect.objectContaining({
            cart_item_id: 1,
            price: 29.99,
            subtotal: 59.98,
            primary_image_id: 12,
          }),
        ],
        total: 59.98,
      });
    });

    it('POST /api/cart/items rejects invalid variant_id and quantity with standard error', async () => {
      // Missing variant_id
      let res = await request(app)
        .post('/api/cart/items')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ quantity: 2 });
      assertStandardError(res, 400, 'invalid_request');
      expect(res.body.message).toContain('variant_id must be a positive integer');

      // Negative quantity
      res = await request(app)
        .post('/api/cart/items')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ variant_id: 5, quantity: -1 });
      assertStandardError(res, 400, 'invalid_request');
      expect(res.body.message).toContain('quantity must be a positive integer');

      // String/float quantity
      res = await request(app)
        .post('/api/cart/items')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ variant_id: 5, quantity: 'abc' });
      assertStandardError(res, 400, 'invalid_request');
    });

    it('POST /api/cart/items rejects nonexistent or inactive variant', async () => {
      cartModel.getVariantInfo.mockResolvedValueOnce(null);
      let res = await request(app)
        .post('/api/cart/items')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ variant_id: 99, quantity: 1 });
      assertStandardError(res, 404, 'not_found');

      cartModel.getVariantInfo.mockResolvedValueOnce({ is_active: false, stock_quantity: 10 });
      res = await request(app)
        .post('/api/cart/items')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ variant_id: 10, quantity: 1 });
      assertStandardError(res, 400, 'invalid_request');
      expect(res.body.message).toContain('inactive');
    });

    it('POST /api/cart/items rejects insufficient stock and duplicate item conflict', async () => {
      // Insufficient stock
      cartModel.getVariantInfo.mockResolvedValueOnce({ is_active: true, stock_quantity: 3 });
      let res = await request(app)
        .post('/api/cart/items')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ variant_id: 10, quantity: 5 });
      assertStandardError(res, 400, 'insufficient_stock');

      // Duplicate item conflict (409)
      cartModel.getVariantInfo.mockResolvedValueOnce({ is_active: true, stock_quantity: 10 });
      cartModel.getOrCreateCart.mockResolvedValueOnce(101);
      cartModel.checkItemInCart.mockResolvedValueOnce({ cart_item_id: 5 });
      res = await request(app)
        .post('/api/cart/items')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ variant_id: 10, quantity: 2 });
      assertStandardError(res, 409, 'conflict');
    });

    it('POST /api/cart/items adds item successfully (happy path)', async () => {
      cartModel.getVariantInfo.mockResolvedValueOnce({ is_active: true, stock_quantity: 10 });
      cartModel.getOrCreateCart.mockResolvedValueOnce(101);
      cartModel.checkItemInCart.mockResolvedValueOnce(null);
      cartModel.addItemToCart.mockResolvedValueOnce({ cart_item_id: 15, variant_id: 10, quantity: 2 });

      const res = await request(app)
        .post('/api/cart/items')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ variant_id: 10, quantity: 2 });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Item added to cart');
      expect(res.body.cart_item).toEqual({ cart_item_id: 15, variant_id: 10, quantity: 2 });
    });

    it('PUT /api/cart/items/:id validates params, stock, and authorization', async () => {
      // Invalid id param
      let res = await request(app)
        .put('/api/cart/items/invalid')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ quantity: 2 });
      assertStandardError(res, 400, 'invalid_request');

      // Not found
      cartModel.getCartItemDetails.mockResolvedValueOnce(null);
      res = await request(app)
        .put('/api/cart/items/99')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ quantity: 2 });
      assertStandardError(res, 404, 'not_found');

      // Belongs to another cart (403)
      cartModel.getCartItemDetails.mockResolvedValueOnce({ cart_id: 999, variant_id: 10 });
      cartModel.getOrCreateCart.mockResolvedValueOnce(101);
      res = await request(app)
        .put('/api/cart/items/1')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ quantity: 2 });
      assertStandardError(res, 403, 'forbidden');

      // Happy path update
      cartModel.getCartItemDetails.mockResolvedValueOnce({ cart_id: 101, variant_id: 10 });
      cartModel.getOrCreateCart.mockResolvedValueOnce(101);
      cartModel.getVariantInfo.mockResolvedValueOnce({ is_active: true, stock_quantity: 10 });
      cartModel.updateCartItemQuantity.mockResolvedValueOnce({ cart_item_id: 1, quantity: 4 });

      res = await request(app)
        .put('/api/cart/items/1')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ quantity: 4 });
      expect(res.status).toBe(200);
      expect(res.body.cart_item.quantity).toBe(4);
    });

    it('DELETE /api/cart/items/:id validates params and deletes item', async () => {
      // Not found
      cartModel.getCartItemDetails.mockResolvedValueOnce(null);
      let res = await request(app)
        .delete('/api/cart/items/55')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true');
      assertStandardError(res, 404, 'not_found');

      // Happy path
      cartModel.getCartItemDetails.mockResolvedValueOnce({ cart_id: 101 });
      cartModel.getOrCreateCart.mockResolvedValueOnce(101);
      cartModel.removeCartItem.mockResolvedValueOnce();

      res = await request(app)
        .delete('/api/cart/items/55')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true');
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Item removed from cart');
    });
  });

  describe('2. Address & City Endpoint Validation', () => {
    it('GET /api/cities returns list of cities', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{ city_id: 1, city_name: 'Colombo', is_main_city: true }],
      });

      const res = await request(app)
        .get('/api/cities')
        .set('x-skip-rate-limit', 'true');
      expect(res.status).toBe(200);
      expect(res.body.cities).toHaveLength(1);
    });

    it('POST /api/addresses validates required fields, types, and DB city existence', async () => {
      // Missing address_line1
      let res = await request(app)
        .post('/api/addresses')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ city_id: 1, zip_code: '10000' });
      assertStandardError(res, 400, 'invalid_request');
      expect(res.body.message).toContain('address_line1');

      // Invalid city_id
      res = await request(app)
        .post('/api/addresses')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ address_line1: '123 Main', city_id: 'abc', zip_code: '10000' });
      assertStandardError(res, 400, 'invalid_request');
      expect(res.body.message).toContain('city_id');

      // City does not exist in DB
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('SELECT customer_id FROM customers')) {
          return { rows: [{ customer_id: 10 }] };
        }
        if (typeof sql === 'string' && sql.includes('SELECT city_id FROM cities')) {
          return { rows: [] }; // City not found
        }
        return { rows: [] };
      });

      res = await request(app)
        .post('/api/addresses')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ address_line1: '123 Main', city_id: 999, zip_code: '10000' });
      assertStandardError(res, 400, 'invalid_request');
      expect(res.body.message).toContain('Invalid city_id');

      // Happy path
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('SELECT customer_id FROM customers')) {
          return { rows: [{ customer_id: 10 }] };
        }
        if (typeof sql === 'string' && sql.includes('SELECT city_id FROM cities')) {
          return { rows: [{ city_id: 1 }] };
        }
        return { rows: [] };
      });
      addressModel.addAddress.mockResolvedValueOnce({
        address_id: 1,
        address_line1: '123 Main',
        city_id: 1,
        zip_code: '10000',
      });

      res = await request(app)
        .post('/api/addresses')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ address_line1: '123 Main', city_id: 1, zip_code: '10000' });
      expect(res.status).toBe(201);
      expect(res.body.address.address_id).toBe(1);
    });

    it('PUT /api/addresses/:id validates parameters and missing records', async () => {
      // Invalid id param
      let res = await request(app)
        .put('/api/addresses/invalid')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ address_line1: 'New St' });
      assertStandardError(res, 400, 'invalid_request');

      // Address not found or unauthorized
      addressModel.getAddressByIdAndCustomer.mockResolvedValueOnce(null);
      res = await request(app)
        .put('/api/addresses/99')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ address_line1: 'New St' });
      assertStandardError(res, 404, 'not_found');

      // Empty update body
      addressModel.getAddressByIdAndCustomer.mockResolvedValueOnce({ address_id: 1 });
      res = await request(app)
        .put('/api/addresses/1')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({});
      assertStandardError(res, 400, 'invalid_request');
      expect(res.body.message).toContain('At least one field');
    });
  });

  describe('3. Order Placement & Detail Validation', () => {
    it('POST /api/orders validates address_id and delivery_mode', async () => {
      // Missing address_id
      let res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ delivery_mode: 'home_delivery' });
      assertStandardError(res, 400, 'invalid_request');
      expect(res.body.message).toContain('address_id');

      // Invalid delivery mode
      res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ address_id: 1, delivery_mode: 'drone' });
      assertStandardError(res, 400, 'invalid_request');
      expect(res.body.message).toContain('Valid delivery_mode');
    });

    it('POST /api/orders allows store_pickup without address_id', async () => {
      orderModel.createOrder.mockResolvedValueOnce({
        order_id: 1005,
        total_amount: 96.00,
        status: 'pending',
        delivery: {
          delivery_mode: 'store_pickup',
          delivery_address_line1: 'BrightBuy Central Retail Store & Pickup Gate',
          estimated_delivery_days: 2
        }
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ delivery_mode: 'store_pickup' });

      expect(res.status).toBe(201);
      expect(res.body.order.order_id).toBe(1005);
      expect(orderModel.createOrder).toHaveBeenCalledWith(expect.any(Number), null, 'store_pickup');
    });

    it('POST /api/orders formats business logic errors to shared error shape', async () => {
      // Empty cart
      orderModel.createOrder.mockRejectedValueOnce(new Error('Cart is empty'));
      let res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ address_id: 1, delivery_mode: 'home_delivery' });
      assertStandardError(res, 400, 'cart_empty');

      // Insufficient stock
      orderModel.createOrder.mockRejectedValueOnce(new Error('Insufficient stock for: Sneaker'));
      res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ address_id: 1, delivery_mode: 'home_delivery' });
      assertStandardError(res, 400, 'insufficient_stock');

      // Invalid address
      orderModel.createOrder.mockRejectedValueOnce(new Error('Address not found or does not belong to customer'));
      res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ address_id: 99, delivery_mode: 'home_delivery' });
      assertStandardError(res, 400, 'invalid_address');
    });

    it('GET /api/orders/:id validates id parameter and missing order', async () => {
      let res = await request(app)
        .get('/api/orders/abc')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true');
      assertStandardError(res, 400, 'invalid_request');

      orderModel.getOrderById.mockResolvedValueOnce(null);
      res = await request(app)
        .get('/api/orders/999')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true');
      assertStandardError(res, 404, 'not_found');
    });
  });

  describe('4. Payment Sessions Validation & Flow (Card & COD)', () => {
    it('POST /api/payments/create-session validates order_id and payment_method', async () => {
      // Missing order_id
      let res = await request(app)
        .post('/api/payments/create-session')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ payment_method: 'card' });
      assertStandardError(res, 400, 'invalid_request');

      // Invalid payment method
      res = await request(app)
        .post('/api/payments/create-session')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ order_id: 1, payment_method: 'crypto' });
      assertStandardError(res, 400, 'invalid_request');
      expect(res.body.message).toContain('card or cod');
    });

    it('POST /api/payments/create-session rejects non-existent order or order already paid', async () => {
      // Order not found
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('SELECT customer_id FROM customers')) {
          return { rows: [{ customer_id: 10 }] };
        }
        if (typeof sql === 'string' && sql.includes('SELECT order_id, status, total_amount FROM orders')) {
          return { rows: [] }; // Not found
        }
        return { rows: [] };
      });

      let res = await request(app)
        .post('/api/payments/create-session')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ order_id: 99, payment_method: 'cod' });
      assertStandardError(res, 404, 'not_found');

      // Order already paid
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('SELECT customer_id FROM customers')) {
          return { rows: [{ customer_id: 10 }] };
        }
        if (typeof sql === 'string' && sql.includes('SELECT order_id, status, total_amount FROM orders')) {
          return { rows: [{ order_id: 1, status: 'paid', total_amount: '100.00' }] };
        }
        return { rows: [] };
      });

      res = await request(app)
        .post('/api/payments/create-session')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ order_id: 1, payment_method: 'cod' });
      assertStandardError(res, 400, 'invalid_order_status');
    });

    it('POST /api/payments/create-session supports COD flow', async () => {
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('SELECT customer_id FROM customers')) {
          return { rows: [{ customer_id: 10 }] };
        }
        if (typeof sql === 'string' && sql.includes('SELECT order_id, status, total_amount FROM orders')) {
          return { rows: [{ order_id: 5, status: 'pending', total_amount: '120.00' }] };
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO payments')) {
          return { rows: [{ payment_id: 88 }] };
        }
        return { rows: [] };
      });

      const res = await request(app)
        .post('/api/payments/create-session')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ order_id: 5, payment_method: 'cod' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'COD order confirmed',
        payment_id: 88,
      });
    });

    it('POST /api/payments/create-session supports Card flow with checkout url', async () => {
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('SELECT customer_id FROM customers')) {
          return { rows: [{ customer_id: 10 }] };
        }
        if (typeof sql === 'string' && sql.includes('SELECT order_id, status, total_amount FROM orders')) {
          return { rows: [{ order_id: 6, status: 'pending', total_amount: '200.00' }] };
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO payments')) {
          return { rows: [{ payment_id: 89 }] };
        }
        return { rows: [] };
      });

      const res = await request(app)
        .post('/api/payments/create-session')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ order_id: 6, payment_method: 'card' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        checkout_url: expect.any(String),
        payment_id: 89,
      });
    });
  });

  describe('5. Full End-to-End Cart -> Order -> Payment Flows', () => {
    it('Full Flow (COD): Add item -> Place Order -> Create COD session', async () => {
      // Step 1: Add to Cart
      cartModel.getVariantInfo.mockResolvedValueOnce({ is_active: true, stock_quantity: 20 });
      cartModel.getOrCreateCart.mockResolvedValueOnce(101);
      cartModel.checkItemInCart.mockResolvedValueOnce(null);
      cartModel.addItemToCart.mockResolvedValueOnce({ cart_item_id: 1, variant_id: 5, quantity: 2 });

      const cartRes = await request(app)
        .post('/api/cart/items')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ variant_id: 5, quantity: 2 });
      expect(cartRes.status).toBe(201);

      // Step 2: Place Order
      orderModel.createOrder.mockResolvedValueOnce({
        order_id: 1001,
        total_amount: 150.00,
        status: 'pending',
        delivery: { delivery_id: 501, estimated_delivery_days: 5 },
      });

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ address_id: 1, delivery_mode: 'home_delivery' });
      expect(orderRes.status).toBe(201);
      expect(orderRes.body.order.order_id).toBe(1001);

      // Step 3: Create COD Payment Session
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('SELECT customer_id FROM customers')) {
          return { rows: [{ customer_id: 10 }] };
        }
        if (typeof sql === 'string' && sql.includes('SELECT order_id, status, total_amount FROM orders')) {
          return { rows: [{ order_id: 1001, status: 'pending', total_amount: '150.00' }] };
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO payments')) {
          return { rows: [{ payment_id: 999 }] };
        }
        return { rows: [] };
      });

      const payRes = await request(app)
        .post('/api/payments/create-session')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ order_id: 1001, payment_method: 'cod' });
      expect(payRes.status).toBe(200);
      expect(payRes.body.message).toBe('COD order confirmed');
    });

    it('Full Flow (Card): Add item -> Place Order -> Create Card session -> Webhook Payment Success', async () => {
      // Step 1: Place Order
      orderModel.createOrder.mockResolvedValueOnce({
        order_id: 1002,
        total_amount: 250.00,
        status: 'pending',
      });

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ address_id: 2, delivery_mode: 'home_delivery' });
      expect(orderRes.status).toBe(201);

      // Step 2: Create Card Session
      db.query.mockImplementation(async (sql) => {
        if (typeof sql === 'string' && sql.includes('SELECT customer_id FROM customers')) {
          return { rows: [{ customer_id: 10 }] };
        }
        if (typeof sql === 'string' && sql.includes('SELECT order_id, status, total_amount FROM orders')) {
          return { rows: [{ order_id: 1002, status: 'pending', total_amount: '250.00' }] };
        }
        if (typeof sql === 'string' && sql.includes('INSERT INTO payments')) {
          return { rows: [{ payment_id: 1000 }] };
        }
        return { rows: [] };
      });

      const payRes = await request(app)
        .post('/api/payments/create-session')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ order_id: 1002, payment_method: 'card' });
      expect(payRes.status).toBe(200);
      expect(payRes.body.checkout_url).toBeDefined();

      // Step 3: Webhook event for payment success
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ status: 'pending' }] }) // SELECT status
        .mockResolvedValueOnce({}) // UPDATE orders
        .mockResolvedValueOnce({}) // UPDATE payments
        .mockResolvedValueOnce({}); // COMMIT

      const rawPayload = JSON.stringify({
        meta: { event_name: 'order_created', webhook_id: 'whk_test_1002' },
        data: {
          id: 'txn_ls_1002',
          attributes: {
            status: 'paid',
            total: 25000,
            custom_data: { order_id: '1002' },
          },
        },
      });

      const signature = crypto
        .createHmac('sha256', process.env.LEMON_SQUEEZY_WEBHOOK_SECRET)
        .update(rawPayload)
        .digest('hex');

      const webhookRes = await request(app)
        .post('/api/webhooks/lemonsqueezy')
        .set('X-Signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawPayload);

      expect(webhookRes.status).toBe(200);
      expect(webhookRes.body.received).toBe(true);
    });
  });

  describe('6. Email Triggers on Order & Payment Events', () => {
    it('triggers sendOrderConfirmation when order is created successfully', async () => {
      orderModel.createOrder.mockResolvedValueOnce({
        order_id: 777,
        total_amount: 100,
        status: 'pending',
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ address_id: 1, delivery_mode: 'home_delivery' });

      expect(res.status).toBe(201);
      expect(notificationService.sendOrderConfirmation).toHaveBeenCalledWith(777);
    });

    it('order creation succeeds even if email service throws an error (non-blocking)', async () => {
      notificationService.sendOrderConfirmation.mockRejectedValueOnce(new Error('SMTP Offline'));

      orderModel.createOrder.mockResolvedValueOnce({
        order_id: 778,
        total_amount: 100,
        status: 'pending',
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ address_id: 1, delivery_mode: 'home_delivery' });

      expect(res.status).toBe(201);
      expect(res.body.order.order_id).toBe(778);
    });

    it('triggers sendPaymentConfirmation when payment succeeds', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ status: 'pending' }] }) // order check
        .mockResolvedValueOnce({}) // UPDATE orders
        .mockResolvedValueOnce({}) // UPDATE payments
        .mockResolvedValueOnce({}); // COMMIT

      await handlePaymentSuccess({
        order_id: '888',
        transaction_id: 'txn_888',
        amount: 5000,
        _raw_event: {},
      });

      expect(notificationService.sendPaymentConfirmation).toHaveBeenCalledWith({
        order_id: '888',
        transaction_id: 'txn_888',
        amount: 5000,
      });
    });

    it('triggers onDeliveryStatusChanged when admin updates delivery status', async () => {
      adminOrderModel.updateDeliveryStatus.mockResolvedValueOnce({
        delivery_id: 44,
        order_id: 888,
        delivery_status: 'shipped',
        tracking_number: 'TRK-999',
      });

      const res = await request(app)
        .put('/api/admin/deliveries/44/status')
        .set('Cookie', [`access_token=${adminToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ delivery_status: 'shipped', tracking_number: 'TRK-999' });

      expect(res.status).toBe(200);
      expect(notificationService.onDeliveryStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          delivery_id: 44,
          delivery_status: 'shipped',
          tracking_number: 'TRK-999',
        })
      );
    });
  });
});
