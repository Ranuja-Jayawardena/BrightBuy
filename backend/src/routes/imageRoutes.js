const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');

// GET /api/images/:id - Redirect legacy image links to S3
router.get('/:id', imageController.getImage);

module.exports = router;
