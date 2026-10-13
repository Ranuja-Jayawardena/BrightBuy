const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authController.me);
router.post('/request-verification', authLimiter, authController.requestVerification);
router.post('/verify-email', authLimiter, authController.verifyEmail);
router.post('/forgot-password', authLimiter, authController.requestPasswordReset);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.put('/profile', requireAuth, authController.updateProfile);
router.put('/password', requireAuth, authController.updatePassword);

module.exports = router;
