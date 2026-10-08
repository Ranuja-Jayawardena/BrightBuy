const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');

// GET /api/images/:id - Serve product image binary data
router.get('/:id', imageController.getImage);

module.exports = router;
