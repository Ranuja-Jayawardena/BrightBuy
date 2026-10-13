const fs = require('fs');
const path = require('path');
const { Pool } = require('../backend/node_modules/pg');

const pool = new Pool({
  host: '18.208.53.186',
  port: 5432,
  user: 'postgres',
  password: 'BrightBuy2026SecurePass!',
  database: 'brightbuy_reseed_test'
});

async function runSqlFile(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await client.query(sql);
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('--- Step 1: Wiping test database schema ---');
    await client.query('DROP SCHEMA public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    await client.query('GRANT ALL ON SCHEMA public TO postgres;');
    await client.query('GRANT ALL ON SCHEMA public TO public;');
    console.log('Schema wiped successfully.');

    console.log('\n--- Step 2: Executing Flyway schema migrations ---');
    const migrationsDir = path.resolve(__dirname, '../backend/db/migrations');
    const migrationFiles = [
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
      'V27__set_catalog_updated_at_on_update.sql',
      'V32__super_admin_protection_trigger.sql'
    ];

    for (const file of migrationFiles) {
      process.stdout.write(`Applying migration ${file}... `);
      await runSqlFile(client, path.join(migrationsDir, file));
      console.log('OK');
    }

    console.log('\n--- Step 3: Executing seed scripts in strict order ---');
    const seedDir = path.resolve(__dirname, '../backend/db/seed');
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
      process.stdout.write(`Applying seed ${file}... `);
      await runSqlFile(client, path.join(seedDir, file));
      console.log('OK');
    }

    console.log('\n--- Step 4: Verification of Seed Data & Referential Integrity ---');
    const prodCount = (await client.query('SELECT count(*) from products')).rows[0].count;
    const varCount = (await client.query('SELECT count(*) from product_variants')).rows[0].count;
    const imgCount = (await client.query('SELECT count(*) from product_images')).rows[0].count;
    const catCount = (await client.query('SELECT count(*) from categories')).rows[0].count;
    const orderCount = (await client.query('SELECT count(*) from orders')).rows[0].count;
    const orderItemCount = (await client.query('SELECT count(*) from order_items')).rows[0].count;

    console.log(`Total Products: ${prodCount} (Expected: 40)`);
    console.log(`Total Variants: ${varCount} (Expected: 65)`);
    console.log(`Total Images: ${imgCount} (Expected: 80)`);
    console.log(`Total Categories: ${catCount} (Expected: 17)`);
    console.log(`Total Orders: ${orderCount} (Expected: 35)`);
    console.log(`Total Order Items: ${orderItemCount}`);

    // Check for non-tech items
    const nonTech = await client.query(`
      SELECT count(*) FROM products 
      WHERE base_sku ~ '^(HAP|KIT|CLN|APP|MCL|WCL)-'
    `);
    console.log(`Non-tech products remaining: ${nonTech.rows[0].count} (Expected: 0)`);

    // Check dynamic brands
    const brands = await client.query('SELECT DISTINCT brand FROM products ORDER BY brand');
    console.log('Dynamic Brands:', brands.rows.map(b => b.brand).join(', '));

    // Verify S3 image URLs
    const s3Check = await client.query(`
      SELECT count(*) FROM product_images 
      WHERE image_url NOT LIKE 'https://brightbuy-media-storage-695945476492.s3.us-east-1.amazonaws.com/%'
    `);
    console.log(`Non-S3 image URLs: ${s3Check.rows[0].count} (Expected: 0)`);

    if (
      Number(prodCount) === 40 &&
      Number(varCount) === 65 &&
      Number(imgCount) === 80 &&
      Number(nonTech.rows[0].count) === 0 &&
      Number(s3Check.rows[0].count) === 0
    ) {
      console.log('\n>>> SUCCESS: Reseed pipeline and integrity verification PASSED 100%! <<<');
    } else {
      throw new Error('Integrity verification failed!');
    }

  } catch (err) {
    console.error('\nERROR during reseed pipeline:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
