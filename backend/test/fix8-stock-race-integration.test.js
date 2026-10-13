const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

test('Fix 8.12 last-unit checkout, rollback and cancellation on PostgreSQL', {
  skip: process.env.FIX812_RUN_STOCK_TESTS !== '1' && 'Set FIX812_RUN_STOCK_TESTS=1 for isolated PostgreSQL verification',
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
  const database = `fix812_stock_${crypto.randomBytes(6).toString('hex')}`;
  const admin = new Client({ ...settings, database: 'brightbuy_dev' });
  let fixture;
  let blocker;
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
    blocker = new Client({ ...settings, database });
    await fixture.connect();
    await blocker.connect();
    const migrationDir = path.resolve(__dirname, '../db/migrations');
    for (const version of [...Array(27)].map((_, i) => i + 1).concat([29, 30, 31, 32, 33, 34])) {
      const file = fs.readdirSync(migrationDir).find(name => name.startsWith(`V${version}__`));
      assert.ok(file, `Migration V${version} exists`);
      await fixture.query(fs.readFileSync(path.join(migrationDir, file), 'utf8'));
    }
    await fixture.query(`ALTER DATABASE "${database}" SET lock_timeout = '8s'`);
    await fixture.query(`ALTER DATABASE "${database}" SET statement_timeout = '15s'`);

    const city = await fixture.query("INSERT INTO cities(city_name,is_main_city) VALUES ('Stock fixture',true) RETURNING city_id");
    const product = await fixture.query("INSERT INTO products(product_name,base_sku) VALUES ('Last unit','FIX812-STOCK') RETURNING product_id");
    const variant = await fixture.query("INSERT INTO product_variants(product_id,variant_sku,price,stock_quantity) VALUES ($1,'FIX812-STOCK-A',10,1) RETURNING variant_id", [product.rows[0].product_id]);
    const variantId = variant.rows[0].variant_id;
    const customers = [];
    for (let i = 1; i <= 3; i++) {
      const user = await fixture.query('INSERT INTO users(email,password_hash,role) VALUES ($1,\'test\',\'customer\') RETURNING user_id', [`stock${i}@fix812.test`]);
      const customer = await fixture.query('INSERT INTO customers(user_id,first_name,last_name) VALUES ($1,\'Stock\',$2) RETURNING customer_id', [user.rows[0].user_id, `Customer ${i}`]);
      const cart = await fixture.query('INSERT INTO carts(customer_id) VALUES ($1) RETURNING cart_id', [customer.rows[0].customer_id]);
      await fixture.query('INSERT INTO cart_items(cart_id,variant_id,quantity) VALUES ($1,$2,1)', [cart.rows[0].cart_id, variantId]);
      customers.push(customer.rows[0].customer_id);
    }

    process.env.DB_NAME = database;
    pool = require('../src/config/db');
    const orders = require('../src/models/orderModel');
    const adminOrders = require('../src/models/adminOrderModel');

    // Hold the variant row while both independent pool clients reach checkout.
    await blocker.query('BEGIN');
    await blocker.query('SELECT variant_id FROM product_variants WHERE variant_id=$1 FOR UPDATE', [variantId]);
    const attempts = Promise.allSettled(customers.slice(0, 2).map(id => orders.createOrder(id, null, 'store_pickup')));
    const deadline = Date.now() + 5000;
    let waiting = 0;
    while (Date.now() < deadline) {
      const activity = await fixture.query(`
        SELECT count(*)::int AS waiting FROM pg_stat_activity
        WHERE datname=current_database() AND wait_event_type='Lock'
          AND query LIKE '%FROM product_variants v%' AND query LIKE '%FOR UPDATE OF v%'
      `);
      waiting = activity.rows[0].waiting;
      if (waiting >= 2) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.equal(waiting, 2, 'both checkout clients must wait on the locked variant');
    await blocker.query('COMMIT');
    const settled = await attempts;
    const success = settled.filter(result => result.status === 'fulfilled');
    const failure = settled.filter(result => result.status === 'rejected');
    assert.equal(success.length, 1);
    assert.equal(failure.length, 1);
    assert.match(failure[0].reason.message, /Insufficient stock/);
    const winner = success[0].value;
    assert.equal((await fixture.query('SELECT stock_quantity FROM product_variants WHERE variant_id=$1', [variantId])).rows[0].stock_quantity, 0);
    assert.equal((await fixture.query('SELECT count(*)::int AS n FROM orders')).rows[0].n, 1);
    assert.equal((await fixture.query('SELECT count(*)::int AS n FROM order_items')).rows[0].n, 1);
    assert.equal((await fixture.query('SELECT count(*)::int AS n FROM cart_items')).rows[0].n, 2);

    const cancelled = await Promise.all([
      adminOrders.updateOrderStatus(winner.order_id, 'cancelled'),
      adminOrders.updateOrderStatus(winner.order_id, 'cancelled'),
    ]);
    assert.ok(cancelled.every(result => result.status === 'cancelled'));
    assert.equal((await fixture.query('SELECT stock_quantity FROM product_variants WHERE variant_id=$1', [variantId])).rows[0].stock_quantity, 1);
    await assert.rejects(adminOrders.updateOrderStatus(winner.order_id, 'paid'), /Invalid status transition/);
    assert.equal((await fixture.query('SELECT stock_quantity FROM product_variants WHERE variant_id=$1', [variantId])).rows[0].stock_quantity, 1);

    // Force failure after the order item and stock update but before commit.
    await fixture.query(`
      CREATE FUNCTION reject_stock_fixture_delivery() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'injected delivery failure'; END; $$;
      CREATE TRIGGER reject_stock_fixture_delivery BEFORE INSERT ON deliveries
      FOR EACH ROW EXECUTE FUNCTION reject_stock_fixture_delivery();
    `);
    await assert.rejects(orders.createOrder(customers[2], null, 'store_pickup'), /injected delivery failure/);
    assert.equal((await fixture.query('SELECT stock_quantity FROM product_variants WHERE variant_id=$1', [variantId])).rows[0].stock_quantity, 1);
    assert.equal((await fixture.query('SELECT count(*)::int AS n FROM orders')).rows[0].n, 1);
    assert.equal((await fixture.query('SELECT count(*)::int AS n FROM cart_items')).rows[0].n, 2);
    assert.equal((await fixture.query('SELECT count(*)::int AS n FROM inventory_adjustments')).rows[0].n, 0);

    await fixture.query('DROP TRIGGER reject_stock_fixture_delivery ON deliveries');
    const second = await fixture.query("INSERT INTO product_variants(product_id,variant_sku,price,stock_quantity) VALUES ($1,'FIX812-STOCK-B',10,1),($1,'FIX812-STOCK-C',10,1) RETURNING variant_id", [product.rows[0].product_id]);
    const sortedIds = second.rows.map(row => row.variant_id).sort((a, b) => a - b);
    const moreCustomers = [];
    for (let i = 4; i <= 5; i++) {
      const user = await fixture.query('INSERT INTO users(email,password_hash,role) VALUES ($1,\'test\',\'customer\') RETURNING user_id', [`stock${i}@fix812.test`]);
      const customer = await fixture.query('INSERT INTO customers(user_id,first_name,last_name) VALUES ($1,\'Stock\',$2) RETURNING customer_id', [user.rows[0].user_id, `Customer ${i}`]);
      const cart = await fixture.query('INSERT INTO carts(customer_id) VALUES ($1) RETURNING cart_id', [customer.rows[0].customer_id]);
      for (const id of i === 4 ? sortedIds : [...sortedIds].reverse()) {
        await fixture.query('INSERT INTO cart_items(cart_id,variant_id,quantity) VALUES ($1,$2,1)', [cart.rows[0].cart_id, id]);
      }
      moreCustomers.push(customer.rows[0].customer_id);
    }
    await blocker.query('BEGIN');
    await blocker.query('SELECT variant_id FROM product_variants WHERE variant_id=$1 FOR UPDATE', [sortedIds[0]]);
    const pairedAttempts = Promise.allSettled(moreCustomers.map(id => orders.createOrder(id, null, 'store_pickup')));
    const pairedDeadline = Date.now() + 5000;
    let pairedWaiting = 0;
    while (Date.now() < pairedDeadline) {
      const activity = await fixture.query(`
        SELECT count(*)::int AS waiting FROM pg_stat_activity
        WHERE datname=current_database() AND wait_event_type='Lock'
          AND query LIKE '%FROM product_variants v%' AND query LIKE '%FOR UPDATE OF v%'
      `);
      pairedWaiting = activity.rows[0].waiting;
      if (pairedWaiting >= 2) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.equal(pairedWaiting, 2, 'both two-variant checkouts must wait on the lower variant ID');
    await blocker.query('COMMIT');
    const pairedResults = await pairedAttempts;
    assert.equal(pairedResults.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(pairedResults.filter(result => result.status === 'rejected').length, 1);
    assert.match(pairedResults.find(result => result.status === 'rejected').reason.message, /Insufficient stock/);
    for (const id of sortedIds) {
      assert.equal((await fixture.query('SELECT stock_quantity FROM product_variants WHERE variant_id=$1', [id])).rows[0].stock_quantity, 0);
    }
    await adminOrders.updateOrderStatus(pairedResults.find(result => result.status === 'fulfilled').value.order_id, 'cancelled');
    for (const id of sortedIds) {
      assert.equal((await fixture.query('SELECT stock_quantity FROM product_variants WHERE variant_id=$1', [id])).rows[0].stock_quantity, 1);
    }
    console.log('Stock fixture: one winner per contention, sorted two-variant locks, no negative stock; cancellation restored once; injected failure rolled back stock/order');
  } finally {
    if (blocker) await blocker.query('ROLLBACK').catch(() => {});
    if (pool) await pool.end();
    if (blocker) await blocker.end();
    if (fixture) await fixture.end();
    if (created) await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    await admin.end().catch(() => {});
  }
});
