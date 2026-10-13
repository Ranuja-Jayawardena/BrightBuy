/* global jest, test, expect */
jest.mock('../src/config/db', () => ({ query: jest.fn() }));

const db = require('../src/config/db');
const controller = require('../src/controllers/salesReportController');

test('top products response keeps the joined product name', async () => {
  const productName = 'Cashmere Open-Front Cardigan';
  db.query.mockResolvedValueOnce({ rows: [{
    product_id: 7,
    product_name: productName,
    variant_name: 'Dove Gray / Size M',
    total_quantity: 3,
    total_revenue: '357.00',
  }] });

  const res = { json: jest.fn() };
  const next = jest.fn();
  await controller.topProducts({ query: {} }, res, next);

  expect(next).not.toHaveBeenCalled();
  expect(db.query.mock.calls[0][0]).toMatch(/JOIN products p ON p\.product_id=v\.product_id/);
  expect(db.query.mock.calls[0][0]).toMatch(/SELECT p\.product_id, p\.product_name/);
  expect(res.json).toHaveBeenCalledWith({ data: [expect.objectContaining({
    product_name: productName,
    total_revenue: 357,
  })] });
});
