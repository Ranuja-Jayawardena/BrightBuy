const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const requireCustomer = requireRole('customer');

router.post('/create-session', requireAuth, requireCustomer, paymentController.createSession);

module.exports = router;
