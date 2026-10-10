const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', addressController.getAddresses);
router.post('/', addressController.addAddress);
router.put('/:id', addressController.updateAddress);
router.delete('/:id', addressController.removeAddress);
router.put('/:id/default', addressController.setDefault);

module.exports = router;
