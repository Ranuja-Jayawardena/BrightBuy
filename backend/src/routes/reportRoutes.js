const express = require('express');
const controller = require('../controllers/salesReportController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();
router.use(requireAuth, requireRole('admin'));
router.get('/sales/revenue', controller.revenue);
router.get('/sales/top-products', controller.topProducts);
router.get('/sales/orders', controller.orders);
module.exports = router;
