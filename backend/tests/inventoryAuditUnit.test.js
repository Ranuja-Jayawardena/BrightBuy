/* global jest, afterEach, test, expect */
jest.mock('../src/config/db', () => ({ connect: jest.fn() }));

const db = require('../src/config/db');
const products = require('../src/models/adminProductModel');
const inventory = require('../src/models/adminInventoryModel');
const productService = require('../src/services/adminProductService');
const inventoryService = require('../src/services/adminInventoryService');

function clientFor(initial, { failAudit = false } = {}) {
  const client = { release: jest.fn(), query: jest.fn() };
  client.query.mockImplementation(async (sql, values) => {
    if (sql.includes('SELECT stock_quantity FROM product_variants')) return { rowCount: 1, rows: [{ stock_quantity: initial }] };
    if (sql.includes('SELECT variant_id,stock_quantity,updated_at')) return { rowCount: 1, rows: [{ variant_id: 4, stock_quantity: initial, updated_at: 'old' }] };
    if (sql.includes('INSERT INTO inventory_adjustments')) {
      if (failAudit) throw new Error('audit insert failed');
      return { rowCount: 1, rows: [] };
    }
    if (sql.includes('UPDATE product_variants')) return { rowCount: 1, rows: [{ variant_id: 4, stock_quantity: values[values.length - 1] }] };
    return { rowCount: 0, rows: [] };
  });
  db.connect.mockResolvedValue(client);
  return client;
}

afterEach(() => jest.clearAllMocks());

test('variant stock edit locks the row and writes one employee audit in its transaction', async () => {
  const client = clientFor(5);
  await products.updateVariant(4, { stock_quantity: 8, reason: 'Restock' }, 12);
  const statements = client.query.mock.calls.map(([sql]) => sql.trim());
  expect(statements[0]).toBe('BEGIN');
  expect(statements[1]).toContain('FOR UPDATE');
  expect(statements.filter(sql => sql.includes('INSERT INTO inventory_adjustments'))).toHaveLength(1);
  expect(client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO inventory_adjustments'))[1]).toEqual([4, 12, 5, 8, 'Restock']);
  expect(statements.at(-1)).toBe('COMMIT');
});

test('variant stock edit without reason throws 400', async () => {
  clientFor(5);
  await expect(products.updateVariant(4, { stock_quantity: 8 }, 12))
    .rejects.toMatchObject({ message: 'reason is required when stock_quantity changes', status: 400 });
});

test('product service requires valid employee id when updating stock', async () => {
  await expect(productService.updateVariant(4, { stock_quantity: 8, reason: 'Restock' }, null))
    .rejects.toMatchObject({ message: 'Employee identity is required', status: 403 });
  await expect(productService.updateVariant(4, { stock_quantity: 8, reason: 'Restock' }, 0))
    .rejects.toMatchObject({ message: 'Employee identity is required', status: 403 });
});

test('inventory service requires non-negative stock_quantity and reason', async () => {
  await expect(inventoryService.adjust(4, { stock_quantity: -1, reason: 'Manual' }, 1))
    .rejects.toMatchObject({ message: 'stock_quantity must be a non-negative integer', status: 400 });
  await expect(inventoryService.adjust(4, { stock_quantity: 10, reason: '   ' }, 1))
    .rejects.toMatchObject({ message: 'reason is required and must be 255 characters or fewer', status: 400 });
});

test('failed audit insertion rolls the stock edit back', async () => {
  const client = clientFor(5, { failAudit: true });
  await expect(products.updateVariant(4, { stock_quantity: 8, reason: 'Restock' }, 12)).rejects.toThrow('audit insert failed');
  expect(client.query.mock.calls.map(([sql]) => sql.trim()).at(-1)).toBe('ROLLBACK');
});

test('unchanged stock does not create an audit entry', async () => {
  const client = clientFor(5);
  await inventory.adjustStock(4, 12, 5, 'Inventory count');
  expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO inventory_adjustments'))).toBe(false);
  expect(client.query.mock.calls.map(([sql]) => sql.trim()).at(-1)).toBe('COMMIT');
});
