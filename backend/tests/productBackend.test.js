process.env.NODE_ENV = 'test';

jest.mock('../src/models/adminProductModel', () => ({
  createProduct: jest.fn(), updateProduct: jest.fn(), softDeleteProduct: jest.fn(),
  productExists: jest.fn(), createImage: jest.fn(), setProductActiveStatus: jest.fn(),
}));
jest.mock('../src/models/adminCategoryModel', () => ({ findCategoryById: jest.fn() }));
jest.mock('../src/models/imageModel', () => ({ findImageUrlById: jest.fn() }));
jest.mock('../src/services/s3Service', () => ({
  generatePresignedUploadUrl: jest.fn(), keyFromPublicUrl: jest.fn(),
  objectExists: jest.fn(), deleteS3Object: jest.fn(),
}));
jest.mock('../src/config/db', () => ({ query: jest.fn(), on: jest.fn() }));

const products = require('../src/services/adminProductService');
const productModel = require('../src/models/adminProductModel');
const categories = require('../src/services/adminCategoryService');
const categoryModel = require('../src/models/adminCategoryModel');
const imageModel = require('../src/models/imageModel');
const imageService = require('../src/services/imageService');
const s3Service = require('../src/services/s3Service');
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

  test('updateProduct supports is_active and setProductStatus reactivates product', async () => {
    productModel.setProductActiveStatus.mockResolvedValue({ product_id: 7, is_active: true });
    await expect(products.setProductStatus(7, { is_active: true })).resolves.toEqual({
      product: expect.objectContaining({ product_id: 7, is_active: true }),
    });
    expect(productModel.setProductActiveStatus).toHaveBeenCalledWith(7, true);

    await expect(products.updateProduct(7, { is_active: true })).resolves.toEqual({
      product: expect.objectContaining({ product_id: 7, is_active: true }),
    });
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
  const imageUrl = 'https://bucket.s3.us-east-1.amazonaws.com/products/7/example.webp';

  test('validates image URL and stores image metadata', async () => {
    productModel.productExists.mockResolvedValue(true);
    s3Service.keyFromPublicUrl.mockReturnValue('products/7/example.webp');
    s3Service.objectExists.mockResolvedValue(true);
    productModel.createImage.mockResolvedValue({ image_id: 4, product_id: 7, image_url: imageUrl, sort_order: 1, is_primary: true });
    await expect(products.createImage(7, { image_url: imageUrl, sort_order: '1', is_primary: 'true' })).resolves.toEqual({ image: expect.objectContaining({ image_id: 4, image_url: imageUrl }) });
    expect(productModel.createImage).toHaveBeenCalledWith(expect.objectContaining({ image_url: imageUrl, sort_order: 1, is_primary: true }));
    s3Service.keyFromPublicUrl.mockReturnValue(null);
    await expect(products.createImage(7, { image_url: 'https://evil.example/image' })).rejects.toMatchObject({ status: 400 });
    expect(productModel.createImage).toHaveBeenCalledTimes(1);
  });

  test('presigns only allowed image types for existing products', async () => {
    productModel.productExists.mockResolvedValue(true);
    s3Service.generatePresignedUploadUrl.mockResolvedValue({ uploadUrl: 'signed', fileKey: 'products/7/key.webp', publicUrl: imageUrl });
    await expect(products.presignImage(7, { contentType: 'image/webp', fileName: 'front.webp' })).resolves.toMatchObject({ uploadUrl: 'signed' });
    await expect(products.presignImage(7, { contentType: 'image/gif', fileName: 'front.gif' })).rejects.toMatchObject({ status: 400 });
  });

  test('redirects legacy image route to S3', async () => {
    imageModel.findImageUrlById.mockResolvedValue({ image_url: imageUrl });
    const result = await imageService.getImageById(4);
    expect(result).toMatchObject({ image_url: imageUrl });
    const res = { redirect: jest.fn(), status: jest.fn().mockReturnThis() };
    const next = jest.fn();
    await imageController.getImage({ params: { id: '4' } }, res, next);
    expect(res.redirect).toHaveBeenCalledWith(302, imageUrl);
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
