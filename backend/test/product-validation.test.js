const test = require('node:test');
const assert = require('node:assert/strict');

const productService = require('../src/services/productService');
const adminProduct = require('../src/services/adminProductService');
const categories = require('../src/services/adminCategoryService');
const { detectMimeType, generateETag } = require('../src/services/imageService');
const { dateRange, integer } = require('../src/utils/reportValidation');

function expectsBadRequest(callback) {
  assert.throws(callback, (error) => error.status === 400);
}

test('catalog query validation rejects malformed pagination and filter values', () => {
  expectsBadRequest(() => productService.positiveQueryInteger('1oops', 'page', 1, 100));
  expectsBadRequest(() => productService.positiveQueryInteger('0', 'page', 1, 100));
  expectsBadRequest(() => productService.optionalQueryString({ value: 'x' }, 'search', 100));
  assert.equal(productService.positiveQueryInteger('7', 'page', 1, 100), 7);
});

test('admin product CRUD validators only accept strict numeric identifiers', () => {
  assert.equal(adminProduct.parsePositiveInteger('42', 'id'), 42);
  expectsBadRequest(() => adminProduct.parsePositiveInteger('42abc', 'id'));
  expectsBadRequest(() => adminProduct.parsePositiveInteger(-1, 'id'));
});

test('category tree construction nests categories and preserves roots', async () => {
  const tree = categories.buildTree([
    { category_id: 1, parent_category_id: null, category_name: 'Root' },
    { category_id: 2, parent_category_id: 1, category_name: 'Child' },
  ]);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].children[0].category_id, 2);
  expectsBadRequest(() => categories.positiveId('2.5', 'id'));
  await assert.rejects(categories.ensureParentExists(1, 1), (error) => error.status === 400);
});

test('image retrieval identifies accepted image bytes and generates a stable ETag', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  assert.equal(detectMimeType(png), 'image/png');
  assert.match(generateETag(png), /^"[a-f0-9]{32}"$/);
  assert.equal(detectMimeType(Buffer.from('not an image')), 'application/octet-stream');
});

test('report queries validate dates, date ranges, and integer limits', () => {
  assert.deepEqual(dateRange({ start_date: '2026-01-01', end_date: '2026-01-31' }), { startDate: '2026-01-01', endDate: '2026-01-31' });
  expectsBadRequest(() => dateRange({ start_date: '2026-02-31' }));
  expectsBadRequest(() => dateRange({ start_date: '2026-02-02', end_date: '2026-02-01' }));
  assert.equal(integer('25', 'limit', 10, 1, 100), 25);
  expectsBadRequest(() => integer('3.5', 'limit', 10, 1, 100));
});
