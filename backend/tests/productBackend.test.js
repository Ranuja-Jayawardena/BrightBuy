process.env.NODE_ENV = 'test';

jest.mock('../src/models/adminProductModel', () => ({
  createProduct: jest.fn(), updateProduct: jest.fn(), softDeleteProduct: jest.fn(),
  productExists: jest.fn(), createImage: jest.fn(),
}));
jest.mock('../src/models/adminCategoryModel', () => ({ findCategoryById: jest.fn() }));
jest.mock('../src/models/imageModel', () => ({ findImageDataById: jest.fn() }));
jest.mock('../src/config/db', () => ({ query: jest.fn(), on: jest.fn() }));

const products = require('../src/services/adminProductService');
const productModel = require('../src/models/adminProductModel');
const categories = require('../src/services/adminCategoryService');
const categoryModel = require('../src/models/adminCategoryModel');
const imageModel = require('../src/models/imageModel');
const imageService = require('../src/services/imageService');
const imageController = require('../src/controllers/imageController');
const db = require('../src/config/db');
const salesController = require('../src/controllers/salesReportController');
const analyticsController = require('../src/controllers/analyticsReportController');
const analyticsModel = require('../src/models/analyticsReportModel');
const adminOrders = require('../src/services/adminOrderService');
const adminInventory = require('../src/services/adminInventoryService');

beforeEach(() => jest.clearAllMocks());

describe('product CRUD', () => {
  const payload = { product_name: '  Camera  ', base_sku: ' CAM-1 ', category_ids: [2, 2, 3] };

  test('create normalizes data and returns the created product', async () => {
    productModel.createProduct.mockResolvedValue({ product_id: 7, product_name: 'Camera', base_sku: 'CAM-1' });
    await expect(products.createProduct(payload)).resolves.toEqual({ product: expect.objectContaining({ product_id: 7 }) });
    expect(productModel.createProduct).toHaveBeenCalledWith(expect.objectContaining({ product_name: 'Camera', base_sku: 'CAM-1', category_ids: [2, 3] }));
  });

  test('create rejects malformed data before writing', async () => {
    await expect(products.createProduct(undefined)).rejects.toMatchObject({ status: 400 });
    await expect(products.createProduct({ ...payload, category_ids: ['2x'] })).rejects.toMatchObject({ status: 400 });
    await expect(products.createProduct({ ...payload, product_name: ' ' })).rejects.toMatchObject({ status: 400 });
    expect(productModel.createProduct).not.toHaveBeenCalled();
  });

  test('update returns 404 sentinel for a missing product and delete soft-deletes', async () => {
    productModel.updateProduct.mockResolvedValue(null);
    await expect(products.updateProduct(999, payload)).resolves.toBeNull();
    productModel.softDeleteProduct.mockResolvedValue({ product_id: 7, is_active: false });
    await expect(products.softDeleteProduct(7)).resolves.toEqual({ product: expect.objectContaining({ is_active: false }) });
    expect(productModel.softDeleteProduct).toHaveBeenCalledWith(7);
  });
});

describe('category hierarchy', () => {
  test('builds a nested tree including inactive nodes', () => {
    expect(categories.buildTree([
      { category_id: 1, parent_category_id: null },
      { category_id: 2, parent_category_id: 1, is_active: false },
    ])[0].children[0]).toMatchObject({ category_id: 2, is_active: false });
  });

  test('rejects a self-parent and an ancestor cycle', async () => {
    await expect(categories.ensureParentExists(3, 3)).rejects.toMatchObject({ status: 400 });
    db.query.mockResolvedValue({ rows: [{ category_id: 1 }] });
    await expect(categories.ensureParentExists(2, 1)).rejects.toMatchObject({ status: 400, message: 'Circular category hierarchy' });
    expect(categoryModel.findCategoryById).not.toHaveBeenCalled();
  });

  test('rejects a nonexistent parent', async () => {
    db.query.mockResolvedValue({ rows: [] });
    categoryModel.findCategoryById.mockResolvedValue(null);
    await expect(categories.ensureParentExists(5, 1)).rejects.toMatchObject({ status: 400, message: 'Parent category not found' });
  });

  test('rejects a missing category body and unsafe numeric IDs', async () => {
    await expect(categories.createCategory(undefined)).rejects.toMatchObject({ status: 400 });
    expect(() => categories.positiveId('9007199254740993', 'id')).toThrow();
  });
});

