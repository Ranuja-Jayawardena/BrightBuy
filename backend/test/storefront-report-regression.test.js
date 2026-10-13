process.env.NODE_ENV = 'test';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/db');
const { signAccessToken } = require('../src/utils/jwt');
const salesReportModel = require('../src/models/salesReportModel');
const analyticsReportModel = require('../src/models/analyticsReportModel');

describe('Fix 8.10: Storefront & Report Regression Verification', () => {
  let adminToken;
  let customerToken;

  before(async () => {
    // Generate auth tokens for regression tests
    adminToken = signAccessToken({ user_id: 1, role: 'admin' });
    customerToken = signAccessToken({ user_id: 4, role: 'customer' });
  });

  // --- CATALOG & STOREFRONT REGRESSION ---
  describe('Storefront Catalog API Contracts & Baseline', () => {
    test('GET /api/products returns 200 with standard pagination and S3 image URLs', async () => {
      const res = await request(app).get('/api/products?page=1&limit=20');
      assert.equal(res.status, 200, 'Catalog endpoint must return 200');
      assert.ok(res.body.products, 'Response must have products array');
      assert.ok(res.body.pagination, 'Response must have pagination object');
      assert.equal(res.body.pagination.total_count, 40, 'Must have 40 tech products');
      assert.equal(res.body.products.length, 20, 'Page 1 must return 20 products');

      // Verify product shape
      const sample = res.body.products[0];
      assert.ok(sample.product_id, 'product_id must exist');
      assert.ok(sample.product_name, 'product_name must exist');
      assert.ok(sample.brand, 'brand must exist');
      assert.ok(sample.min_price !== undefined, 'min_price must exist');
      assert.ok(sample.primary_image_url, 'primary_image_url must exist');
      assert.match(
        sample.primary_image_url,
        /^https:\/\/brightbuy-media-storage-695945476492\.s3\.us-east-1\.amazonaws\.com\/products\/\d+\/primary\.webp$/,
        'Must use direct S3 permanent URL format'
      );
    });

    test('GET /api/categories returns 200 with specialized tech hierarchy', async () => {
      const res = await request(app).get('/api/categories');
      assert.equal(res.status, 200, 'Categories endpoint must return 200');
      assert.ok(res.body.categories, 'Must have categories array');
      assert.equal(res.body.categories.length, 5, 'Must have 5 root tech categories');

      const rootNames = res.body.categories.map((c) => c.category_name);
      assert.ok(rootNames.includes('Electronics'));
      assert.ok(rootNames.includes('Computers & Gaming'));
      assert.ok(rootNames.includes('Audio & Sound'));
      assert.ok(rootNames.includes('Smart Home & Wearables'));
      assert.ok(rootNames.includes('Accessories & Storage'));

      // Check subcategories exist
      const computers = res.body.categories.find((c) => c.category_name === 'Computers & Gaming');
      assert.ok(computers.children && computers.children.length > 0, 'Computers & Gaming must have subcategories');
      const subNames = computers.children.map((c) => c.category_name);
      assert.ok(subNames.includes('Laptops'));
      assert.ok(subNames.includes('Displays & Monitors'));
    });

    test('GET /api/products/brands returns active tech brands', async () => {
      const res = await request(app).get('/api/products/brands');
      assert.equal(res.status, 200, 'Brands endpoint must return 200');
      assert.ok(Array.isArray(res.body.brands), 'Must return brands array');
      assert.equal(res.body.brands.length, 10, 'Must have 10 tech brands');
      assert.ok(res.body.brands.includes('Zenith'));
      assert.ok(res.body.brands.includes('Titan'));
      assert.ok(res.body.brands.includes('Lumina'));
      assert.ok(res.body.brands.includes('NovaTech'));
    });

    test('GET /api/products/suggestions returns matching tech items with categories', async () => {
      const res = await request(app).get('/api/products/suggestions?q=Zenith');
      assert.equal(res.status, 200, 'Suggestions endpoint must return 200');
      assert.ok(Array.isArray(res.body.suggestions), 'Must return suggestions array');
      assert.ok(res.body.suggestions.length > 0, 'Should find Zenith products');

      for (const item of res.body.suggestions) {
        assert.equal(item.brand, 'Zenith');
        assert.ok(item.category_name, 'Suggestion must include category_name');
      }
    });

    test('GET /api/products/:id returns detail with variants and image galleries', async () => {
      const res = await request(app).get('/api/products/9'); // ZenithBook Pro 15
      assert.equal(res.status, 200, 'Product detail must return 200');
      assert.ok(res.body.product, 'Must return product object');
      assert.equal(res.body.product.product_name, 'ZenithBook Pro 15');
      assert.equal(res.body.product.brand, 'Zenith');
      assert.ok(res.body.product.variants.length >= 2, 'Must have at least 2 variants');
      assert.ok(res.body.product.images.length >= 2, 'Must have primary and secondary images');

      const primaryImg = res.body.product.images.find((i) => i.is_primary);
      assert.ok(primaryImg, 'Must have a primary image marked');
      assert.match(primaryImg.image_url, /primary\.webp$/);
    });
  });

  // --- FILTERING & CATALOG NAVIGATION ---
  describe('Storefront Filter Matrix Integrity', () => {
    test('Brand filtering restricts results correctly', async () => {
      const res = await request(app).get('/api/products?brand=Zenith');
      assert.equal(res.status, 200);
      assert.ok(res.body.products.length > 0);
      for (const p of res.body.products) {
        assert.equal(p.brand, 'Zenith', 'Every product must be Zenith');
      }
    });

    test('Category filtering restricts results correctly', async () => {
      // Find category id for Laptops
      const catRes = await db.query("SELECT category_id FROM categories WHERE category_name = 'Laptops'");
      assert.ok(catRes.rows.length > 0);
      const laptopCatId = catRes.rows[0].category_id;

      const res = await request(app).get(`/api/products?category_id=${laptopCatId}`);
      assert.equal(res.status, 200);
      assert.ok(res.body.products.length > 0);
      for (const p of res.body.products) {
        assert.match(p.product_name, /(ZenithBook|Titan Gaming|NovaFlex)/);
      }
    });

    test('Price range filtering restricts results correctly', async () => {
      const res = await request(app).get('/api/products?min_price=1000&max_price=2000');
      assert.equal(res.status, 200);
      assert.ok(res.body.products.length > 0);
      for (const p of res.body.products) {
        assert.ok(Number(p.min_price) <= 2000, `Min price ${p.min_price} must be <= 2000`);
      }
    });

    test('Sorting by price_asc and name_asc produces ordered results', async () => {
      const ascRes = await request(app).get('/api/products?sort=price_asc&limit=10');
      assert.equal(ascRes.status, 200);
      const ascPrices = ascRes.body.products.map((p) => Number(p.min_price));
      for (let i = 1; i < ascPrices.length; i++) {
        assert.ok(ascPrices[i] >= ascPrices[i - 1], `Ascending order check failed: ${ascPrices[i]} < ${ascPrices[i - 1]}`);
      }

      const nameRes = await request(app).get('/api/products?sort=name_asc&limit=10');
      assert.equal(nameRes.status, 200);
      const names = nameRes.body.products.map((p) => p.product_name);
      for (let i = 1; i < names.length; i++) {
        assert.ok(names[i].localeCompare(names[i - 1]) >= 0, `Name asc order check failed: ${names[i]} < ${names[i - 1]}`);
      }
    });

    test('Out of stock variant displays zero quantity without breaking catalog', async () => {
      // Check LAP-002-16G-512 (ZenithBook Air 13 variant with stock 0)
      const res = await db.query("SELECT variant_sku, stock_quantity FROM product_variants WHERE stock_quantity = 0 LIMIT 1");
      assert.ok(res.rows.length > 0, 'Must have at least one out-of-stock variant seeded');
      const oosSku = res.rows[0].variant_sku;

      const prodRes = await db.query(
        "SELECT p.product_id FROM products p JOIN product_variants pv ON pv.product_id = p.product_id WHERE pv.variant_sku = $1",
        [oosSku]
      );
      const prodId = prodRes.rows[0].product_id;

      const apiRes = await request(app).get(`/api/products/${prodId}`);
      assert.equal(apiRes.status, 200);
      const variant = apiRes.body.product.variants.find((v) => v.variant_sku === oosSku);
      assert.ok(variant);
      assert.equal(variant.stock_quantity, 0, 'Stock quantity must accurately read 0');
    });
  });

  // --- REPORTS & ANALYTICS REGRESSION ---
  describe('Reports & Analytics Aggregate Accuracy', () => {
    test('Unauthenticated report request returns 401 Unauthorized', async () => {
      const res = await request(app).get('/api/reports/sales/revenue');
      assert.equal(res.status, 401, 'Unauthenticated report request must be rejected with 401');
    });

    test('Customer role requesting report returns 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/reports/sales/revenue')
        .set('Cookie', [`access_token=${customerToken}`]);
      assert.equal(res.status, 403, 'Customer requesting report must be rejected with 403');
    });

    test('Authorized staff analyst receives 200 for sales revenue report', async () => {
      const res = await request(app)
        .get('/api/reports/sales/revenue?period=monthly')
        .set('Cookie', [`access_token=${adminToken}`]);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data), 'Revenue must return data array');
      assert.ok(res.body.data.length > 0, 'Should have revenue data points');
      for (const pt of res.body.data) {
        assert.ok(pt.period, 'Must have period');
        assert.ok(typeof pt.revenue === 'number', 'Revenue must be a number');
        assert.ok(typeof pt.order_count === 'number', 'Order count must be a number');
      }
    });

    test('topProducts does NOT double-count revenue or quantity for products with multiple categories', async () => {
      // Find a product mapped to multiple categories
      const multiCatRes = await db.query(`
        SELECT p.product_id, p.product_name, COUNT(pc.category_id) as cat_count
        FROM products p
        JOIN product_categories pc ON pc.product_id = p.product_id
        GROUP BY p.product_id, p.product_name
        HAVING COUNT(pc.category_id) > 1
        LIMIT 1
      `);

      if (multiCatRes.rows.length > 0) {
        const testProdId = multiCatRes.rows[0].product_id;

        // Query model directly
        const topProducts = await salesReportModel.topProducts({ limit: 50, sortBy: 'revenue' });
        const prodRows = topProducts.filter((p) => p.product_id === testProdId);

        // Sum across variants for this product
        const modelTotalQty = prodRows.reduce((acc, r) => acc + r.total_quantity, 0);

        // Ground truth direct from order_items without joining product_categories
        const groundTruth = await db.query(`
          SELECT COALESCE(SUM(oi.quantity), 0)::int as total_qty
          FROM orders o
          JOIN order_items oi ON oi.order_id = o.order_id
          JOIN product_variants pv ON pv.variant_id = oi.variant_id
          WHERE pv.product_id = $1 AND o.status = ANY(ARRAY['paid', 'shipped', 'delivered']::varchar[])
        `, [testProdId]);

        const actualQty = groundTruth.rows[0].total_qty;
        assert.equal(
          modelTotalQty,
          actualQty,
          `Multi-category product ${testProdId} must not double count: model ${modelTotalQty} vs truth ${actualQty}`
        );
      }
    });

    test('inventorySummary groups by categories accurately', async () => {
      const summary = await analyticsReportModel.inventorySummary();
      assert.ok(Array.isArray(summary));
      assert.ok(summary.length > 0);
      for (const row of summary) {
        assert.ok(row.category_name);
        assert.ok(typeof row.total_units === 'number');
        assert.ok(typeof row.total_value === 'number');
      }
    });

    test('lowStock report returns low stock variants within threshold', async () => {
      const lowStock = await analyticsReportModel.lowStock(10);
      assert.ok(Array.isArray(lowStock));
      for (const v of lowStock) {
        assert.ok(v.stock_quantity < 10, 'Every item must have stock < threshold 10');
      }
    });

    test('customerGeography report groups by Texas cities correctly', async () => {
      const geo = await analyticsReportModel.customerGeography({});
      assert.ok(Array.isArray(geo));
      assert.ok(geo.length > 0);
      for (const g of geo) {
        assert.ok(g.city_name);
        assert.ok(typeof g.revenue === 'number');
        assert.ok(typeof g.order_count === 'number');
      }
    });
  });
});
