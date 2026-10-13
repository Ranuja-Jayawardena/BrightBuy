process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_1234567890_test';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_1234567890_test';
process.env.FRONTEND_URL = 'http://localhost:3000';

const request = require('supertest');
const db = require('../src/config/db');
const { signAccessToken } = require('../src/utils/jwt');

jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
}));

jest.mock('../src/models/cartModel', () => ({
  getOrCreateCart: jest.fn(),
  getCartItems: jest.fn(),
  getVariantInfo: jest.fn(),
  checkItemInCart: jest.fn(),
  addItemToCart: jest.fn(),
  getCartItemDetails: jest.fn(),
  updateCartItemQuantity: jest.fn(),
  removeCartItem: jest.fn(),
}));

jest.mock('../src/models/adminOrderModel', () => ({
  findOrders: jest.fn(),
  findOrderById: jest.fn(),
  findDeliveryById: jest.fn(),
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
const adminOrderModel = require('../src/models/adminOrderModel');
const adminOrderService = require('../src/services/adminOrderService');
const app = require('../src/index');

describe('Member D Fixes: Fix 4.1 (Cart Staff Guard) & Fix 4.3 (Order Delivery Mode Fulfillment)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fix 4.1: Staff Cart & Purchase Policy Enforcement', () => {
    const adminToken = signAccessToken({ user_id: 2, role: 'admin' });
    const customerToken = signAccessToken({ user_id: 1, role: 'customer' });

    beforeEach(() => {
      // Mock requireAuth queries
      db.query.mockImplementation((sql, params) => {
        if (sql.includes('FROM employees')) {
          return Promise.resolve({
            rows: [{ employee_id: 1, role: 'super_admin', is_active: true }],
          });
        }
        if (sql.includes('FROM customers')) {
          return Promise.resolve({
            rows: [{ customer_id: 10 }],
          });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    it('rejects GET /api/cart for staff with 403 Forbidden and expected message', async () => {
      const res = await request(app)
        .get('/api/cart')
        .set('Cookie', [`access_token=${adminToken}`])
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'forbidden',
        message: 'Administrative and staff accounts cannot create or modify shopping carts',
        statusCode: 403,
      });
    });

    it('rejects POST /api/cart/items for staff with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Cookie', [`access_token=${adminToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ variant_id: 1, quantity: 2 });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'forbidden',
        message: 'Administrative and staff accounts cannot create or modify shopping carts',
        statusCode: 403,
      });
    });

    it('rejects PUT /api/cart/items/:id for staff with 403 Forbidden', async () => {
      const res = await request(app)
        .put('/api/cart/items/5')
        .set('Cookie', [`access_token=${adminToken}`])
        .set('x-skip-rate-limit', 'true')
        .send({ quantity: 3 });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'forbidden',
        message: 'Administrative and staff accounts cannot create or modify shopping carts',
        statusCode: 403,
      });
    });

    it('rejects DELETE /api/cart/items/:id for staff with 403 Forbidden', async () => {
      const res = await request(app)
        .delete('/api/cart/items/5')
        .set('Cookie', [`access_token=${adminToken}`])
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'forbidden',
        message: 'Administrative and staff accounts cannot create or modify shopping carts',
        statusCode: 403,
      });
    });

    it('allows customer access to GET /api/cart', async () => {
      cartModel.getOrCreateCart.mockResolvedValueOnce(50);
      cartModel.getCartItems.mockResolvedValueOnce([]);

      const res = await request(app)
        .get('/api/cart')
        .set('Cookie', [`access_token=${customerToken}`])
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(200);
      expect(res.body.cart).toBeDefined();
      expect(res.body.cart.cart_id).toBe(50);
    });
  });

  describe('Fix 4.3: Order Fulfillment: Courier Tracking vs. Store Pickup', () => {
    const adminToken = signAccessToken({ user_id: 2, role: 'admin' });

    beforeEach(() => {
      db.query.mockImplementation((sql) => {
        if (sql.includes('FROM employees')) {
          return Promise.resolve({
            rows: [{ employee_id: 1, role: 'super_admin', is_active: true }],
          });
        }
        return Promise.resolve({ rows: [] });
      });
    });

    describe('adminOrderService.updateDelivery logic', () => {
      it('allows ready_for_pickup and collected for store_pickup without tracking number', async () => {
        adminOrderModel.findDeliveryById.mockResolvedValue({
          delivery_id: 10,
          order_id: 100,
          delivery_mode: 'store_pickup',
          delivery_status: 'processing',
          tracking_number: null,
        });

        adminOrderModel.updateDeliveryStatus.mockResolvedValueOnce({
          delivery_id: 10,
          order_id: 100,
          delivery_mode: 'store_pickup',
          delivery_status: 'ready_for_pickup',
          tracking_number: null,
        });

        const result1 = await adminOrderService.updateDelivery(10, {
          delivery_status: 'ready_for_pickup',
        });
        expect(result1.delivery_status).toBe('ready_for_pickup');

        adminOrderModel.updateDeliveryStatus.mockResolvedValueOnce({
          delivery_id: 10,
          order_id: 100,
          delivery_mode: 'store_pickup',
          delivery_status: 'collected',
          tracking_number: null,
        });

        const result2 = await adminOrderService.updateDelivery(10, {
          delivery_status: 'collected',
        });
        expect(result2.delivery_status).toBe('collected');
      });

      it('rejects courier statuses (shipped, out_for_delivery) on store_pickup orders', async () => {
        adminOrderModel.findDeliveryById.mockResolvedValue({
          delivery_id: 10,
          order_id: 100,
          delivery_mode: 'store_pickup',
          delivery_status: 'processing',
        });

        await expect(
          adminOrderService.updateDelivery(10, { delivery_status: 'shipped' })
        ).rejects.toThrow('Invalid delivery status for store pickup');

        await expect(
          adminOrderService.updateDelivery(10, { delivery_status: 'out_for_delivery' })
        ).rejects.toThrow('Invalid delivery status for store pickup');
      });

      it('requires tracking number when transitioning home_delivery to shipped', async () => {
        adminOrderModel.findDeliveryById.mockResolvedValue({
          delivery_id: 20,
          order_id: 200,
          delivery_mode: 'home_delivery',
          delivery_status: 'processing',
          tracking_number: null,
        });

        await expect(
          adminOrderService.updateDelivery(20, { delivery_status: 'shipped' })
        ).rejects.toThrow('Tracking number is required when shipping home delivery orders');

        await expect(
          adminOrderService.updateDelivery(20, { delivery_status: 'shipped', tracking_number: '   ' })
        ).rejects.toThrow('Tracking number is required when shipping home delivery orders');
      });

      it('allows transitioning home_delivery to shipped when tracking number is provided', async () => {
        adminOrderModel.findDeliveryById.mockResolvedValue({
          delivery_id: 20,
          order_id: 200,
          delivery_mode: 'home_delivery',
          delivery_status: 'processing',
          tracking_number: null,
        });

        adminOrderModel.updateDeliveryStatus.mockResolvedValueOnce({
          delivery_id: 20,
          order_id: 200,
          delivery_mode: 'home_delivery',
          delivery_status: 'shipped',
          tracking_number: 'TRK-123456',
        });

        const result = await adminOrderService.updateDelivery(20, {
          delivery_status: 'shipped',
          tracking_number: 'TRK-123456',
        });

        expect(result.delivery_status).toBe('shipped');
        expect(result.tracking_number).toBe('TRK-123456');
      });

      it('rejects store pickup statuses (ready_for_pickup, collected) on home_delivery orders', async () => {
        adminOrderModel.findDeliveryById.mockResolvedValue({
          delivery_id: 20,
          order_id: 200,
          delivery_mode: 'home_delivery',
          delivery_status: 'processing',
        });

        await expect(
          adminOrderService.updateDelivery(20, { delivery_status: 'ready_for_pickup' })
        ).rejects.toThrow('Invalid delivery status for home delivery');

        await expect(
          adminOrderService.updateDelivery(20, { delivery_status: 'collected' })
        ).rejects.toThrow('Invalid delivery status for home delivery');
      });
    });

    describe('Admin Order Endpoints delivery_mode output', () => {
      it('GET /api/admin/orders includes delivery_mode for all orders', async () => {
        adminOrderModel.findOrders.mockResolvedValueOnce({
          rows: [
            {
              order_id: 1,
              order_date: '2026-10-10',
              status: 'pending',
              total_amount: 100,
              customer_id: 1,
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@example.com',
              delivery_mode: 'store_pickup',
              item_count: 2,
            },
            {
              order_id: 2,
              order_date: '2026-10-09',
              status: 'shipped',
              total_amount: 250,
              customer_id: 2,
              first_name: 'Jane',
              last_name: 'Smith',
              email: 'jane@example.com',
              delivery_mode: 'home_delivery',
              item_count: 4,
            },
          ],
          total: 2,
        });

        const res = await request(app)
          .get('/api/admin/orders')
          .set('Cookie', [`access_token=${adminToken}`])
          .set('x-skip-rate-limit', 'true');

        expect(res.status).toBe(200);
        expect(res.body.orders[0].delivery_mode).toBe('store_pickup');
        expect(res.body.orders[1].delivery_mode).toBe('home_delivery');
      });

      it('GET /api/admin/orders/:id clearly returns delivery_mode in order summary and details', async () => {
        adminOrderModel.findOrderById.mockResolvedValueOnce({
          order_id: 10,
          order_date: '2026-10-10',
          status: 'paid',
          total_amount: 150,
          customer_id: 5,
          first_name: 'Alice',
          last_name: 'Brown',
          email: 'alice@example.com',
          delivery_mode: 'store_pickup',
          items: [],
          payment: { payment_id: 1, payment_method: 'card', payment_status: 'completed' },
          delivery: {
            delivery_id: 12,
            order_id: 10,
            delivery_mode: 'store_pickup',
            delivery_status: 'ready_for_pickup',
          },
        });

        const res = await request(app)
          .get('/api/admin/orders/10')
          .set('Cookie', [`access_token=${adminToken}`])
          .set('x-skip-rate-limit', 'true');

        expect(res.status).toBe(200);
        expect(res.body.order.delivery_mode).toBe('store_pickup');
        expect(res.body.order.delivery.delivery_mode).toBe('store_pickup');
      });

      it('PUT /api/admin/deliveries/:id/status updates delivery and returns updated delivery record', async () => {
        adminOrderModel.findDeliveryById.mockResolvedValueOnce({
          delivery_id: 15,
          order_id: 105,
          delivery_mode: 'store_pickup',
          delivery_status: 'processing',
        });

        adminOrderModel.updateDeliveryStatus.mockResolvedValueOnce({
          delivery_id: 15,
          order_id: 105,
          delivery_mode: 'store_pickup',
          delivery_status: 'ready_for_pickup',
          tracking_number: null,
        });

        const res = await request(app)
          .put('/api/admin/deliveries/15/status')
          .set('Cookie', [`access_token=${adminToken}`])
          .set('x-skip-rate-limit', 'true')
          .send({ delivery_status: 'ready_for_pickup' });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Delivery status updated');
        expect(res.body.delivery.delivery_status).toBe('ready_for_pickup');
        expect(res.body.delivery.delivery_mode).toBe('store_pickup');
      });
    });
  });
});
