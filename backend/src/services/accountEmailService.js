const crypto = require('crypto');
const db = require('../config/db');
const { hashPassword } = require('../utils/password');

const digest = token => crypto.createHash('sha256').update(token).digest('hex');
const site = () => (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
const safe = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function issueToken(userId, email, purpose) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = purpose === 'verify' ? '24 hours' : '1 hour';
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM auth_email_tokens WHERE user_id=$1 AND purpose=$2', [userId, purpose]);
    await client.query(`INSERT INTO auth_email_tokens (user_id,purpose,token_hash,expires_at)
      VALUES ($1,$2,$3,NOW()+($4::interval))`, [userId, purpose, digest(token), expires]);
    const url = `${site()}/${purpose === 'verify' ? 'verify-email' : 'reset-password'}?token=${token}`;
    const subject = purpose === 'verify' ? 'Verify your BrightBuy email' : 'Reset your BrightBuy password';
    const text = `${subject}\n\nOpen this link within ${expires}: ${url}\n\nIf you did not request this, ignore this email.`;
    await client.query(`INSERT INTO email_jobs (recipient,subject,html,plain_text) VALUES ($1,$2,$3,$4)`,
      [email, subject, `<p>${safe(subject)}</p><p><a href="${safe(url)}">Continue</a></p><p>This link expires in ${expires}.</p>`, text]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function consumeToken(token, purpose, password) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return false;
  const passwordHash = purpose === 'reset' ? await hashPassword(password) : null;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(`SELECT token_id,user_id FROM auth_email_tokens
      WHERE token_hash=$1 AND purpose=$2 AND used_at IS NULL AND expires_at>NOW() FOR UPDATE`, [digest(token), purpose]);
    if (!found.rows.length) { await client.query('ROLLBACK'); return false; }
    const { token_id, user_id } = found.rows[0];
    if (purpose === 'verify') await client.query('UPDATE users SET email_verified_at=COALESCE(email_verified_at,NOW()) WHERE user_id=$1', [user_id]);
    else {
      await client.query('UPDATE users SET password_hash=$2,updated_at=NOW() WHERE user_id=$1', [user_id, passwordHash]);
      await client.query('DELETE FROM refresh_tokens WHERE user_id=$1', [user_id]);
    }
    await client.query('UPDATE auth_email_tokens SET used_at=NOW() WHERE token_id=$1', [token_id]);
    await client.query('COMMIT');
    return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

module.exports = { issueToken, consumeToken };
