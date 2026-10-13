ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP;
CREATE TABLE auth_email_tokens (
  token_id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('verify', 'reset')),
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_auth_email_tokens_user_purpose ON auth_email_tokens(user_id, purpose);

CREATE TABLE email_jobs (
  job_id BIGSERIAL PRIMARY KEY,
  event_key VARCHAR(150) UNIQUE,
  recipient VARCHAR(254) NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  plain_text TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_at TIMESTAMP,
  sent_at TIMESTAMP,
  last_error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_email_jobs_due ON email_jobs(next_attempt_at, job_id) WHERE status IN ('pending','sending');
