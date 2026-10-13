const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const db = require('../src/config/db');

test.describe('Fix 6.3: Real PostgreSQL Concurrency, Row Locking & Cleanup Verification', () => {
  let adminClient;
  let c1;
  let c2;
  const testProductId = 88888;

  test.before(async () => {
    adminClient = await db.connect();
    c1 = await db.connect();
    c2 = await db.connect();

    // 1. Ensure test schema tables matching V36 exist
    await adminClient.query(`
      CREATE TABLE IF NOT EXISTS media_uploads (
        upload_id UUID PRIMARY KEY,
        product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
        issuer_id INT NOT NULL REFERENCES users(user_id),
        staging_key VARCHAR(500) NOT NULL,
        final_key VARCHAR(500) NOT NULL,
        expected_mime VARCHAR(50) NOT NULL,
        expected_size INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        image_id INT REFERENCES product_images(image_id) ON DELETE SET NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_media_uploads_product_status ON media_uploads(product_id, status);
      CREATE INDEX IF NOT EXISTS idx_media_uploads_expiry ON media_uploads(expires_at) WHERE status = 'pending';
      CREATE UNIQUE INDEX IF NOT EXISTS idx_media_uploads_final_key ON media_uploads(final_key) WHERE status = 'completed';

      CREATE TABLE IF NOT EXISTS media_cleanup_jobs (
        job_id SERIAL PRIMARY KEY,
        s3_key VARCHAR(500) NOT NULL,
        reason VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        max_attempts INT NOT NULL DEFAULT 5,
        next_retry_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_media_cleanup_pending ON media_cleanup_jobs(status, next_retry_at) 
      WHERE status IN ('pending', 'failed');
    `);

    // Clean any previous test artifacts
    await adminClient.query('DELETE FROM product_images WHERE product_id = $1', [testProductId]);
    await adminClient.query('DELETE FROM media_uploads WHERE product_id = $1', [testProductId]);
    await adminClient.query('DELETE FROM products WHERE product_id = $1', [testProductId]);

    // Insert dummy product for concurrency testing
    await adminClient.query(`
      INSERT INTO products (product_id, product_name, brand, base_sku, is_active)
      VALUES ($1, 'Concurrency Test Product', 'TestBrand', 'CONCUR-TEST-001', true)
      ON CONFLICT (product_id) DO NOTHING
    `, [testProductId]);
  });

  test.after(async () => {
    if (adminClient) {
      await adminClient.query('DELETE FROM product_images WHERE product_id = $1', [testProductId]);
      await adminClient.query('DELETE FROM media_uploads WHERE product_id = $1', [testProductId]);
      await adminClient.query('DELETE FROM products WHERE product_id = $1', [testProductId]);
      adminClient.release();
    }
    if (c1) c1.release();
    if (c2) c2.release();
  });

  test('T10: Simultaneous primary image writes serialized via product lock with single primary invariant', async () => {
    // Both clients attempt to insert an image with is_primary = true concurrently
    await c1.query('BEGIN');
    await c2.query('BEGIN');

    // C1 acquires product row lock
    await c1.query('SELECT product_id FROM products WHERE product_id = $1 FOR UPDATE', [testProductId]);

    // C2 attempts to acquire product row lock - should block until C1 commits
    let c2Acquired = false;
    const c2LockPromise = c2.query('SELECT product_id FROM products WHERE product_id = $1 FOR UPDATE', [testProductId])
      .then(() => { c2Acquired = true; });

    // Verify C2 is currently blocked waiting for C1
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(c2Acquired, false, 'Client 2 must be blocked on product row lock');

    // C1 completes insert
    await c1.query('UPDATE product_images SET is_primary = false WHERE product_id = $1', [testProductId]);
    const img1 = await c1.query(`
      INSERT INTO product_images (product_id, image_url, sort_order, is_primary)
      VALUES ($1, 'https://bucket.s3.amazonaws.com/products/88888/c1.webp', 0, true)
      RETURNING image_id, is_primary
    `, [testProductId]);
    await c1.query('COMMIT');

    // C2 unblocks and completes
    await c2LockPromise;
    assert.equal(c2Acquired, true, 'Client 2 should unblock upon C1 commit');

    await c2.query('UPDATE product_images SET is_primary = false WHERE product_id = $1', [testProductId]);
    const img2 = await c2.query(`
      INSERT INTO product_images (product_id, image_url, sort_order, is_primary)
      VALUES ($1, 'https://bucket.s3.amazonaws.com/products/88888/c2.webp', 1, true)
      RETURNING image_id, is_primary
    `, [testProductId]);
    await c2.query('COMMIT');

    // Verify final state: exactly 1 primary image exists
    const primaryCheck = await adminClient.query(`
      SELECT image_id, image_url, is_primary 
      FROM product_images 
      WHERE product_id = $1 AND is_primary = true
    `, [testProductId]);

    assert.equal(primaryCheck.rowCount, 1, 'Exactly one primary image must exist');
    assert.equal(primaryCheck.rows[0].image_id, img2.rows[0].image_id, 'Second primary write must be the active primary');

    // Verify first image was smoothly demoted to is_primary = false
    const img1Check = await adminClient.query('SELECT is_primary FROM product_images WHERE image_id = $1', [img1.rows[0].image_id]);
    assert.equal(img1Check.rows[0].is_primary, false, 'First image must have been demoted');
  });

  test('T08: Unique final_key constraint prevents duplicate row insertions for same object', async () => {
    const uploadId1 = '11111111-1111-1111-1111-111111111111';
    const uploadId2 = '22222222-2222-2222-2222-222222222222';
    const finalKey = 'products/88888/dedup-test.webp';

    // First completed upload succeeds
    await adminClient.query(`
      INSERT INTO media_uploads (upload_id, product_id, issuer_id, staging_key, final_key, expected_mime, expected_size, status, expires_at)
      VALUES ($1, $2, 1, 'uploads/88888/u1.webp', $3, 'image/webp', 1234, 'completed', NOW() + INTERVAL '5 minutes')
    `, [uploadId1, testProductId, finalKey]);

    // Second upload attempting to mark the same final_key as 'completed' violates UNIQUE constraint
    await assert.rejects(async () => {
      await adminClient.query(`
        INSERT INTO media_uploads (upload_id, product_id, issuer_id, staging_key, final_key, expected_mime, expected_size, status, expires_at)
        VALUES ($1, $2, 1, 'uploads/88888/u2.webp', $3, 'image/webp', 1234, 'completed', NOW() + INTERVAL '5 minutes')
      `, [uploadId2, testProductId, finalKey]);
    }, /idx_media_uploads_final_key|duplicate key/i);
  });

  test('T12: Transaction rollback leaves zero orphan cleanup jobs', async () => {
    await c1.query('BEGIN');
    await c1.query(`
      INSERT INTO media_cleanup_jobs (s3_key, reason)
      VALUES ('products/88888/rollback-test.webp', 'image_deletion')
    `);
    await c1.query('ROLLBACK');

    const check = await adminClient.query(`
      SELECT 1 FROM media_cleanup_jobs WHERE s3_key = 'products/88888/rollback-test.webp'
    `);
    assert.equal(check.rowCount, 0, 'Rolled-back transaction must leave no cleanup records in database');
  });
});
