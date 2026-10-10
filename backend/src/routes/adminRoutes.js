const express = require('express');
const adminProductController = require('../controllers/adminProductController');
const adminCategoryController = require('../controllers/adminCategoryController');
const adminOrderController = require('../controllers/adminOrderController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const multipartImageUpload = require('../middleware/multipartImageUpload');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/orders', adminOrderController.list);
router.get('/orders/:id', adminOrderController.detail);
router.put('/orders/:id/status', adminOrderController.status);
router.put('/deliveries/:id/status', adminOrderController.delivery);

router.get('/categories', adminCategoryController.list);
router.post('/categories', adminCategoryController.create);
router.put('/categories/:id', adminCategoryController.update);
router.delete('/categories/:id', adminCategoryController.remove);

router.get('/products', adminProductController.listProducts);
router.get('/products/:id', adminProductController.getProduct);
router.post('/products', adminProductController.createProduct);
router.put('/products/:id', adminProductController.updateProduct);
router.delete('/products/:id', adminProductController.deleteProduct);

router.post('/products/:id/images', multipartImageUpload, adminProductController.createImage);
router.put('/images/:id', adminProductController.updateImage);
router.delete('/images/:id', adminProductController.deleteImage);

router.post('/products/:id/variants', adminProductController.createVariant);
router.put('/variants/:id', adminProductController.updateVariant);
router.delete('/variants/:id', adminProductController.deleteVariant);

module.exports = router;
