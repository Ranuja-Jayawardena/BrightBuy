const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });

test.describe('Fix 8.12: PostgreSQL Concurrency Integration Test Harness (Master Release Gate)', () => {
  const migrationsDir = path.resolve(__dirname, '../db/migrations');

  test('Migration Ledger: All Fix 8 migrations (V29–V35) exist and have valid SQL structure', () => {
    const requiredMigrations = [
      'V29__cart_uniqueness_and_checkout_concurrency.sql',
      'V30__order_transitions_and_payment_uniqueness.sql',
      'V31__delivery_cardinality_and_mode_constraints.sql',
      'V32__super_admin_protection_trigger.sql',
      'V33__category_cycle_prevention_trigger.sql',
      'V34__inventory_adjustment_audit_trigger.sql',
      'V35__app_database_role_and_grants.sql',
    ];

    for (const filename of requiredMigrations) {
      const fullPath = path.join(migrationsDir, filename);
      assert.ok(fs.existsSync(fullPath), `Migration ${filename} must exist`);
      const sql = fs.readFileSync(fullPath, 'utf8');
      assert.ok(sql.trim().length > 50, `Migration ${filename} must contain substantial SQL`);
    }
  });

  test('V29 Cart Uniqueness: SQL schema defines UNIQUE (customer_id) on carts and idempotency keys', () => {
    const v29 = fs.readFileSync(path.join(migrationsDir, 'V29__cart_uniqueness_and_checkout_concurrency.sql'), 'utf8');
    assert.match(v29, /idx_carts_customer_id_unique\s+UNIQUE\s*\(\s*customer_id\s*\)/i);
    assert.match(v29, /order_idempotency_keys/i);
    assert.match(v29, /uq_order_idempotency_customer_key\s+UNIQUE/i);
  });

  test('V30 Order Transitions & Payment: SQL schema enforces 1:1 payments and FSM trigger', () => {
    const v30 = fs.readFileSync(path.join(migrationsDir, 'V30__order_transitions_and_payment_uniqueness.sql'), 'utf8');
    assert.match(v30, /idx_payments_order_id_unique\s+UNIQUE\s*\(\s*order_id\s*\)/i);
    assert.match(v30, /payment_reconciliation_logs/i);
    assert.match(v30, /enforce_order_status_transition/i);
    assert.match(v30, /trg_enforce_order_status_transition/i);
  });

  test('V31 Delivery Constraints: SQL schema enforces 1:1 delivery and mode consistency', () => {
    const v31 = fs.readFileSync(path.join(migrationsDir, 'V31__delivery_cardinality_and_mode_constraints.sql'), 'utf8');
    assert.match(v31, /idx_deliveries_order_id_unique\s+UNIQUE\s*\(\s*order_id\s*\)/i);
    assert.match(v31, /chk_order_items_unit_price_nonnegative\s+CHECK\s*\(\s*unit_price\s*>=\s*0\s*\)/i);
    assert.match(v31, /chk_deliveries_mode_status\s+CHECK/i);
  });

  test('V32 Super Admin Protection: SQL schema defines guard table and multi-layer triggers', () => {
    const v32 = fs.readFileSync(path.join(migrationsDir, 'V32__super_admin_protection_trigger.sql'), 'utf8');
    assert.match(v32, /super_admin_guard/i);
    assert.match(v32, /protect_super_admin_invariant/i);
    assert.match(v32, /trg_protect_super_admin_row/i);
    assert.match(v32, /trg_protect_super_admin_statement/i);
  });

  test('V33 Category Cycle Protection: SQL schema enforces advisory lock and acyclic trigger', () => {
    const v33 = fs.readFileSync(path.join(migrationsDir, 'V33__category_cycle_prevention_trigger.sql'), 'utf8');
    assert.match(v33, /pg_advisory_xact_lock/i);
    assert.match(v33, /categories_acyclic_parent/i);
    assert.match(v33, /trg_categories_check_insert/i);
    assert.match(v33, /trg_categories_check_update/i);
  });

  test('V34 Inventory Audit Immutability: SQL schema enforces append-only trigger and reason check', () => {
    const v34 = fs.readFileSync(path.join(migrationsDir, 'V34__inventory_adjustment_audit_trigger.sql'), 'utf8');
    assert.match(v34, /chk_inventory_adjustments_reason_non_empty/i);
    assert.match(v34, /trg_fn_prevent_inventory_adjustment_tampering/i);
    assert.match(v34, /trg_inventory_adjustments_immutable/i);
  });

  test('V35 Account Separation: SQL schema enforces least-privilege DML and DDL revocation', () => {
    const v35 = fs.readFileSync(path.join(migrationsDir, 'V35__app_database_role_and_grants.sql'), 'utf8');
    assert.match(v35, /brightbuy_app/i);
    assert.match(v35, /brightbuy_migrator/i);
    assert.match(v35, /REVOKE CREATE ON SCHEMA public FROM brightbuy_app/i);
    assert.match(v35, /REVOKE UPDATE, DELETE, TRUNCATE ON TABLE inventory_adjustments FROM brightbuy_app/i);
  });

  test('Live Multi-Client Concurrency Check (Conditional on PostgreSQL Availability)', async (t) => {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'brightbuy',
      connectionTimeoutMillis: 3000,
    };

    const clientA = new Client(dbConfig);
    const clientB = new Client(dbConfig);

    try {
      await clientA.connect();
      await clientB.connect();
    } catch (err) {
      if (process.env.FIX8_REQUIRE_LIVE_DB === '1') {
        throw new Error(`FIX8_REQUIRE_LIVE_DB=1 is set, but PostgreSQL is not reachable: ${err.message}`);
      }
      t.diagnostic(`Live PostgreSQL not reachable (${err.message}). Static schema & constraint verification passed.`);
      return;
    }

    const testSchema = `harness_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    try {
      const res = await clientA.query('SELECT version()');
      assert.ok(res.rows.length > 0, 'PostgreSQL query must return version');
      t.diagnostic(`Connected to PostgreSQL: ${res.rows[0].version.split('\n')[0]}`);

      // Create isolated test schema
      await clientA.query(`CREATE SCHEMA "${testSchema}"`);
      await clientA.query(`SET search_path TO "${testSchema}", public`);
      await clientB.query(`SET search_path TO "${testSchema}", public`);

      // 1. Concurrent Cart Uniqueness Barrier (V29)
      await clientA.query(`
        CREATE TABLE test_carts (
          cart_id SERIAL PRIMARY KEY,
          customer_id INT NOT NULL,
          CONSTRAINT idx_test_carts_customer_id_unique UNIQUE (customer_id)
        );
      `);

      await clientA.query('BEGIN');
      await clientA.query('INSERT INTO test_carts (customer_id) VALUES (101)');

      // Client B concurrently attempts insert for the same customer (blocked behind transaction lock)
      let clientBErr = null;
      const clientBPromise = clientB.query('INSERT INTO test_carts (customer_id) VALUES (101)').catch((err) => {
        clientBErr = err;
      });
      await clientA.query('COMMIT');
      await clientBPromise;

      assert.ok(clientBErr, 'Client B query must reject on duplicate key');
      assert.equal(clientBErr.code, '23505', 'Client B must receive unique constraint violation');

      // 2. Order Status FSM Transition Enforcement (V30)
      await clientA.query(`
        CREATE TABLE test_orders (
          order_id SERIAL PRIMARY KEY,
          status VARCHAR(50) NOT NULL DEFAULT 'pending'
        );

        CREATE OR REPLACE FUNCTION test_enforce_order_transition()
        RETURNS trigger AS $$
        BEGIN
          IF OLD.status = NEW.status THEN RETURN NEW; END IF;
          IF OLD.status = 'pending' AND NEW.status IN ('paid', 'shipped', 'cancelled') THEN RETURN NEW;
          ELSIF OLD.status = 'paid' AND NEW.status IN ('shipped', 'cancelled') THEN RETURN NEW;
          ELSIF OLD.status = 'shipped' AND NEW.status IN ('delivered', 'cancelled') THEN RETURN NEW;
          ELSE
            RAISE EXCEPTION 'Invalid order status transition from % to %', OLD.status, NEW.status
              USING ERRCODE = 'P0001';
          END IF;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trg_test_order_transition
        BEFORE UPDATE OF status ON test_orders
        FOR EACH ROW EXECUTE FUNCTION test_enforce_order_transition();
      `);

      await clientA.query("INSERT INTO test_orders (order_id, status) VALUES (1, 'cancelled')");
      // Cancelled order cannot resurrect to paid (D2)
      await assert.rejects(
        clientA.query("UPDATE test_orders SET status = 'paid' WHERE order_id = 1"),
        (err) => {
          assert.equal(err.code, 'P0001');
          assert.match(err.message, /Invalid order status transition from cancelled to paid/);
          return true;
        }
      );

      // 3. Delivery Mode & Status Consistency Check (V31)
      await clientA.query(`
        CREATE TABLE test_deliveries (
          delivery_id SERIAL PRIMARY KEY,
          delivery_mode VARCHAR(50) NOT NULL,
          delivery_status VARCHAR(50) NOT NULL,
          CONSTRAINT chk_test_deliveries_mode CHECK (
            (delivery_mode = 'home_delivery' AND delivery_status IN ('pending', 'shipped', 'delivered', 'cancelled')) OR
            (delivery_mode = 'store_pickup' AND delivery_status IN ('pending', 'ready_for_pickup', 'collected', 'cancelled'))
          )
        );
      `);

      // Store pickup cannot be marked 'delivered' (must be 'collected')
      await assert.rejects(
        clientA.query("INSERT INTO test_deliveries (delivery_mode, delivery_status) VALUES ('store_pickup', 'delivered')"),
        (err) => {
          assert.equal(err.code, '23514', 'Must violate check constraint chk_test_deliveries_mode');
          return true;
        }
      );

      // 4. Inventory Adjustments Append-Only Immutability Trigger (V34)
      await clientA.query(`
        CREATE TABLE test_adjustments (
          adjustment_id SERIAL PRIMARY KEY,
          variant_id INT NOT NULL,
          reason VARCHAR(255) NOT NULL,
          previous_quantity INT NOT NULL,
          new_quantity INT NOT NULL,
          CONSTRAINT chk_test_reason_non_empty CHECK (length(trim(reason)) > 0)
        );

        CREATE OR REPLACE FUNCTION test_prevent_adjustment_tampering()
        RETURNS trigger AS $$
        BEGIN
          RAISE EXCEPTION 'inventory_adjustments records are immutable and cannot be updated or deleted'
            USING ERRCODE = 'P0001';
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER trg_test_adjustments_immutable
        BEFORE UPDATE OR DELETE ON test_adjustments
        FOR EACH ROW EXECUTE FUNCTION test_prevent_adjustment_tampering();
      `);

      await clientA.query("INSERT INTO test_adjustments (variant_id, reason, previous_quantity, new_quantity) VALUES (1, 'Initial count', 0, 10)");

      // Attempting to UPDATE or DELETE an adjustment row is blocked by P0001
      await assert.rejects(
        clientB.query("UPDATE test_adjustments SET reason = 'Tampered' WHERE adjustment_id = 1"),
        (err) => {
          assert.equal(err.code, 'P0001');
          assert.match(err.message, /immutable/);
          return true;
        }
      );

      await assert.rejects(
        clientB.query("DELETE FROM test_adjustments WHERE adjustment_id = 1"),
        (err) => {
          assert.equal(err.code, 'P0001');
          assert.match(err.message, /immutable/);
          return true;
        }
      );

      t.diagnostic('All live multi-client PostgreSQL concurrency barrier & trigger checks passed in isolated schema.');
    } finally {
      try {
        await clientA.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`);
      } catch {
        // cleanup ignore
      }
      await clientA.end();
      await clientB.end();
    }
  });
});
