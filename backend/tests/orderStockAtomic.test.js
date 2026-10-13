process.env.NODE_ENV = 'test';

const db = require('../src/config/db');

// Mock database pool
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
}));

const orderModel = require('../src/models/orderModel');

describe('Order Placement & Atomic Stock Deduction Logic (Unit Tests)', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    db.connect.mockResolvedValue(mockClient);
  });

  describe('orderModel.createOrder - Happy Path & Business Logic', () => {
    it('should atomically deduct stock, create delivery with 5-day ETA for main city, and clear cart', async () => {
      // 1. Get cart
      mockClient.query.mockResolvedValueOnce({ rows: [{ cart_id: 10 }] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ cart_id: 10 }] }); // SELECT cart_id
      // 2. Get cart items
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { variant_id: 1, quantity: 2 },
          { variant_id: 2, quantity: 1 },
        ],
      });
      // 3. Variant 1 check (FOR UPDATE)
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          stock_quantity: 10,
          price: '49.99',
          variant_name: 'Blue',
          product_name: 'T-Shirt',
        }],
      });
      // 3. Variant 2 check (FOR UPDATE)
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          stock_quantity: 5,
          price: '99.50',
          variant_name: null,
          product_name: 'Backpack',
        }],
      });
      // 4. Address check (is_main_city = true)
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          address_line1: '123 Main St',
          address_line2: 'Apt 4B',
          city_id: 1,
          zip_code: '10001',
          is_main_city: true,
          city_name: 'Colombo',
        }],
      });
      // 5. Insert order
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          order_id: 501,
          order_date: '2026-10-11T12:00:00Z',
          status: 'pending',
          total_amount: '199.48',
        }],
      });
      // 6. Insert order item 1
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // 6. Update stock variant 1
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // 6. Insert order item 2
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // 6. Update stock variant 2
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // 7. Insert delivery
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          delivery_id: 701,
          delivery_mode: 'home_delivery',
          delivery_address_line1: '123 Main St',
          delivery_address_line2: 'Apt 4B',
          city_id: 1,
          zip_code: '10001',
          estimated_delivery_days: 5,
          delivery_status: 'pending',
          tracking_number: null,
        }],
      });
      // 8. Delete cart items
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // 9. COMMIT
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await orderModel.createOrder(100, 5, 'home_delivery');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

      // Check stock deduction queries
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE product_variants'),
        [2, 1] // Deduct 2 from variant_id 1
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE product_variants'),
        [1, 2] // Deduct 1 from variant_id 2
      );

      // Check cart clearing query
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM cart_items WHERE cart_id = $1'),
        [10]
      );

      // Verify returned result structure
      expect(result).toMatchObject({
        order_id: 501,
        status: 'pending',
        total_amount: 199.48,
        delivery: expect.objectContaining({
          delivery_id: 701,
          estimated_delivery_days: 5,
        }),
      });
      expect(result.items).toHaveLength(2);
    });

    it('should set estimated_delivery_days to 7 for non-main cities', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ cart_id: 20 }] }); // cart
      mockClient.query.mockResolvedValueOnce({
        rows: [{ variant_id: 3, quantity: 1 }],
      }); // cart items
      mockClient.query.mockResolvedValueOnce({
        rows: [{ stock_quantity: 10, price: '25.00', variant_name: 'Red', product_name: 'Cap' }],
      }); // variant FOR UPDATE
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          address_line1: 'Rural Rd',
          address_line2: null,
          city_id: 2,
          zip_code: '90000',
          is_main_city: false, // Non-main city
          city_name: 'Badulla',
        }],
      }); // address
      mockClient.query.mockResolvedValueOnce({
        rows: [{ order_id: 502, order_date: '2026-10-11T12:00:00Z', status: 'pending', total_amount: '25.00' }],
      }); // order
      mockClient.query.mockResolvedValueOnce({}); // order_item
      mockClient.query.mockResolvedValueOnce({}); // update stock
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          delivery_id: 702,
          delivery_mode: 'home_delivery',
          estimated_delivery_days: 7,
          delivery_status: 'pending',
        }],
      }); // delivery
      mockClient.query.mockResolvedValueOnce({}); // delete cart
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      const result = await orderModel.createOrder(100, 6, 'home_delivery');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO deliveries'),
        expect.arrayContaining([7]) // 7 estimated days
      );
      expect(result.delivery.estimated_delivery_days).toBe(7);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should create store_pickup order with default store address and 2-day ETA when address_id is null', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ cart_id: 25 }] }); // cart
      mockClient.query.mockResolvedValueOnce({
        rows: [{ variant_id: 1, quantity: 2 }],
      }); // cart items
      mockClient.query.mockResolvedValueOnce({
        rows: [{ stock_quantity: 10, price: '48.00', variant_name: 'Classic Black / S', product_name: 'Yoga Leggings' }],
      }); // variant check
      mockClient.query.mockResolvedValueOnce({
        rows: [{ city_id: 1 }],
      }); // cities query for store pickup fallback
      mockClient.query.mockResolvedValueOnce({
        rows: [{ order_id: 505, order_date: '2026-10-13T10:00:00Z', status: 'pending', total_amount: '96.00' }],
      }); // order insert
      mockClient.query.mockResolvedValueOnce({}); // order_item insert
      mockClient.query.mockResolvedValueOnce({}); // update variant stock
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          delivery_id: 705,
          delivery_mode: 'store_pickup',
          delivery_address_line1: 'BrightBuy Central Retail Store & Pickup Gate',
          delivery_address_line2: '100 Main Street',
          city_id: 1,
          zip_code: '78701',
          estimated_delivery_days: 2,
          delivery_status: 'pending',
          tracking_number: null,
        }],
      }); // delivery insert
      mockClient.query.mockResolvedValueOnce({}); // delete cart items
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      const result = await orderModel.createOrder(100, null, 'store_pickup');

      expect(result.delivery.delivery_mode).toBe('store_pickup');
      expect(result.delivery.estimated_delivery_days).toBe(2);
      expect(result.delivery.delivery_address_line1).toContain('Pickup Gate');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('Deadlock Prevention & Concurrency Protection', () => {
    it('should sort variant IDs before acquiring FOR UPDATE locks to prevent circular deadlocks', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ cart_id: 30 }] });
      // Items returned in unsorted variant order: 15, then 3, then 9
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { variant_id: 15, quantity: 1 },
          { variant_id: 3, quantity: 1 },
          { variant_id: 9, quantity: 1 },
        ],
      });

      // Variant queries in sorted order (3, 9, 15)
      mockClient.query.mockResolvedValueOnce({ rows: [{ stock_quantity: 10, price: '10.00', product_name: 'P1' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ stock_quantity: 10, price: '20.00', product_name: 'P2' }] });
      mockClient.query.mockResolvedValueOnce({ rows: [{ stock_quantity: 10, price: '30.00', product_name: 'P3' }] });

      mockClient.query.mockResolvedValueOnce({
        rows: [{ address_line1: 'A', city_id: 1, zip_code: 'Z', is_main_city: true }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ order_id: 503, status: 'pending', total_amount: '60.00' }],
      });
      // 3 items and 3 stock updates
      for (let i = 0; i < 6; i++) mockClient.query.mockResolvedValueOnce({});
      mockClient.query.mockResolvedValueOnce({ rows: [{ delivery_id: 703, estimated_delivery_days: 5 }] });
      mockClient.query.mockResolvedValueOnce({}); // delete cart
      mockClient.query.mockResolvedValueOnce({}); // COMMIT

      await orderModel.createOrder(100, 1, 'store_pickup');

      // Verify that FOR UPDATE was called in strict ascending order: 3, then 9, then 15
      const forUpdateCalls = mockClient.query.mock.calls.filter(call =>
        typeof call[0] === 'string' && call[0].includes('FOR UPDATE')
      );

      expect(forUpdateCalls).toHaveLength(3);
      expect(forUpdateCalls[0][1]).toEqual([3]);
      expect(forUpdateCalls[1][1]).toEqual([9]);
      expect(forUpdateCalls[2][1]).toEqual([15]);
    });
  });

  describe('Edge Cases & Atomic Rollback Verification', () => {
    it('should rollback transaction and throw error if cart does not exist', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // No cart found

      await expect(orderModel.createOrder(100, 1, 'home_delivery')).rejects.toThrow('Cart is empty');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction and throw error if cart is empty', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ cart_id: 50 }] });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // 0 items in cart

      await expect(orderModel.createOrder(100, 1, 'home_delivery')).rejects.toThrow('Cart is empty');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction and never deduct stock when stock is insufficient', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ cart_id: 60 }] });
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { variant_id: 1, quantity: 10 },
          { variant_id: 2, quantity: 3 },
        ],
      });
      // Variant 1 only has 2 in stock (requested 10)
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          stock_quantity: 2,
          price: '10.00',
          variant_name: 'M',
          product_name: 'Sneakers',
        }],
      });
      // Variant 2 has enough stock (5)
      mockClient.query.mockResolvedValueOnce({
        rows: [{
          stock_quantity: 5,
          price: '20.00',
          variant_name: 'L',
          product_name: 'Sneakers',
        }],
      });

      await expect(orderModel.createOrder(100, 1, 'home_delivery')).rejects.toThrow(
        /Insufficient stock for: Sneakers - M/
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
      // Verify no UPDATE product_variants was executed
      const updateCalls = mockClient.query.mock.calls.filter(call =>
        typeof call[0] === 'string' && call[0].includes('UPDATE product_variants')
      );
      expect(updateCalls).toHaveLength(0);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction if address does not exist or does not belong to customer', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [{ cart_id: 70 }] });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ variant_id: 1, quantity: 1 }],
      });
      mockClient.query.mockResolvedValueOnce({
        rows: [{ stock_quantity: 10, price: '50.00', product_name: 'Headphones' }],
      });
      // Address check returns 0 rows (invalid or belongs to someone else)
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(orderModel.createOrder(100, 999, 'home_delivery')).rejects.toThrow(
        'Address not found or does not belong to customer'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should properly release database client even on unexpected query errors', async () => {
      mockClient.query.mockResolvedValueOnce({}); // BEGIN
      mockClient.query.mockRejectedValueOnce(new Error('DB Connection Lost'));

      await expect(orderModel.createOrder(100, 1, 'home_delivery')).rejects.toThrow('DB Connection Lost');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Order Retrieval (getOrders & getOrderById)', () => {
    it('getOrders aggregates item counts and maps numeric totals', async () => {
      db.query.mockResolvedValueOnce({
        rows: [
          { order_id: 1, order_date: '2026-10-10', status: 'pending', total_amount: '120.50', item_count: '3' },
          { order_id: 2, order_date: '2026-10-09', status: 'paid', total_amount: '45.00', item_count: '1' },
        ],
      });

      const orders = await orderModel.getOrders(10);
      expect(orders).toEqual([
        { order_id: 1, order_date: '2026-10-10', status: 'pending', total_amount: 120.5, item_count: 3 },
        { order_id: 2, order_date: '2026-10-09', status: 'paid', total_amount: 45, item_count: 1 },
      ]);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT o.order_id'), [10]);
    });

    it('getOrderById returns full details including items, delivery, and payment', async () => {
      db.query
        .mockResolvedValueOnce({
          rows: [{ order_id: 5, order_date: '2026-10-10', status: 'paid', total_amount: '99.99' }],
        })
        .mockResolvedValueOnce({
          rows: [{ variant_id: 1, product_name: 'Shirt', variant_name: 'M', quantity: 2, unit_price: '49.995' }],
        })
        .mockResolvedValueOnce({
          rows: [{ delivery_mode: 'home_delivery', delivery_address_line1: '123 St', city_name: 'Colombo', delivery_status: 'delivered', tracking_number: 'TRK1', estimated_delivery_days: 5 }],
        })
        .mockResolvedValueOnce({
          rows: [{ payment_method: 'card', payment_status: 'completed' }],
        });

      const order = await orderModel.getOrderById(5, 10);
      expect(order).toEqual({
        order_id: 5,
        order_date: '2026-10-10',
        status: 'paid',
        total_amount: 99.99,
        items: [{ variant_id: 1, product_name: 'Shirt', variant_name: 'M', quantity: 2, unit_price: 49.995 }],
        delivery: expect.objectContaining({ delivery_status: 'delivered', tracking_number: 'TRK1' }),
        payment: { payment_method: 'card', payment_status: 'completed' },
      });
    });

    it('getOrderById returns null when order is not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const order = await orderModel.getOrderById(999, 10);
      expect(order).toBeNull();
    });
  });
});
