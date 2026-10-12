const db = require('../config/db');
const { sendEmail } = require('../utils/mailer');

async function enqueueEmail(to, subject, html, text, eventKey = null) {
  const result = await db.query(`INSERT INTO email_jobs (event_key, recipient, subject, html, plain_text)
    VALUES ($1,$2,$3,$4,$5) ON CONFLICT (event_key) DO NOTHING RETURNING job_id`,
  [eventKey, to, subject, html, text]);
  return { success: true, queued: Boolean(result.rows.length) };
}

async function processOne() {
  const claim = await db.query(`UPDATE email_jobs SET status='sending', locked_at=NOW(), attempts=attempts+1
    WHERE job_id=(SELECT job_id FROM email_jobs
      WHERE (status='pending' AND next_attempt_at<=NOW()) OR (status='sending' AND locked_at<NOW()-INTERVAL '5 minutes')
      ORDER BY next_attempt_at, job_id FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING *`);
  if (!claim.rows.length) return false;
  const job = claim.rows[0];
  const sent = await sendEmail(job.recipient, job.subject, job.html, job.plain_text);
  if (sent.success) {
    await db.query(`UPDATE email_jobs SET status='sent', sent_at=NOW(), locked_at=NULL, last_error=NULL WHERE job_id=$1`, [job.job_id]);
  } else {
    await db.query(`UPDATE email_jobs SET status=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,
      next_attempt_at=NOW() + (POWER(2, LEAST(attempts, 5)) * INTERVAL '1 minute'), locked_at=NULL, last_error=$2 WHERE job_id=$1`,
    [job.job_id, sent.error || 'Unknown SMTP error']);
  }
  return true;
}

function startEmailWorker() {
  const timer = globalThis.setInterval(async () => {
    try { for (let i = 0; i < 10 && await processOne(); i++); }
    catch (error) { console.error('[EmailQueue] Worker error:', error); }
  }, 10000);
  timer.unref();
  return timer;
}

module.exports = { enqueueEmail, processOne, startEmailWorker };
