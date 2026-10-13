const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const imageController = require('../controllers/imageController');

// GET /api/products - List products with pagination, search, category, brand, and sort
router.get('/', productController.getProducts);

// Register before /:id so "suggestions" is not parsed as a product ID.
router.get('/suggestions', productController.getSuggestions);
// Compatibility alias for image URLs previously generated under /api/products.
router.get('/images/:id', imageController.getImage);

// GET /api/products/:id - Product detail with variants, attributes, and image metadata
router.get('/:id', productController.getProductById);

module.exports = router;
