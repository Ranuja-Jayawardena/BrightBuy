require('dotenv').config();
const { Client } = require('pg');

async function inspectDb(dbName) {
  console.log(`\n=================== Inspecting ${dbName} ===================`);
  const client = new Client({
    host: process.env.DB_HOST || '18.208.53.186',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'BrightBuy2026SecurePass!',
    database: dbName,
  });

  try {
    await client.connect();

    // 1. Flyway history
    const flywayRes = await client.query(
      `SELECT installed_rank, version, description, type, script, checksum, installed_on, success 
       FROM flyway_schema_history 
       ORDER BY installed_rank`
    );
    console.log(`Flyway migrations applied (${flywayRes.rows.length}):`);
    for (const r of flywayRes.rows) {
      console.log(`  [${r.installed_rank}] V${r.version}: ${r.description} (${r.script}) - success: ${r.success}, on: ${r.installed_on}`);
    }

    // 2. product_images schema
    const colRes = await client.query(
      `SELECT table_schema, column_name, data_type, character_maximum_length, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'product_images'
       ORDER BY table_schema, ordinal_position`
    );
    console.log('\nColumns on product_images:');
    for (const c of colRes.rows) {
      console.log(`  - ${c.column_name}: ${c.data_type}${c.character_maximum_length ? `(${c.character_maximum_length})` : ''} (nullable: ${c.is_nullable})`);
    }

    const idxRes = await client.query(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'product_images'`
    );
    console.log('\nIndexes on product_images:');
    for (const idx of idxRes.rows) {
      console.log(`  - ${idx.indexname}: ${idx.indexdef}`);
    }

    const conRes = await client.query(
      `SELECT conname, contype, pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c
       JOIN pg_class t ON c.conrelid = t.oid
       WHERE t.relname = 'product_images'`
    );
    console.log('\nConstraints on product_images:');
    for (const con of conRes.rows) {
      console.log(`  - ${con.conname} (${con.contype}): ${con.def}`);
    }

    // 3. Row count and columns check
    const hasImageData = colRes.rows.some(c => c.column_name === 'image_data');
    const hasImageUrl = colRes.rows.some(c => c.column_name === 'image_url');

    console.log(`\nData state: hasImageData=${hasImageData}, hasImageUrl=${hasImageUrl}`);

    if (hasImageData) {
      const dataRes = await client.query(
        `SELECT image_id, product_id, is_primary, sort_order, octet_length(image_data) AS byte_count 
         FROM product_images ORDER BY image_id LIMIT 10`
      );
      console.log(`Sample BYTEA rows (${dataRes.rows.length}):`, dataRes.rows);
    }

    if (hasImageUrl) {
      const countRes = await client.query(`SELECT count(*) FROM product_images`);
      console.log(`Total rows in product_images: ${countRes.rows[0].count}`);

      const sampleRes = await client.query(
        `SELECT image_id, product_id, image_url, is_primary, sort_order 
         FROM product_images ORDER BY image_id LIMIT 10`
      );
      console.log('Sample image_url rows:', sampleRes.rows);

      // Check duplicates
      const dupRes = await client.query(
        `SELECT image_url, count(*) AS ref_count, array_agg(image_id ORDER BY image_id) AS image_ids
         FROM product_images GROUP BY image_url HAVING count(*) > 1`
      );
      console.log(`Duplicate URLs count: ${dupRes.rows.length}`);
      if (dupRes.rows.length > 0) {
        console.log('Sample duplicate URLs:', dupRes.rows.slice(0, 5));
      }
    }

  } catch (err) {
    console.error(`Error inspecting ${dbName}:`, err.message);
  } finally {
    await client.end();
  }
}

async function main() {
  await inspectDb('brightbuy_dev');
  await inspectDb('brightbuy_prod');
}

main().catch(console.error);
