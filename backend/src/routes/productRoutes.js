const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET /api/products - List products with pagination, search, category, brand, and sort
router.get('/', productController.getProducts);

// GET /api/products/:id - Product detail with variants, attributes, and image metadata
router.get('/:id', productController.getProductById);

module.exports = router;
