const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Use express.raw() to get the raw buffer for signature verification
// This route is excluded from global express.json() in index.js
router.post(
  '/lemonsqueezy',
  express.raw({ type: 'application/json' }),
  webhookController.handleLemonSqueezyWebhook
);

module.exports = router;
