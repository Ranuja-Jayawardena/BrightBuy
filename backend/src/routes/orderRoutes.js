const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const requireCustomer = requireRole('customer');

router.post('/', requireAuth, requireCustomer, orderController.createOrder);
router.get('/', requireAuth, requireCustomer, orderController.getOrders);
router.get('/:id', requireAuth, requireCustomer, orderController.getOrderById);

module.exports = router;
