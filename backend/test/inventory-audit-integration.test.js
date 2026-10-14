const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

test('Fix 8.8 inventory audit on disposable PostgreSQL database', {
  skip: process.env.FIX88_RUN_DB_TESTS !== '1' && 'Set FIX88_RUN_DB_TESTS=1 for isolated PostgreSQL verification',
}, async () => {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
  assert.equal(process.env.DB_NAME, 'brightbuy_dev', 'Only the development server may host the disposable database');
  const { Client } = require('pg');
  const settings = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 5000,
  };
  const database = `fix88_${crypto.randomBytes(6).toString('hex')}`;
  const admin = new Client({ ...settings, database: 'brightbuy_dev' });
  let schemaClient;
  let pool;
  let created = false;
  try {
    await admin.connect();
    const identity = await admin.query('SELECT current_database() AS name, current_setting(\'server_version_num\')::int AS version');
    assert.equal(identity.rows[0].name, 'brightbuy_dev');
    assert.ok(identity.rows[0].version >= 150000, 'PostgreSQL 15 or newer required');
    await admin.query(`CREATE DATABASE "${database}"`);
    created = true;
    schemaClient = new Client({ ...settings, database });
    await schemaClient.connect();
    const migrationDir = path.resolve(__dirname, '../db/migrations');
    for (const version of [...Array(25)].map((_, index) => index + 1).concat([27, 34])) {
      const file = fs.readdirSync(migrationDir).find(name => name.startsWith(`V${version}__`));
      assert.ok(file, `Migration V${version} exists`);
      await schemaClient.query(fs.readFileSync(path.join(migrationDir, file), 'utf8'));
    }
    const user = await schemaClient.query("INSERT INTO users(email,password_hash,role) VALUES ('fix88@example.test','test','admin') RETURNING user_id");
    const employee = await schemaClient.query("INSERT INTO employees(user_id,first_name,last_name) VALUES ($1,'Fix','EightyEight') RETURNING employee_id", [user.rows[0].user_id]);
    const product = await schemaClient.query("INSERT INTO products(product_name,base_sku) VALUES ('Audit fixture','FIX88') RETURNING product_id");
    const variant = await schemaClient.query("INSERT INTO product_variants(product_id,variant_sku,price,stock_quantity) VALUES ($1,'FIX88-A',10,10) RETURNING variant_id", [product.rows[0].product_id]);
    const variantId = variant.rows[0].variant_id;
    const employeeId = employee.rows[0].employee_id;

    process.env.DB_NAME = database;
    pool = require('../src/config/db');
    const inventory = require('../src/models/adminInventoryModel');
    const products = require('../src/models/adminProductModel');

    await inventory.adjustStock(variantId, employeeId, 12, 'Count correction');
    await products.updateVariant(variantId, { stock_quantity: 15, reason: 'New shipment' }, employeeId);
    const concurrent = await Promise.all([
      inventory.adjustStock(variantId, employeeId, 16, 'First count'),
      inventory.adjustStock(variantId, employeeId, 17, 'Second count'),
    ]);
    assert.equal(concurrent.length, 2);
    const rows = await schemaClient.query('SELECT previous_quantity,new_quantity,employee_id,reason FROM inventory_adjustments WHERE variant_id=$1 ORDER BY adjustment_id', [variantId]);
    assert.equal(rows.rowCount, 4);
    assert.deepEqual(rows.rows.slice(0, 2).map(row => [row.previous_quantity, row.new_quantity]), [[10, 12], [12, 15]]);
    assert.equal(rows.rows[2].previous_quantity, 15);
    assert.equal(rows.rows[3].previous_quantity, rows.rows[2].new_quantity);
    assert.ok(rows.rows.every(row => row.employee_id === employeeId && row.reason));

    await inventory.adjustStock(variantId, employeeId, rows.rows[3].new_quantity, 'No-op');
    const afterNoop = await schemaClient.query('SELECT count(*)::int AS count FROM inventory_adjustments WHERE variant_id=$1', [variantId]);
    assert.equal(afterNoop.rows[0].count, 4);
    await assert.rejects(products.updateVariant(variantId, { stock_quantity: 20 }, employeeId), /reason is required/);
    await assert.rejects(inventory.adjustStock(variantId, employeeId + 100000, 20, 'Forged actor'), /foreign key constraint/);
    await assert.rejects(inventory.adjustStock(variantId, employeeId, 20, ' '), /chk_inventory_adjustments_reason_non_empty/);
    await assert.rejects(inventory.adjustStock(variantId, employeeId, -1, 'Negative quantity'), /check constraint/);
    await assert.rejects(schemaClient.query('UPDATE inventory_adjustments SET reason=\'rewritten\' WHERE variant_id=$1', [variantId]), /immutable/);

    await schemaClient.query(`
      CREATE FUNCTION reject_fix88_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.reason = 'force-audit-failure' THEN
          RAISE EXCEPTION 'injected audit failure';
        END IF;
        RETURN NEW;
      END;
      $$;
      CREATE TRIGGER reject_fix88_audit BEFORE INSERT ON inventory_adjustments
      FOR EACH ROW EXECUTE FUNCTION reject_fix88_audit();
    `);
    await assert.rejects(products.updateVariant(variantId, { stock_quantity: 30, reason: 'force-audit-failure' }, employeeId), /injected audit failure/);
    const afterFailure = await schemaClient.query('SELECT stock_quantity FROM product_variants WHERE variant_id=$1', [variantId]);
    assert.equal(afterFailure.rows[0].stock_quantity, rows.rows[3].new_quantity);

    await schemaClient.query('BEGIN');
    await schemaClient.query('UPDATE product_variants SET stock_quantity=stock_quantity-1 WHERE variant_id=$1', [variantId]);
    await schemaClient.query('COMMIT');
    const final = await schemaClient.query('SELECT stock_quantity FROM product_variants WHERE variant_id=$1', [variantId]);
    assert.equal(final.rows[0].stock_quantity, rows.rows[3].new_quantity - 1);
    const finalAudit = await schemaClient.query('SELECT count(*)::int AS count FROM inventory_adjustments WHERE variant_id=$1', [variantId]);
    assert.equal(finalAudit.rows[0].count, 4);

    await schemaClient.query('BEGIN');
    await schemaClient.query('SELECT variant_id FROM product_variants WHERE variant_id=$1 FOR UPDATE', [variantId]);
    const manualAfterCancellation = inventory.adjustStock(variantId, employeeId, final.rows[0].stock_quantity + 2, 'Post-cancellation count');
    await schemaClient.query('UPDATE product_variants SET stock_quantity=stock_quantity+1 WHERE variant_id=$1', [variantId]);
    await schemaClient.query('COMMIT');
    await manualAfterCancellation;
    const lastAudit = await schemaClient.query('SELECT previous_quantity,new_quantity FROM inventory_adjustments WHERE variant_id=$1 ORDER BY adjustment_id DESC LIMIT 1', [variantId]);
    assert.equal(lastAudit.rows[0].previous_quantity, final.rows[0].stock_quantity + 1);
    assert.equal(lastAudit.rows[0].new_quantity, final.rows[0].stock_quantity + 2);
  } finally {
    if (pool) await pool.end();
    if (schemaClient) await schemaClient.end();
    if (created) await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    await admin.end();
  }
});
