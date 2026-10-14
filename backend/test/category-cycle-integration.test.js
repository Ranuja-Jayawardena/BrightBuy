const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

test('Fix 8.7: category hierarchy survives direct SQL and concurrent writes', {
  skip: process.env.FIX87_RUN_DB_TESTS !== '1' && 'Set FIX87_RUN_DB_TESTS=1 for isolated PostgreSQL integration',
}, async () => {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
  const { Client } = require('pg');
  const settings = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 5000,
  };
  const schema = `fix87_${crypto.randomBytes(6).toString('hex')}`;
  const quotedSchema = `"${schema}"`;
  const clients = [new Client(settings), new Client(settings), new Client(settings)];
  const [admin, first, second] = clients;
  const migration = fs.readFileSync(path.resolve(__dirname, '../db/migrations/V33__category_cycle_prevention_trigger.sql'), 'utf8');
  let created = false;

  try {
    for (const client of clients) await client.connect();
    await admin.query(`CREATE SCHEMA ${quotedSchema}`);
    created = true;
    for (const client of clients) {
      await client.query(`SET search_path TO ${quotedSchema}, public`);
      await client.query('SET lock_timeout = 5000');
    }
    await admin.query(`
      CREATE TABLE categories (
        category_id serial PRIMARY KEY,
        category_name varchar(100) NOT NULL,
        parent_category_id int REFERENCES categories(category_id),
        is_active boolean NOT NULL DEFAULT true
      )
    `);

    // Prove a dirty hierarchy is diagnosed and the migration cannot install.
    await admin.query("INSERT INTO categories(category_name) VALUES ('A'), ('B')");
    await admin.query('UPDATE categories SET parent_category_id = CASE category_id WHEN 1 THEN 2 WHEN 2 THEN 1 END');
    await admin.query('BEGIN');
    await assert.rejects(admin.query(migration), (error) => error.code === 'P0001' && error.constraint === 'categories_acyclic_parent' && /category_id/.test(error.detail));
    await admin.query('ROLLBACK');
    await admin.query('UPDATE categories SET parent_category_id = NULL');

    await admin.query('BEGIN');
    await admin.query(migration);
    await admin.query('COMMIT');

    const root = await admin.query("INSERT INTO categories(category_name) VALUES ('New root') RETURNING category_id");
    const newRootId = root.rows[0].category_id;
    const child = await admin.query("INSERT INTO categories(category_name, parent_category_id) VALUES ('C', 1) RETURNING category_id");
    const c = child.rows[0].category_id;
    const grandchild = await admin.query("INSERT INTO categories(category_name, parent_category_id) VALUES ('D', $1) RETURNING category_id", [c]);
    const d = grandchild.rows[0].category_id;
    await assert.rejects(admin.query('UPDATE categories SET parent_category_id = $1 WHERE category_id = 1', [d]), (error) => error.code === 'P0001' && error.constraint === 'categories_acyclic_parent');
    await admin.query('UPDATE categories SET parent_category_id = 2 WHERE category_id = $1', [c]);
    await admin.query('UPDATE categories SET is_active = false WHERE category_id = $1', [d]);
    await admin.query('UPDATE categories SET is_active = true WHERE category_id = $1', [d]);
    await assert.rejects(admin.query('UPDATE categories SET parent_category_id = category_id WHERE category_id = 1'), (error) => error.code === 'P0001' && error.constraint === 'categories_acyclic_parent');
    await assert.rejects(admin.query('UPDATE categories SET parent_category_id = $1 WHERE category_id = 2', [c]), (error) => error.code === 'P0001' && error.constraint === 'categories_acyclic_parent');
    await assert.rejects(admin.query('UPDATE categories SET category_id = 100 WHERE category_id = 1'), (error) => error.code === 'P0001' && error.constraint === 'categories_id_immutable');
    await assert.rejects(admin.query('UPDATE categories SET parent_category_id = CASE category_id WHEN 1 THEN 2 WHEN 2 THEN 1 ELSE parent_category_id END WHERE category_id IN (1, 2)'), (error) => error.code === 'P0001' && error.constraint === 'categories_acyclic_parent');
    await assert.rejects(admin.query("INSERT INTO categories(category_id, category_name, parent_category_id) VALUES (100, 'Self', 100)"), (error) => error.code === 'P0001' && error.constraint === 'categories_acyclic_parent');

    await first.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    await assert.rejects(first.query('UPDATE categories SET parent_category_id = 2 WHERE category_id = 1'), (error) => error.code === 'P0001');
    await first.query('ROLLBACK');

    // Two opposite reparentings cannot both commit. The second waits for the
    // advisory lock, sees the first committed parent, and fails atomically.
    await first.query('BEGIN');
    await second.query('BEGIN');
    await first.query('UPDATE categories SET parent_category_id = 2 WHERE category_id = 1');
    const competing = second.query('UPDATE categories SET parent_category_id = 1 WHERE category_id = 2');
    await new Promise((resolve) => setTimeout(resolve, 100));
    await first.query('COMMIT');
    await assert.rejects(competing, (error) => error.code === 'P0001' && error.constraint === 'categories_acyclic_parent');
    await second.query('ROLLBACK');

    const final = await admin.query('SELECT category_id, parent_category_id, is_active FROM categories ORDER BY category_id');
    assert.equal(final.rows.find((row) => row.category_id === 1).parent_category_id, 2);
    assert.equal(final.rows.find((row) => row.category_id === 2).parent_category_id, null);
    assert.equal(final.rows.find((row) => row.category_id === c).parent_category_id, 2);
    assert.equal(final.rows.find((row) => row.category_id === d).is_active, true);
    assert.equal(final.rows.length, 5);
    const storefront = await admin.query('SELECT category_id FROM categories WHERE is_active = true ORDER BY category_name');
    assert.deepEqual(storefront.rows.map((row) => row.category_id).sort((a, b) => a - b), [1, 2, c, d, newRootId].sort((a, b) => a - b));
  } finally {
    for (const client of clients) await client.query('ROLLBACK').catch(() => {});
    for (const client of clients.slice(1)) await client.end().catch(() => {});
    if (created) await admin.query(`DROP SCHEMA ${quotedSchema} CASCADE`).catch(() => {});
    await admin.end().catch(() => {});
  }
});
