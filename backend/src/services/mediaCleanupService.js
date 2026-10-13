const s3Service = require('./s3Service');
const adminProductModel = require('../models/adminProductModel');

async function processPendingJobs(limit = 10) {
  try {
    const jobs = await adminProductModel.claimPendingCleanupJobs(limit);
    if (!jobs || jobs.length === 0) return 0;

    for (const job of jobs) {
      try {
        if (s3Service.isProtectedSeedKey(job.s3_key)) {
          // Never delete shared seed assets
          await adminProductModel.completeCleanupJob(job.job_id);
          continue;
        }

        await s3Service.deleteS3Object(job.s3_key);
        await adminProductModel.completeCleanupJob(job.job_id);
      } catch (err) {
        const nextDelay = Math.min(300, (job.attempts || 1) * 30);
        await adminProductModel.failCleanupJob(job.job_id, err.message, nextDelay);
      }
    }
    return jobs.length;
  } catch (err) {
    console.error('Error processing media cleanup jobs:', err.message);
    return 0;
  }
}

let intervalId = null;

function startCleanupWorker(intervalMs = 60000) {
  if (process.env.NODE_ENV === 'test') return;
  if (intervalId) return;
  intervalId = global.setInterval(() => {
    processPendingJobs().catch(() => {});
  }, intervalMs);
}

function stopCleanupWorker() {
  if (intervalId) {
    global.clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = {
  processPendingJobs,
  startCleanupWorker,
  stopCleanupWorker,
};
