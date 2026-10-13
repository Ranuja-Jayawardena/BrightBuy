require('dotenv').config();
const { Client } = require('pg');

async function verifyAllImages(dbName) {
  console.log(`\n=================== Verifying all images in ${dbName} ===================`);
  const client = new Client({
    host: process.env.DB_HOST || '18.208.53.186',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'BrightBuy2026SecurePass!',
    database: dbName,
  });

  try {
    await client.connect();

    const res = await client.query(
      `SELECT image_id, product_id, is_primary, sort_order, image_url 
       FROM product_images 
       ORDER BY product_id, sort_order, image_id`
    );

    console.log(`Found ${res.rows.length} image rows in ${dbName}. Probing public HTTP delivery (GET)...`);

    let passed = 0;
    let failed = 0;
    const failures = [];

    // Probe in small batches
    for (let i = 0; i < res.rows.length; i += 10) {
      const batch = res.rows.slice(i, i + 10);
      await Promise.all(
        batch.map(async (row) => {
          try {
            const resp = await fetch(row.image_url, { signal: AbortSignal.timeout(5000) });
            if (resp.status === 200) {
              passed++;
            } else {
              failed++;
              failures.push({ row, status: resp.status });
            }
          } catch (err) {
            failed++;
            failures.push({ row, error: err.message });
          }
        })
      );
    }

    console.log(`Results for ${dbName}:`);
    console.log(`  Total probed: ${res.rows.length}`);
    console.log(`  Accessible (200 OK): ${passed}`);
    console.log(`  Failed / Missing: ${failed}`);

    if (failures.length > 0) {
      console.error('Failures encountered:', failures);
    } else {
      console.log(`  ALL ${passed} SEED/PRODUCT IMAGES RESOLVE TO ACCESSIBLE S3 OBJECTS (100% OK)!`);
    }

    return { total: res.rows.length, passed, failed, failures };
  } finally {
    await client.end();
  }
}

async function main() {
  const devResults = await verifyAllImages('brightbuy_dev');
  const prodResults = await verifyAllImages('brightbuy_prod');

  if (devResults.failed > 0 || prodResults.failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
