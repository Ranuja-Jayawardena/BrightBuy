const express = require('express');
const adminProductController = require('../controllers/adminProductController');
const adminCategoryController = require('../controllers/adminCategoryController');
const adminOrderController = require('../controllers/adminOrderController');
const adminInventoryController = require('../controllers/adminInventoryController');
const { requireAuth, requireRole, requireStaffRole } = require('../middleware/authMiddleware');
const multipartImageUpload = require('../middleware/multipartImageUpload');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

// Inventory management
router.get('/inventory', requireStaffRole('inventory_manager'), adminInventoryController.list);
router.put('/inventory/:variantId', requireStaffRole('inventory_manager'), adminInventoryController.adjust);

// Employee administration (Strictly super_admin)
router.post('/employees', requireStaffRole('super_admin'), adminInventoryController.createEmployee);
router.get('/employees', requireStaffRole('super_admin'), adminInventoryController.listEmployees);
router.put('/employees/:id', requireStaffRole('super_admin'), adminInventoryController.updateEmployee);
router.patch('/employees/:id/status', requireStaffRole('super_admin'), adminInventoryController.setEmployeeStatus);

// Order & delivery dispatching
router.get('/orders', requireStaffRole('order_dispatcher'), adminOrderController.list);
router.get('/orders/:id', requireStaffRole('order_dispatcher'), adminOrderController.detail);
router.put('/orders/:id/status', requireStaffRole('order_dispatcher'), adminOrderController.status);
router.put('/deliveries/:id/status', requireStaffRole('order_dispatcher'), adminOrderController.delivery);

// Category taxonomy
router.get('/categories', requireStaffRole('catalog_manager'), adminCategoryController.list);
router.post('/categories', requireStaffRole('catalog_manager'), adminCategoryController.create);
router.put('/categories/:id', requireStaffRole('catalog_manager'), adminCategoryController.update);
router.delete('/categories/:id', requireStaffRole('catalog_manager'), adminCategoryController.remove);

// Products catalog
router.get('/products', requireStaffRole('catalog_manager', 'inventory_manager'), adminProductController.listProducts);
router.get('/products/:id', requireStaffRole('catalog_manager', 'inventory_manager'), adminProductController.getProduct);
router.post('/products', requireStaffRole('catalog_manager'), adminProductController.createProduct);
router.put('/products/:id', requireStaffRole('catalog_manager'), adminProductController.updateProduct);
router.patch('/products/:id/status', requireStaffRole('catalog_manager'), adminProductController.setProductStatus);
router.delete('/products/:id', requireStaffRole('catalog_manager'), adminProductController.deleteProduct);

// Product images
router.post('/products/:id/images', requireStaffRole('catalog_manager'), multipartImageUpload, adminProductController.createImage);
router.put('/images/:id', requireStaffRole('catalog_manager'), adminProductController.updateImage);
router.delete('/images/:id', requireStaffRole('catalog_manager'), adminProductController.deleteImage);

// Product variants
router.post('/products/:id/variants', requireStaffRole('catalog_manager', 'inventory_manager'), adminProductController.createVariant);
router.put('/variants/:id', requireStaffRole('catalog_manager', 'inventory_manager'), adminProductController.updateVariant);
router.delete('/variants/:id', requireStaffRole('catalog_manager'), adminProductController.deleteVariant);

module.exports = router;
