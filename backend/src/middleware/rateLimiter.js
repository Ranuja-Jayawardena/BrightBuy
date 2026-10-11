const rateLimit = require('express-rate-limit');

/**
 * Shared JSON error response for rate limit violations
 * conforms to Phase 10 Shared Contract: { error, message, statusCode }
 */
const rateLimitHandler = (message) => (req, res) => {
  res.status(429).json({
    error: 'Too Many Requests',
    message: message || 'Too many requests from this IP, please try again later',
    statusCode: 429,
  });
};

/**
 * Strict rate limiter for sensitive authentication endpoints
 * (login, register, refresh) to prevent brute force attacks.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 100 : 20, // 20 requests per window in production/dev
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many authentication attempts from this IP, please try again after 15 minutes'),
  skip: (req) => process.env.NODE_ENV === 'test' && req.headers['x-skip-rate-limit'] === 'true',
});

/**
 * General rate limiter for all public API routes to prevent DoS
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 500, // 500 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many requests from this IP, please try again after 15 minutes'),
  skip: (req) => process.env.NODE_ENV === 'test' && req.headers['x-skip-rate-limit'] === 'true',
});

module.exports = {
  authLimiter,
  apiLimiter,
};
