const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

test('Fix 8.2: V27 catalog timestamps on PostgreSQL 15', {
  skip: process.env.FIX82_RUN_DB_TESTS !== '1' && 'Set FIX82_RUN_DB_TESTS=1 for an isolated database run',
}, async () => {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
  if (process.env.DB_NAME !== 'brightbuy_dev') throw new Error('Refusing to create a test database from a non-development connection');
  const { Client } = require('pg');
  const settings = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 5000,
  };
  const database = `fix82_${crypto.randomBytes(6).toString('hex')}`;
  const quotedDatabase = `"${database}"`;
  const admin = new Client({ ...settings, database: 'brightbuy_dev' });
  let client;
  let modelPool;
  let created = false;
  const originalDatabase = process.env.DB_NAME;
  const migrations = fs.readdirSync(path.resolve(__dirname, '../db/migrations'));

  async function migrate(version) {
    const file = migrations.find((name) => name.startsWith(`V${version}__`));
    if (!file) throw new Error(`Migration V${version} missing`);
    const sql = fs.readFileSync(path.resolve(__dirname, '../db/migrations', file), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  const stamp = (row) => row.updated_at.toISOString();

  try {
    await admin.connect();
    const target = await admin.query("SELECT current_database() AS database, current_setting('server_version') AS version, to_regclass('public.flyway_schema_history') AS history");
    console.log(`Target audit: ${target.rows[0].database}, PostgreSQL ${target.rows[0].version}, Flyway history ${target.rows[0].history || 'absent'}`);
    if (target.rows[0].history) {
      const history = await admin.query("SELECT version, success FROM flyway_schema_history WHERE version IN ('26', '27', '28') ORDER BY installed_rank");
      console.log(`Target V26–V28 history: ${JSON.stringify(history.rows)}`);
    }
    await admin.query(`CREATE DATABASE ${quotedDatabase}`);
    created = true;
    client = new Client({ ...settings, database });
    await client.connect();

    for (let version = 1; version <= 25; version++) await migrate(version);
    const product = await client.query("INSERT INTO products(product_name, base_sku) VALUES ('Upgrade product', 'TEST-001') RETURNING product_id, created_at, updated_at");
    const productId = product.rows[0].product_id;
    const other = await client.query("INSERT INTO products(product_name, base_sku) VALUES ('Other product', 'TEST-002') RETURNING product_id, updated_at");
    const otherId = other.rows[0].product_id;
    const variants = await client.query("INSERT INTO product_variants(product_id, variant_sku, price, stock_quantity) VALUES ($1, 'TEST-001-A', 10, 10), ($1, 'TEST-001-B', 20, 20) RETURNING variant_id, updated_at", [productId]);
    const [firstId, secondId] = variants.rows.map((row) => row.variant_id);
    assert.equal(stamp(product.rows[0]), product.rows[0].created_at.toISOString());
    assert.ok(variants.rows[0].updated_at instanceof Date);
    await client.query('INSERT INTO product_images(product_id, image_data, is_primary) VALUES ($1, $2, true)', [productId, Buffer.from([1, 2, 3])]);
    await client.query("UPDATE products SET updated_at = '2000-01-01' WHERE product_id = $1", [productId]);
    await client.query("UPDATE product_variants SET updated_at = '2000-01-01' WHERE product_id = $1", [productId]);

    await migrate(26);
    const image = await client.query('SELECT image_url FROM product_images WHERE product_id = $1', [productId]);
    assert.match(image.rows[0].image_url, /\/products\/1\/primary\.webp$/);
    const removedBytea = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'product_images' AND column_name = 'image_data'");
    assert.equal(removedBytea.rowCount, 0);
    await migrate(27);
    const triggers = await client.query(`
      SELECT c.relname AS table_name, t.tgname AS trigger_name, p.proname AS function_name, t.tgenabled
      FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE c.relname IN ('products', 'product_variants') AND NOT t.tgisinternal AND t.tgname LIKE 'trg_%_updated_at'
      ORDER BY c.relname
    `);
    assert.deepEqual(triggers.rows.map((row) => [row.table_name, row.trigger_name, row.function_name, row.tgenabled]), [
      ['product_variants', 'trg_product_variants_updated_at', 'set_catalog_updated_at', 'O'],
      ['products', 'trg_products_updated_at', 'set_catalog_updated_at', 'O'],
    ]);

    const unchangedOther = await client.query('SELECT updated_at FROM products WHERE product_id = $1', [otherId]);
    await client.query('BEGIN');
    const expected = await client.query('SELECT transaction_timestamp()::timestamp AS ts');
    const edited = await client.query("UPDATE products SET product_name = 'Edited', is_active = false, updated_at = '1990-01-01' WHERE product_id = $1 RETURNING updated_at", [productId]);
    assert.equal(stamp(edited.rows[0]), stamp({ updated_at: expected.rows[0].ts }));
    const noOp = await client.query('UPDATE products SET product_name = product_name WHERE product_id = $1 RETURNING updated_at', [productId]);
    assert.equal(stamp(noOp.rows[0]), stamp({ updated_at: expected.rows[0].ts }));
    await client.query('COMMIT');
    const otherAfter = await client.query('SELECT updated_at FROM products WHERE product_id = $1', [otherId]);
    assert.equal(stamp(otherAfter.rows[0]), stamp(unchangedOther.rows[0]));

    const productStamp = await client.query('SELECT updated_at FROM products WHERE product_id = $1', [productId]);
    await client.query('BEGIN');
    const stockTime = await client.query('SELECT transaction_timestamp()::timestamp AS ts');
    const bulk = await client.query('UPDATE product_variants SET stock_quantity = stock_quantity + 1 WHERE product_id = $1 RETURNING variant_id, updated_at', [productId]);
    assert.equal(bulk.rowCount, 2);
    for (const row of bulk.rows) assert.equal(stamp(row), stamp({ updated_at: stockTime.rows[0].ts }));
    await client.query('COMMIT');
    const productAfterVariant = await client.query('SELECT updated_at FROM products WHERE product_id = $1', [productId]);
    assert.equal(stamp(productAfterVariant.rows[0]), stamp(productStamp.rows[0]));

    const user = await client.query("INSERT INTO users(email, password_hash, role) VALUES ('test@example.invalid', 'x', 'admin') RETURNING user_id");
    const employee = await client.query("INSERT INTO employees(user_id, first_name, last_name) VALUES ($1, 'Test', 'Actor') RETURNING employee_id", [user.rows[0].user_id]);
    process.env.DB_NAME = database;
    modelPool = require('../src/config/db');
    const { adjustStock } = require('../src/models/adminInventoryModel');
    const { updateOrderStatus } = require('../src/models/adminOrderModel');
    const manual = await adjustStock(firstId, employee.rows[0].employee_id, 12, 'fixture');
    const manualPersisted = await client.query('SELECT stock_quantity, updated_at FROM product_variants WHERE variant_id = $1', [firstId]);
    assert.equal(manualPersisted.rows[0].stock_quantity, 12);
    assert.equal(stamp(manual), stamp(manualPersisted.rows[0]));
    const history = await client.query('SELECT previous_quantity, new_quantity FROM inventory_adjustments WHERE variant_id = $1', [firstId]);
    assert.deepEqual(history.rows.map((row) => [row.previous_quantity, row.new_quantity]), [[11, 12]]);

    const checkout = await client.query('UPDATE product_variants SET stock_quantity = stock_quantity - 2 WHERE variant_id = $1 RETURNING stock_quantity, updated_at', [firstId]);
    assert.equal(checkout.rows[0].stock_quantity, 10);
    const customerUser = await client.query("INSERT INTO users(email, password_hash, role) VALUES ('customer@example.invalid', 'x', 'customer') RETURNING user_id");
    const customer = await client.query("INSERT INTO customers(user_id, first_name, last_name) VALUES ($1, 'Test', 'Customer') RETURNING customer_id", [customerUser.rows[0].user_id]);
    const order = await client.query('INSERT INTO orders(customer_id, total_amount) VALUES ($1, 20) RETURNING order_id', [customer.rows[0].customer_id]);
    await client.query('INSERT INTO order_items(order_id, variant_id, quantity, unit_price) VALUES ($1, $2, 2, 10)', [order.rows[0].order_id, firstId]);
    const cancelled = await updateOrderStatus(order.rows[0].order_id, 'cancelled');
    assert.equal(cancelled.status, 'cancelled');
    const restored = await client.query('SELECT stock_quantity, updated_at FROM product_variants WHERE variant_id = $1', [firstId]);
    assert.equal(restored.rows[0].stock_quantity, 12);
    assert.notEqual(stamp(restored.rows[0]), stamp(checkout.rows[0]));
    await updateOrderStatus(order.rows[0].order_id, 'cancelled');
    const afterDuplicateCancellation = await client.query('SELECT stock_quantity FROM product_variants WHERE variant_id = $1', [firstId]);
    assert.equal(afterDuplicateCancellation.rows[0].stock_quantity, 12);
    const beforeRollback = await client.query('SELECT updated_at FROM product_variants WHERE variant_id = $1', [firstId]);
    await client.query('BEGIN');
    await client.query('UPDATE product_variants SET stock_quantity = 99 WHERE variant_id = $1', [firstId]);
    await client.query('ROLLBACK');
    const afterRollback = await client.query('SELECT stock_quantity, updated_at FROM product_variants WHERE variant_id = $1', [firstId]);
    assert.equal(afterRollback.rows[0].stock_quantity, 12);
    assert.equal(stamp(afterRollback.rows[0]), stamp(beforeRollback.rows[0]));
    const imageBefore = await client.query('SELECT updated_at FROM products WHERE product_id = $1', [productId]);
    await client.query("UPDATE product_images SET image_url = image_url || '?v=2' WHERE product_id = $1", [productId]);
    const imageAfter = await client.query('SELECT updated_at FROM products WHERE product_id = $1', [productId]);
    assert.equal(stamp(imageAfter.rows[0]), stamp(imageBefore.rows[0]));

    // V28 is an apparel data migration. Its subqueries produce NULL product IDs
    // on a fresh technology catalog, so report the gate rather than rewriting it.
    await assert.rejects(migrate(28), (error) => error.code === '23502');
    console.log('Fresh-chain gate: V28 fails with 23502 when apparel products are absent');

    await client.query(`
      INSERT INTO products(product_name, base_sku)
      VALUES ('Legacy MCL 1', 'MCL-001'), ('Legacy MCL 2', 'MCL-002'),
             ('Legacy MCL 3', 'MCL-003'), ('Legacy MCL 4', 'MCL-004'),
             ('Legacy WCL 1', 'WCL-001'), ('Legacy WCL 2', 'WCL-002'),
             ('Legacy WCL 3', 'WCL-003'), ('Legacy WCL 4', 'WCL-004')
    `);
    await migrate(28);
    await migrate(32);
    await migrate(33);
    const apparel = await client.query("SELECT count(*)::int AS variants FROM product_variants WHERE variant_sku LIKE 'MCL-%' OR variant_sku LIKE 'WCL-%'");
    assert.equal(apparel.rows[0].variants, 28);
    console.log('Full available migration SQL chain passes with representative legacy apparel rows');

    await client.query('TRUNCATE products RESTART IDENTITY CASCADE');
    const seed = fs.readFileSync(path.resolve(__dirname, '../db/seed/04_products.sql'), 'utf8');
    await client.query(seed);
    const seeded = await client.query('SELECT count(*)::int AS products FROM products');
    const seededImages = await client.query('SELECT count(*)::int AS images FROM product_images WHERE image_url LIKE $1', ['https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/products/%']);
    assert.equal(seeded.rows[0].products, 40);
    assert.equal(seededImages.rows[0].images, 80);
    console.log('V27 upgrade, timestamp operations, and 40-product/80-image fresh seed passed');
  } finally {
    if (modelPool) await modelPool.end().catch(() => {});
    process.env.DB_NAME = originalDatabase;
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
      await client.end().catch(() => {});
    }
    try {
      if (created) await admin.query(`DROP DATABASE ${quotedDatabase} WITH (FORCE)`);
    } finally {
      await admin.end().catch(() => {});
    }
  }
});
