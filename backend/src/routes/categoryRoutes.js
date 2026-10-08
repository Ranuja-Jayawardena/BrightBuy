const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// GET /api/categories - Hierarchical category tree
router.get('/', categoryController.getCategories);

module.exports = router;
