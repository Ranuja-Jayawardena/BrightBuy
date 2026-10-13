jest.mock('../src/config/db', () => ({ query: jest.fn() }));
jest.mock('../src/services/emailQueue', () => ({ enqueueEmail: jest.fn() }));

const db = require('../src/config/db');
const { enqueueEmail } = require('../src/services/emailQueue');
const notifications = require('../src/services/notificationService');
const templates = require('../src/templates/emailTemplates');
const adminOrderModel = require('../src/models/adminOrderModel');
const adminOrderService = require('../src/services/adminOrderService');

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  enqueueEmail.mockResolvedValue({ success: true, queued: true });
});

test('welcome email queues escaped HTML and a readable text version', async () => {
  await notifications.sendWelcome({ email: 'a@example.com', firstName: '<Alex>' });
  const [to, subject, html, plain, key] = enqueueEmail.mock.calls[0];
  expect(to).toBe('a@example.com');
  expect(subject).toContain('Welcome');
  expect(html).toContain('&lt;Alex&gt;');
  expect(html).not.toContain('Hello <Alex>');
  expect(plain).toContain('a@example.com');
  expect(key).toBe('welcome:a@example.com');
});

test('order email shows a sensible fallback estimate', () => {
  const email = templates.orderConfirmationEmail({ orderId: 1, totalAmount: 10, deliveryAddress: { address_line1: 'Main St' } });
  expect(email.html).toContain('5–7 business days');
  expect(email.html).not.toContain('-2 business days');
});

test('order confirmation queues order details', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ order_id: 3, email: 'a@example.com', first_name: 'Alex', total_amount: '12.00', delivery_address_line1: 'Main St' }] })
    .mockResolvedValueOnce({ rows: [{ product_name: 'Lamp', variant_name: 'Blue', quantity: 1, unit_price: '12.00' }] });
  await notifications.sendOrderConfirmation(3);
  expect(enqueueEmail).toHaveBeenCalledWith('a@example.com', expect.stringContaining('#3'), expect.stringContaining('Lamp'), expect.stringContaining('Lamp'), 'order:3');
});

test('payment receipt uses the completed matching transaction from the database', async () => {
  db.query.mockResolvedValue({ rows: [{ email: 'a@example.com', first_name: 'Alex', amount: '12.00', payment_method: 'card', transaction_id: 'txn-1', payment_date: new Date('2026-01-01') }] });
  await notifications.sendPaymentConfirmation({ order_id: 3, transaction_id: 'txn-1', amount: 999 });
  expect(db.query.mock.calls[0][0]).toContain("payment_status = 'completed'");
  expect(db.query.mock.calls[0][1]).toEqual([3, 'txn-1']);
  expect(enqueueEmail).toHaveBeenCalledWith('a@example.com', expect.any(String), expect.stringContaining('$12.00'), expect.stringContaining('txn-1'), 'payment:3');
});

test('payment receipt is not queued without a completed payment', async () => {
  db.query.mockResolvedValue({ rows: [] });
  await expect(notifications.sendPaymentConfirmation({ order_id: 3, transaction_id: 'missing' }))
    .resolves.toMatchObject({ success: false });
  expect(enqueueEmail).not.toHaveBeenCalled();
});

test('delivery update queues the current status and tracking number', async () => {
  db.query.mockResolvedValue({ rows: [{ delivery_id: 4, order_id: 3, delivery_status: 'shipped', tracking_number: 'TRACK-1', updated_at: '2026-01-01', email: 'a@example.com' }] });
  await notifications.sendDeliveryStatusUpdate({ delivery_id: 4 });
  expect(enqueueEmail).toHaveBeenCalledWith('a@example.com', expect.stringContaining('SHIPPED'), expect.stringContaining('TRACK-1'), expect.stringContaining('TRACK-1'), 'delivery:4:shipped:2026-01-01');
});

test('delivery update SQL skips an unchanged status and tracking number', async () => {
  db.query.mockResolvedValue({ rows: [] });
  await adminOrderModel.updateDeliveryStatus(4, 'shipped', 'TRACK-1');
  expect(db.query.mock.calls[0][0]).toContain('delivery_status IS DISTINCT FROM $2');
  expect(db.query.mock.calls[0][0]).toContain('tracking_number IS DISTINCT FROM $3');
});

test('repeating an unchanged delivery update does not send an email', async () => {
  const delivery = { delivery_id: 4, order_id: 3, delivery_mode: 'home_delivery', delivery_status: 'shipped', tracking_number: 'TRACK-1' };
  jest.spyOn(adminOrderModel, 'findDeliveryById').mockResolvedValue(delivery);
  jest.spyOn(adminOrderModel, 'updateDeliveryStatus').mockResolvedValue(null);
  await expect(adminOrderService.updateDelivery(4, { delivery_status: 'shipped', tracking_number: 'TRACK-1' })).resolves.toEqual(delivery);
  expect(enqueueEmail).not.toHaveBeenCalled();
});
