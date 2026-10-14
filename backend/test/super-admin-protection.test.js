const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const db = require('../src/config/db');

test.describe('Fix 8.6: Database Integrity - Concurrent Super Admin Protection', () => {
  let client;
  let c1;
  let c2;

  test.before(async () => {
    client = await db.connect();
    c1 = await db.connect();
    c2 = await db.connect();

    // Create temporary isolated testing tables with triggers matching V32 specification
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_users (
        user_id SERIAL PRIMARY KEY,
        email VARCHAR(100) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS test_employees (
        employee_id SERIAL PRIMARY KEY,
        user_id INT UNIQUE NOT NULL REFERENCES test_users(user_id) ON DELETE CASCADE,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(30) NOT NULL DEFAULT 'super_admin',
        is_active BOOLEAN NOT NULL DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS test_super_admin_guard (
        id INT PRIMARY KEY,
        last_action TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO test_super_admin_guard (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

      CREATE OR REPLACE FUNCTION test_protect_super_admin_invariant()
      RETURNS trigger AS $$
      DECLARE
        active_count INT;
      BEGIN
        IF OLD.role = 'super_admin' AND OLD.is_active = true AND
           (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND (NEW.role <> 'super_admin' OR NEW.is_active = false))) THEN

          UPDATE test_super_admin_guard SET last_action = clock_timestamp() WHERE id = 1;

          SELECT COUNT(*)::INT INTO active_count
          FROM test_employees
          WHERE role = 'super_admin' AND is_active = true;

          IF active_count <= 1 THEN
            RAISE EXCEPTION 'Cannot remove the last active super admin. At least one active super admin must exist in the system.'
              USING ERRCODE = 'P0001';
          END IF;
        END IF;

        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        ELSE
          RETURN NEW;
        END IF;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION test_verify_super_admin_statement()
      RETURNS trigger AS $$
      DECLARE
        active_count INT;
      BEGIN
        SELECT COUNT(*)::INT INTO active_count
        FROM test_employees
        WHERE role = 'super_admin' AND is_active = true;

        IF active_count < 1 THEN
          RAISE EXCEPTION 'Cannot remove the last active super admin. At least one active super admin must exist in the system.'
            USING ERRCODE = 'P0001';
        END IF;

        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_test_emp_row ON test_employees;
      CREATE TRIGGER trg_test_emp_row
      BEFORE UPDATE OR DELETE ON test_employees
      FOR EACH ROW
      EXECUTE FUNCTION test_protect_super_admin_invariant();

      DROP TRIGGER IF EXISTS trg_test_emp_stmt ON test_employees;
      CREATE TRIGGER trg_test_emp_stmt
      AFTER UPDATE OR DELETE ON test_employees
      FOR EACH STATEMENT
      EXECUTE FUNCTION test_verify_super_admin_statement();

      DROP TRIGGER IF EXISTS trg_test_users_stmt ON test_users;
      CREATE TRIGGER trg_test_users_stmt
      AFTER DELETE ON test_users
      FOR EACH STATEMENT
      EXECUTE FUNCTION test_verify_super_admin_statement();
    `);
  });

  test.after(async () => {
    try {
      await client.query(`
        DROP TABLE IF EXISTS test_employees CASCADE;
        DROP TABLE IF EXISTS test_users CASCADE;
        DROP TABLE IF EXISTS test_super_admin_guard CASCADE;
        DROP FUNCTION IF EXISTS test_protect_super_admin_invariant CASCADE;
        DROP FUNCTION IF EXISTS test_verify_super_admin_statement CASCADE;
      `);
    } finally {
      client.release();
      c1.release();
      c2.release();
    }
  });

  async function resetTestData(adminCount = 2) {
    await client.query('TRUNCATE test_employees, test_users CASCADE');
    for (let i = 1; i <= adminCount; i++) {
      await client.query(`INSERT INTO test_users (user_id, email) VALUES (${i}, 'admin${i}@example.com')`);
      await client.query(`INSERT INTO test_employees (employee_id, user_id, first_name, last_name, role, is_active) VALUES (${i}, ${i}, 'Admin', '${i}', 'super_admin', true)`);
    }
  }

  test('bootstrap succeeds: seeding initial super admin on empty table works', async () => {
    await resetTestData(1);
    const res = await client.query("SELECT COUNT(*)::INT FROM test_employees WHERE role = 'super_admin' AND is_active = true");
    assert.equal(res.rows[0].count, 1);
  });

  test('single active super admin: demotion is rejected with P0001', async () => {
    await resetTestData(1);
    await assert.rejects(
      async () => {
        await client.query("UPDATE test_employees SET role = 'analyst' WHERE employee_id = 1");
      },
      (err) => {
        assert.equal(err.code, 'P0001');
        assert.match(err.message, /Cannot remove the last active super admin/);
        return true;
      }
    );
  });

  test('single active super admin: deactivation is rejected with P0001', async () => {
    await resetTestData(1);
    await assert.rejects(
      async () => {
        await client.query("UPDATE test_employees SET is_active = false WHERE employee_id = 1");
      },
      (err) => {
        assert.equal(err.code, 'P0001');
        assert.match(err.message, /Cannot remove the last active super admin/);
        return true;
      }
    );
  });

  test('single active super admin: deletion is rejected with P0001', async () => {
    await resetTestData(1);
    await assert.rejects(
      async () => {
        await client.query("DELETE FROM test_employees WHERE employee_id = 1");
      },
      (err) => {
        assert.equal(err.code, 'P0001');
        assert.match(err.message, /Cannot remove the last active super admin/);
        return true;
      }
    );
  });

  test('single active super admin: cascade deletion from users is blocked', async () => {
    await resetTestData(1);
    await assert.rejects(
      async () => {
        await client.query("DELETE FROM test_users WHERE user_id = 1");
      },
      (err) => {
        assert.equal(err.code, 'P0001');
        return true;
      }
    );

    const userCheck = await client.query("SELECT * FROM test_users WHERE user_id = 1");
    const empCheck = await client.query("SELECT * FROM test_employees WHERE employee_id = 1");
    assert.equal(userCheck.rows.length, 1);
    assert.equal(empCheck.rows.length, 1);
  });

  test('profile update on single super admin is allowed without restriction', async () => {
    await resetTestData(1);
    await client.query("UPDATE test_employees SET first_name = 'UpdatedRoot', phone = '0770001122' WHERE employee_id = 1");
    const res = await client.query("SELECT first_name, phone FROM test_employees WHERE employee_id = 1");
    assert.equal(res.rows[0].first_name, 'UpdatedRoot');
    assert.equal(res.rows[0].phone, '0770001122');
  });

  test('promotion of another employee followed by demotion of first is allowed', async () => {
    await resetTestData(1);
    await client.query("INSERT INTO test_users (user_id, email) VALUES (2, 'second@example.com')");
    await client.query("INSERT INTO test_employees (employee_id, user_id, first_name, last_name, role, is_active) VALUES (2, 2, 'Second', 'User', 'analyst', true)");

    // Promote second
    await client.query("UPDATE test_employees SET role = 'super_admin' WHERE employee_id = 2");
    // Now demote first
    await client.query("UPDATE test_employees SET role = 'catalog_manager' WHERE employee_id = 1");

    const admins = await client.query("SELECT employee_id FROM test_employees WHERE role = 'super_admin' AND is_active = true");
    assert.equal(admins.rows.length, 1);
    assert.equal(admins.rows[0].employee_id, 2);
  });

  test('bulk deactivation statement deactivating all super admins is rejected', async () => {
    await resetTestData(2);
    await assert.rejects(
      async () => {
        await client.query("UPDATE test_employees SET is_active = false WHERE role = 'super_admin'");
      },
      (err) => {
        assert.equal(err.code, 'P0001');
        return true;
      }
    );

    const check = await client.query("SELECT COUNT(*)::INT FROM test_employees WHERE role = 'super_admin' AND is_active = true");
    assert.equal(check.rows[0].count, 2);
  });

  test('concurrency: race condition between two concurrent admin deactivations is serialized and guarded', async () => {
    await resetTestData(2);

    await c1.query('BEGIN');
    await c2.query('BEGIN');

    // C1 updates admin 1
    await c1.query('UPDATE test_employees SET is_active = false WHERE employee_id = 1');

    let c2Err = null;
    let c2Done = false;

    const c2Promise = c2.query('UPDATE test_employees SET is_active = false WHERE employee_id = 2')
      .then(() => c2.query('COMMIT'))
      .catch((err) => {
        c2Err = err;
        return c2.query('ROLLBACK');
      })
      .finally(() => {
        c2Done = true;
      });

    // Wait 300ms to verify C2 is blocked waiting on the guard row lock
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(c2Done, false, 'C2 should be blocked waiting for C1 to release guard row lock');

    // Commit C1
    await c1.query('COMMIT');
    await c2Promise;

    assert.ok(c2Err, 'C2 should have been rejected');
    assert.equal(c2Err.code, 'P0001');

    const finalCount = await client.query("SELECT COUNT(*)::INT FROM test_employees WHERE role = 'super_admin' AND is_active = true");
    assert.equal(finalCount.rows[0].count, 1, 'Exactly 1 active super admin must remain');
  });
});
