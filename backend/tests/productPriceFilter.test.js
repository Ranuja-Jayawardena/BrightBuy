jest.mock('../src/config/db', () => ({ query: jest.fn() }));

const db = require('../src/config/db');
const service = require('../src/services/productService');

beforeEach(() => jest.clearAllMocks());

test.each(['-1', '12.345', 'abc', '999999999', ['10', '20']])('rejects invalid price %p', async price => {
  await expect(service.getProductsList({ min_price: price })).rejects.toMatchObject({ status: 400 });
  expect(db.query).not.toHaveBeenCalled();
});

test('rejects an inverted range before querying', async () => {
  await expect(service.getProductsList({ min_price: '200', max_price: '50' })).rejects.toMatchObject({ status: 400 });
  expect(db.query).not.toHaveBeenCalled();
});

test('uses the same active-variant price range for count and data', async () => {
  db.query.mockImplementation(async sql => sql.includes('COUNT(*)::int AS total_count')
    ? { rows: [{ total_count: 1 }] }
    : { rows: [{ product_id: 9, product_name: 'Camera', brand: 'BrightBuy', min_price: '75.00', max_price: '120.00', variant_count: 2, categories: [] }] });

  const result = await service.getProductsList({ brand: 'BrightBuy', min_price: '50', max_price: '150', page: '2', limit: '1' });
  expect(result.pagination).toEqual({ page: 2, limit: 1, total_count: 1, total_pages: 1 });
  expect(result.products[0]).toMatchObject({ product_id: 9, min_price: 75, max_price: 120 });

  const [countCall, dataCall] = db.query.mock.calls;
  for (const [sql] of [countCall, dataCall]) {
    expect(sql).toMatch(/EXISTS \(SELECT 1 FROM product_variants pv WHERE pv.product_id = p.product_id AND pv.is_active = true AND pv.price >= \$2 AND pv.price <= \$3\)/);
  }
  expect(countCall[1]).toEqual(['BrightBuy', 50, 150]);
  expect(dataCall[1]).toEqual(['BrightBuy', 50, 150, 1, 1]);
  expect(dataCall[0]).toMatch(/WHERE pv.product_id = p.product_id AND pv.is_active = true AND pv.price >= \$2 AND pv.price <= \$3/);
});