describe('image upload and retrieval', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00]);

  test('validates bytes and stores image metadata', async () => {
    productModel.productExists.mockResolvedValue(true);
    productModel.createImage.mockResolvedValue({ image_id: 4, product_id: 7, sort_order: 1, is_primary: true });
    await expect(products.createImage(7, { buffer: png }, { sort_order: '1', is_primary: 'true' })).resolves.toEqual({ image: expect.objectContaining({ image_id: 4 }) });
    expect(productModel.createImage).toHaveBeenCalledWith(expect.objectContaining({ image_data: png, sort_order: 1, is_primary: true }));
    await expect(products.createImage(7, { buffer: Buffer.from('invalid') }, {})).rejects.toMatchObject({ status: 400 });
    expect(productModel.createImage).toHaveBeenCalledTimes(1);
  });

  test('returns binary content and supports conditional GET', async () => {
    imageModel.findImageDataById.mockResolvedValue({ image_data: png });
    const result = await imageService.getImageById(4);
    expect(result).toMatchObject({ imageData: png, mimeType: 'image/png' });
    const res = { set: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn(), end: jest.fn() };
    const next = jest.fn();
    await imageController.getImage({ params: { id: '4' }, headers: {} }, res, next);
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ 'Content-Type': 'image/png', ETag: result.etag }));
    expect(res.send).toHaveBeenCalledWith(png);
    await imageController.getImage({ params: { id: '4' }, headers: { 'if-none-match': result.etag } }, res, next);
    expect(res.status).toHaveBeenCalledWith(304);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('report request validation', () => {
  const res = { json: jest.fn(), set: jest.fn(), send: jest.fn() };
  const next = jest.fn();

  test('rejects malformed sales period and date before querying', async () => {
    await salesController.revenue({ query: { period: 'yearly' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
    next.mockClear();
    await salesController.orders({ query: { start_date: '2026-02-31' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });

  test('rejects invalid inventory threshold and export type', async () => {
    await analyticsController.lowStock({ query: { threshold: '-1' } }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
    next.mockClear();
    await analyticsController.exportReport({ params: { type: 'other' }, query: {} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
    expect(res.send).not.toHaveBeenCalled();
  });

  test('CSV export escapes spreadsheet formulas and quotes', async () => {
    const summary = jest.spyOn(analyticsModel, 'inventorySummary').mockResolvedValue([
      { category_id: 1, category_name: '=HYPERLINK("bad")', total_units: 2, total_value: 10 },
    ]);
    try {
      await analyticsController.exportReport({ params: { type: 'inventory' }, query: {} }, res, next);
      expect(res.send).toHaveBeenCalledWith(expect.stringContaining("'=HYPERLINK(\"\"bad\"\")"));
      expect(next).not.toHaveBeenCalled();
    } finally {
      summary.mockRestore();
    }
  });
});

describe('admin request validation', () => {
  test('rejects malformed order filters and delivery bodies', async () => {
    await expect(adminOrders.list({ page: '1bad' })).rejects.toMatchObject({ status: 400 });
    await expect(adminOrders.list({ date_from: '2026-02-31' })).rejects.toMatchObject({ status: 400 });
    await expect(adminOrders.updateDelivery(1, undefined)).rejects.toMatchObject({ status: 400 });
  });

  test('rejects missing inventory and employee bodies', async () => {
    await expect(adminInventory.adjust(1, undefined, 1)).rejects.toMatchObject({ status: 400 });
    await expect(adminInventory.createEmployee(undefined)).rejects.toMatchObject({ status: 400 });
    await expect(adminInventory.list({ threshold: '1bad' })).rejects.toMatchObject({ status: 400 });
  });
});
