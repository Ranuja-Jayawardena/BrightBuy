/* global test, expect, afterEach, jest */

const nodemailer = require('nodemailer');
const { orderConfirmationEmail, welcomeEmail, paymentConfirmationEmail, deliveryStatusUpdateEmail } = require('../src/templates/emailTemplates');

const originalUrl = process.env.FRONTEND_URL;
const originalFrom = process.env.EMAIL_FROM;
const originalUser = process.env.SMTP_USER;
const originalPass = process.env.SMTP_PASS;

afterEach(() => {
  for (const [key, value] of Object.entries({ FRONTEND_URL: originalUrl, EMAIL_FROM: originalFrom, SMTP_USER: originalUser, SMTP_PASS: originalPass })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  jest.restoreAllMocks();
});

test('customer emails omit localhost links but retain order details', () => {
  process.env.FRONTEND_URL = 'http://localhost:3000';
  const messages = [
    welcomeEmail({ name: 'Customer', email: 'customer@example.com' }),
    orderConfirmationEmail({ orderId: 42, items: [{ product_name: 'Shirt', quantity: 1, unit_price: 25 }], totalAmount: 25 }),
    paymentConfirmationEmail({ orderId: 42, amount: 25 }),
    deliveryStatusUpdateEmail({ orderId: 42, deliveryId: 3, deliveryStatus: 'shipped' }),
  ];
  for (const message of messages) {
    expect(message.html).not.toContain('localhost');
    expect(message.text).not.toContain('localhost');
  }
  expect(messages[1].text).toContain('Shirt');
  expect(messages[1].text).toContain('$25.00');
});

test('customer emails include configured public HTTPS order links', () => {
  process.env.FRONTEND_URL = 'https://shop.example.com';
  const message = orderConfirmationEmail({ orderId: 42, totalAmount: 25 });
  expect(message.html).toContain('https://shop.example.com/orders/42');
  expect(message.text).toContain('https://shop.example.com/orders/42');
});

test('mailer gives a plain sender address a recognizable display name', async () => {
  process.env.EMAIL_FROM = 'sender@example.com';
  process.env.SMTP_USER = 'sender@example.com';
  process.env.SMTP_PASS = 'test-password';
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
  jest.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail });
  const { sendEmail } = require('../src/utils/mailer');
  await expect(sendEmail('customer@example.com', 'Receipt', '<p>Paid</p>', 'Paid'))
    .resolves.toEqual(expect.objectContaining({ success: true }));
  expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
    from: { name: 'BrightBuy', address: 'sender@example.com' },
  }));
});
