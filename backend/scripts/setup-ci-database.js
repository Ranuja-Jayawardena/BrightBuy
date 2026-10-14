const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'BrightBuy2026SecurePass!',
  database: process.env.DB_NAME || 'brightbuy_test'
});

async function runSqlFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await client.query(sql);
}

async function main() {
  console.log(`[CI DB Setup] Connecting to ${process.env.DB_NAME || 'brightbuy_test'} on ${process.env.DB_HOST || 'localhost'}...`);
  const client = await pool.connect();
  try {
    console.log('[CI DB Setup] Step 1: Cleaning public schema...');
    await client.query('DROP SCHEMA public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    await client.query('GRANT ALL ON SCHEMA public TO postgres;');
    await client.query('GRANT ALL ON SCHEMA public TO public;');

    // Pre-create flyway_schema_history to ensure V35 grants/revokes succeed
    await client.query(`
      CREATE TABLE IF NOT EXISTS flyway_schema_history (
        installed_rank INT PRIMARY KEY,
        version VARCHAR(50),
        description VARCHAR(200),
        type VARCHAR(20),
        script VARCHAR(1000),
        checksum INT,
        installed_by VARCHAR(100),
        installed_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time INT,
        success BOOLEAN
      );
    `);

    const migrationsDir = path.resolve(__dirname, '../db/migrations');
    const seedDir = path.resolve(__dirname, '../db/seed');

    // Base migrations V1 to V27
    const baseMigrations = [
      'V1__create_users.sql',
      'V2__create_cities.sql',
      'V3__create_employees.sql',
      'V4__create_refresh_tokens.sql',
      'V5__create_customers.sql',
      'V6__create_addresses.sql',
      'V7__create_categories.sql',
      'V8__create_variant_attributes.sql',
      'V9__create_products.sql',
      'V10__create_product_variants.sql',
      'V11__create_product_images.sql',
      'V12__create_product_categories.sql',
      'V13__create_variant_attribute_values.sql',
      'V14__create_carts.sql',
      'V15__create_cart_items.sql',
      'V16__create_orders.sql',
      'V17__create_order_items.sql',
      'V18__create_payments.sql',
      'V19__create_deliveries.sql',
      'V20__create_inventory_adjustments.sql',
      'V21__add_employee_role.sql',
      'V22__add_product_price_index.sql',
      'V23__add_search_trgm_index.sql',
      'V24__add_employee_active_status.sql',
      'V25__email_jobs_and_auth_tokens.sql',
      'V26__replace_image_data_with_image_url.sql',
      'V27__set_catalog_updated_at_on_update.sql'
    ];

    console.log('[CI DB Setup] Step 2: Applying base Flyway migrations (V1-V27)...');
    for (const file of baseMigrations) {
      await runSqlFile(client, path.join(migrationsDir, file));
    }

    console.log('[CI DB Setup] Step 3: Seeding baseline catalog, customer & order records...');
    const seedFiles = [
      '01_identity.sql',
      '02_customers.sql',
      '03_taxonomy.sql',
      '04_products.sql',
      '05_catalog_links.sql',
      '06_carts.sql',
      '07_orders.sql'
    ];

    for (const file of seedFiles) {
      await runSqlFile(client, path.join(seedDir, file));
    }

    console.log('[CI DB Setup] Step 4: Applying advanced constraint & concurrency migrations (V29-V36)...');
    const advancedMigrations = [
      'V29__cart_uniqueness_and_checkout_concurrency.sql',
      'V30__order_transitions_and_payment_uniqueness.sql',
      'V31__delivery_cardinality_and_mode_constraints.sql',
      'V32__super_admin_protection_trigger.sql',
      'V33__category_cycle_prevention_trigger.sql',
      'V34__inventory_adjustment_audit_trigger.sql',
      'V35__app_database_role_and_grants.sql',
      'V36__media_uploads_and_cleanup_ledger.sql'
    ];

    for (const file of advancedMigrations) {
      await runSqlFile(client, path.join(migrationsDir, file));
    }

    console.log('[CI DB Setup] Step 5: Verifying table counts in target database...');
    const prodCount = (await client.query('SELECT count(*) from products')).rows[0].count;
    const varCount = (await client.query('SELECT count(*) from product_variants')).rows[0].count;
    const catCount = (await client.query('SELECT count(*) from categories')).rows[0].count;
    const orderCount = (await client.query('SELECT count(*) from orders')).rows[0].count;
    const customerCount = (await client.query('SELECT count(*) from customers')).rows[0].count;

    console.log(`[CI DB Setup] Counts: Products=${prodCount}, Variants=${varCount}, Categories=${catCount}, Orders=${orderCount}, Customers=${customerCount}`);
    console.log('[CI DB Setup] Database setup and seed completed successfully!');
  } catch (err) {
    console.error('[CI DB Setup] ERROR during setup:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
