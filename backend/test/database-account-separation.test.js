const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test.describe('Fix 8.11: Application & Migration Database Accounts (Least-Privilege Separation)', () => {
  const migrationPath = path.resolve(__dirname, '../db/migrations/V35__app_database_role_and_grants.sql');

  test('V35 migration file exists and is readable', () => {
    assert.ok(fs.existsSync(migrationPath), 'V35 migration file must exist');
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(content.length > 0, 'V35 migration file must not be empty');
  });

  test('V35 defines idempotent role provisioning for brightbuy_app and brightbuy_migrator', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.match(content, /rolname\s*=\s*'brightbuy_app'/, 'V35 must check for brightbuy_app role');
    assert.match(content, /CREATE ROLE brightbuy_app WITH LOGIN/, 'V35 must create brightbuy_app with login');
    assert.match(content, /rolname\s*=\s*'brightbuy_migrator'/, 'V35 must check for brightbuy_migrator role');
    assert.match(content, /CREATE ROLE brightbuy_migrator WITH LOGIN/, 'V35 must create brightbuy_migrator with login');
  });

  test('V35 revokes schema CREATE from PUBLIC and brightbuy_app to prevent unauthorized DDL', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.match(content, /REVOKE CREATE ON SCHEMA public FROM PUBLIC/i, 'Must revoke CREATE from PUBLIC');
    assert.match(content, /REVOKE CREATE ON SCHEMA public FROM brightbuy_app/i, 'Must revoke CREATE from brightbuy_app');
    assert.match(content, /GRANT USAGE ON SCHEMA public TO brightbuy_app/i, 'Must grant USAGE to brightbuy_app');
  });

  test('V35 grants least-privilege DML to brightbuy_app with append-only restrictions on audit tables', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.match(content, /GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO brightbuy_app/i);
    assert.match(content, /REVOKE UPDATE, DELETE, TRUNCATE ON TABLE inventory_adjustments FROM brightbuy_app/i, 'Must revoke UPDATE/DELETE on inventory_adjustments');
    assert.match(content, /REVOKE UPDATE, DELETE, TRUNCATE ON TABLE payment_reconciliation_logs FROM brightbuy_app/i, 'Must revoke UPDATE/DELETE on payment_reconciliation_logs');
    assert.match(content, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE flyway_schema_history FROM brightbuy_app/i, 'Must prevent app writes to migration history');
  });

  test('V35 configures sequence usage and default privileges for future objects', () => {
    const content = fs.readFileSync(migrationPath, 'utf8');
    assert.match(content, /GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO brightbuy_app/i);
    assert.match(content, /GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO brightbuy_app/i);
    assert.match(content, /ALTER DEFAULT PRIVILEGES IN SCHEMA public/i);
  });

  test('db.js config supports DB_APP_USER and DB_APP_PASSWORD fallback', () => {
    const dbConfigPath = path.resolve(__dirname, '../src/config/db.js');
    const dbConfigContent = fs.readFileSync(dbConfigPath, 'utf8');
    assert.match(dbConfigContent, /DB_APP_USER/, 'db.js must support DB_APP_USER');
    assert.match(dbConfigContent, /DB_APP_PASSWORD/, 'db.js must support DB_APP_PASSWORD');
    assert.match(dbConfigContent, /brightbuy_app/, 'db.js should default to brightbuy_app');
  });
});
