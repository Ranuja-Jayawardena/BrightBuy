const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

test('Fix 8.10 catalog and report contracts on disposable PostgreSQL', {
  skip: process.env.FIX810_RUN_DB_TESTS !== '1' && 'Set FIX810_RUN_DB_TESTS=1 for isolated PostgreSQL verification',
}, async () => {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
  assert.equal(process.env.DB_NAME, 'brightbuy_dev', 'Only the development host may hold this disposable fixture');
  const { Client } = require('pg');
  const settings = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 5000,
  };
  const database = `fix810_${crypto.randomBytes(6).toString('hex')}`;
  const admin = new Client({ ...settings, database: 'brightbuy_dev' });
  let fixture;
  let pool;
  let created = false;
  try {
    await admin.connect();
    const identity = await admin.query("SELECT current_database() AS name, current_setting('server_version_num')::int AS version");
    assert.equal(identity.rows[0].name, 'brightbuy_dev');
    assert.ok(identity.rows[0].version >= 150000);
    await admin.query(`CREATE DATABASE "${database}"`);
    created = true;
    fixture = new Client({ ...settings, database });
    await fixture.connect();
    const migrationDir = path.resolve(__dirname, '../db/migrations');
    const versions = [...Array(27)].map((_, index) => index + 1).concat([29, 30, 31, 32, 33, 34]);
    for (const version of versions) {
      const file = fs.readdirSync(migrationDir).find(name => name.startsWith(`V${version}__`));
      assert.ok(file, `Migration V${version} exists`);
      await fixture.query(fs.readFileSync(path.join(migrationDir, file), 'utf8'));
    }

    const city = await fixture.query("INSERT INTO cities(city_name,is_main_city) VALUES ('Fixture City',true) RETURNING city_id");
    const staffUser = await fixture.query("INSERT INTO users(email,password_hash,role) VALUES ('analyst@fix810.test','test','admin') RETURNING user_id");
    const employee = await fixture.query("INSERT INTO employees(user_id,first_name,last_name,role) VALUES ($1,'Fixture','Analyst','analyst') RETURNING employee_id", [staffUser.rows[0].user_id]);
    const customerUser = await fixture.query("INSERT INTO users(email,password_hash,role) VALUES ('customer@fix810.test','test','customer') RETURNING user_id");
    const customer = await fixture.query("INSERT INTO customers(user_id,first_name,last_name) VALUES ($1,'Fixture','Customer') RETURNING customer_id", [customerUser.rows[0].user_id]);
    const root = await fixture.query("INSERT INTO categories(category_name) VALUES ('Root') RETURNING category_id");
    const other = await fixture.query("INSERT INTO categories(category_name) VALUES ('Other') RETURNING category_id");
    const child = await fixture.query("INSERT INTO categories(category_name,parent_category_id) VALUES ('Child',$1) RETURNING category_id", [root.rows[0].category_id]);
    const first = await fixture.query("INSERT INTO products(product_name,brand,base_sku) VALUES ('Fixture Camera','Acme','FIX810-CAM') RETURNING product_id");
    const second = await fixture.query("INSERT INTO products(product_name,brand,base_sku) VALUES ('Fixture Lens','Beta','FIX810-LENS') RETURNING product_id");
    const p1 = first.rows[0].product_id;
    const p2 = second.rows[0].product_id;
    await fixture.query('INSERT INTO product_categories(product_id,category_id) VALUES ($1,$2),($1,$3),($4,$5)', [p1, child.rows[0].category_id, other.rows[0].category_id, p2, root.rows[0].category_id]);
    const v1 = await fixture.query("INSERT INTO product_variants(product_id,variant_sku,price,stock_quantity) VALUES ($1,'FIX810-CAM-A',5,10) RETURNING variant_id", [p1]);
    const v2 = await fixture.query("INSERT INTO product_variants(product_id,variant_sku,price,stock_quantity) VALUES ($1,'FIX810-LENS-A',10,4) RETURNING variant_id", [p2]);
    const imageUrl = `https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/${p1}/primary.webp`;
    await fixture.query('INSERT INTO product_images(product_id,image_url,is_primary,sort_order) VALUES ($1,$2,true,0)', [p1, imageUrl]);

    const cases = [
      ['paid', 10, v1.rows[0].variant_id, 2, 5],
      ['shipped', 10, v2.rows[0].variant_id, 1, 10],
      ['delivered', 5, v1.rows[0].variant_id, 1, 5],
      ['pending', 5, v1.rows[0].variant_id, 1, 5],
      ['cancelled', 10, v2.rows[0].variant_id, 1, 10],
    ];
    let refundedOrderId;
    for (const [status, amount, variantId, quantity, price] of cases) {
      const order = await fixture.query("INSERT INTO orders(customer_id,total_amount,status,order_date) VALUES ($1,$2,$3,'2026-10-10 12:00:00') RETURNING order_id", [customer.rows[0].customer_id, amount, status]);
      if (status === 'paid') refundedOrderId = order.rows[0].order_id;
      await fixture.query('INSERT INTO order_items(order_id,variant_id,quantity,unit_price) VALUES ($1,$2,$3,$4)', [order.rows[0].order_id, variantId, quantity, price]);
      await fixture.query("INSERT INTO deliveries(order_id,delivery_mode,delivery_address_line1,delivery_city_id,delivery_zip_code) VALUES ($1,'home_delivery','Fixture address',$2,'00000')", [order.rows[0].order_id, city.rows[0].city_id]);
    }
    await fixture.query("INSERT INTO payment_reconciliation_logs(order_id,discrepancy_type) VALUES ($1,'order_refunded')", [refundedOrderId]);

    process.env.DB_NAME = database;
    pool = require('../src/config/db');
    const sales = require('../src/models/salesReportModel');
    const analytics = require('../src/models/analyticsReportModel');
    const catalog = require('../src/models/productModel');
    const inventory = require('../src/models/adminInventoryModel');
    const exports = require('../src/controllers/analyticsReportController');

    const monthly = await sales.revenue({ period: 'monthly' });
    assert.deepEqual(monthly, [{ period: '2026-10', revenue: 25, order_count: 3 }]);
    assert.equal((await sales.revenue({ period: 'daily' }))[0].period, '2026-10-10');
    assert.equal((await sales.revenue({ period: 'weekly' }))[0].period, '2026-10-05');
    assert.equal((await sales.revenue({ period: 'quarterly' }))[0].period, '2026-Q4');
    assert.deepEqual(await sales.revenue({ period: 'monthly', startDate: '2026-10-11' }), []);
    const top = await sales.topProducts({ limit: 10, sortBy: 'revenue' });
    assert.deepEqual(top.map(row => [row.product_id, row.total_quantity, row.total_revenue]), [[p1, 3, 15], [p2, 1, 10]]);
    const orderGroups = await sales.orders({ period: 'monthly' });
    assert.deepEqual(orderGroups.map(row => [row.status, row.order_count]), [['delivered', 1], ['paid', 1], ['shipped', 1]]);
    const customers = await analytics.topCustomers({ limit: 10, sortBy: 'spend' });
    assert.equal(customers[0].total_spend, 25);
    assert.equal(customers[0].order_count, 3);
    const geography = await analytics.customerGeography({});
    assert.deepEqual(geography.map(row => [row.city_name, row.order_count, row.revenue]), [['Fixture City', 3, 25]]);
    const summary = await analytics.inventorySummary();
    const byCategory = Object.fromEntries(summary.map(row => [row.category_name, [row.total_units, row.total_value]]));
    assert.deepEqual(byCategory, { Child: [10, 50], Other: [10, 50], Root: [4, 40] });
    assert.equal((await analytics.lowStock(5)).length, 1);

    const listed = await catalog.findProducts({ page: 1, limit: 10, categoryId: root.rows[0].category_id });
    assert.equal(listed.totalCount, 2);
    assert.equal(listed.rows.find(row => row.product_id === p1).primary_image_url, imageUrl);
    assert.equal((await catalog.findProducts({ page: 1, limit: 10, brand: 'Acme', minPrice: 5, maxPrice: 5 })).totalCount, 1);
    assert.equal((await catalog.getSuggestions('Fixture')).length, 2);
    await fixture.query('UPDATE categories SET parent_category_id=$1 WHERE category_id=$2', [other.rows[0].category_id, child.rows[0].category_id]);
    assert.equal((await catalog.findProducts({ page: 1, limit: 10, categoryId: root.rows[0].category_id })).totalCount, 1);
    await assert.rejects(fixture.query('UPDATE categories SET parent_category_id=$1 WHERE category_id=$2', [child.rows[0].category_id, other.rows[0].category_id]));

    await inventory.adjustStock(v1.rows[0].variant_id, employee.rows[0].employee_id, 7, 'Count correction');
    const afterStock = await catalog.findProducts({ page: 1, limit: 10, brand: 'Acme' });
    assert.equal(afterStock.totalCount, 1);
    assert.equal((await analytics.inventorySummary()).find(row => row.category_name === 'Child').total_units, 7);

    const response = { headers: {}, set(headers) { Object.assign(this.headers, headers); }, send(value) { this.body = value; } };
    await exports.exportReport({ params: { type: 'sales' }, query: {} }, response, error => { throw error; });
    assert.match(response.headers['Content-Type'], /text\/csv/);
    assert.match(response.body, /^\uFEFF"period","revenue","order_count"\r\n"2026-10","25","3"$/);

    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET ||= 'fix810-disposable-test-secret';
    const request = require('supertest');
    const app = require('../src/index');
    const { signAccessToken } = require('../src/utils/jwt');
    const analystCookie = `access_token=${signAccessToken({ user_id: staffUser.rows[0].user_id, role: 'admin' })}`;
    const customerCookie = `access_token=${signAccessToken({ user_id: customerUser.rows[0].user_id, role: 'customer' })}`;
    const reportApi = await request(app).get('/api/reports/sales/revenue?period=monthly').set('Cookie', analystCookie);
    assert.equal(reportApi.status, 200);
    assert.deepEqual(reportApi.body.data, monthly);
    assert.equal((await request(app).get('/api/reports/sales/revenue').set('Cookie', customerCookie)).status, 403);
    assert.equal((await request(app).get('/api/reports/sales/revenue')).status, 401);
    const catalogApi = await request(app).get('/api/products?brand=Acme');
    assert.equal(catalogApi.status, 200);

    const plan = await fixture.query("EXPLAIN SELECT o.order_id FROM orders o WHERE o.status = ANY(ARRAY['paid','shipped','delivered']::varchar[]) AND o.order_date >= '2026-10-01'::date");
    assert.ok(plan.rows.length > 0);
    const indexes = await fixture.query("SELECT indexname FROM pg_indexes WHERE tablename IN ('orders','product_variants','products')");
    assert.ok(indexes.rows.some(row => row.indexname === 'idx_orders_status_date'));
    assert.ok(indexes.rows.some(row => row.indexname === 'idx_product_variants_active_price'));
    assert.ok(indexes.rows.some(row => row.indexname === 'idx_products_name_trgm'));
    console.log(`Fixture totals: revenue=25/3 orders; inventory Child=7, Other=10, Root=4; report plan=${plan.rows.map(row => row['QUERY PLAN']).join(' | ')}`);
  } finally {
    if (pool) await pool.end();
    if (fixture) await fixture.end();
    if (created) await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    await admin.end();
  }
});
