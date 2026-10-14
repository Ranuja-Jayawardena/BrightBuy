-- V36__media_uploads_and_cleanup_ledger.sql
-- Fix 6.3: Durable Upload Identity, Staging Isolation & Recoverable Media Cleanup

-- 1. Table: media_uploads
-- Tracks server-issued upload identities, staging keys, authoritative metadata, and final attachment state.
CREATE TABLE IF NOT EXISTS media_uploads (
    upload_id UUID PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    issuer_id INT NOT NULL REFERENCES users(user_id),
    staging_key VARCHAR(500) NOT NULL,
    final_key VARCHAR(500) NOT NULL,
    expected_mime VARCHAR(50) NOT NULL,
    expected_size INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'verifying', 'completed', 'failed'
    image_id INT REFERENCES product_images(image_id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_uploads_product_status 
    ON media_uploads(product_id, status);

CREATE INDEX IF NOT EXISTS idx_media_uploads_expiry 
    ON media_uploads(expires_at) 
    WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_uploads_final_key 
    ON media_uploads(final_key) 
    WHERE status = 'completed';

-- 2. Table: media_cleanup_jobs
-- Durable queue for background S3 object deletions (recoverable on failures, protects seed assets).
CREATE TABLE IF NOT EXISTS media_cleanup_jobs (
    job_id SERIAL PRIMARY KEY,
    s3_key VARCHAR(500) NOT NULL,
    reason VARCHAR(50) NOT NULL, -- 'image_deletion', 'staging_cleanup', 'abandoned_upload'
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_cleanup_pending 
    ON media_cleanup_jobs(status, next_retry_at) 
    WHERE status IN ('pending', 'failed');
