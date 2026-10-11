process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_1234567890_test';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_1234567890_test';
process.env.FRONTEND_URL = 'http://localhost:3000';

const request = require('supertest');
const express = require('express');
const { authLimiter } = require('../src/middleware/rateLimiter');

// Mock db before importing app
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
}));

const app = require('../src/index');

describe('Security Headers, CORS & Rate Limiting', () => {
  describe('HTTP Security Headers (Helmet)', () => {
    it('should include Helmet security headers in responses', async () => {
      const res = await request(app).get('/');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('CORS Configuration', () => {
    it('should allow requests from configured FRONTEND_URL with credentials', async () => {
      const res = await request(app)
        .get('/')
        .set('Origin', 'http://localhost:3000');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should disallow unauthorized origins', async () => {
      const res = await request(app)
        .get('/')
        .set('Origin', 'http://malicious-website.com');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Rate Limiter Behavior', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      const rateLimitedApp = express();
      rateLimitedApp.use(express.json());

      // Create a test limiter with max 2 requests
      const testLimiter = require('express-rate-limit')({
        windowMs: 60 * 1000,
        max: 2,
        handler: (req, res) => {
          res.status(429).json({
            error: 'Too Many Requests',
            message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
            statusCode: 429,
          });
        },
      });

      rateLimitedApp.post('/test-limit', testLimiter, (req, res) => {
        res.status(200).json({ ok: true });
      });

      const res1 = await request(rateLimitedApp).post('/test-limit');
      expect(res1.status).toBe(200);

      const res2 = await request(rateLimitedApp).post('/test-limit');
      expect(res2.status).toBe(200);

      // Third request should be blocked
      const res3 = await request(rateLimitedApp).post('/test-limit');
      expect(res3.status).toBe(429);
      expect(res3.body).toEqual({
        error: 'Too Many Requests',
        message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
        statusCode: 429,
      });
    });
  });
});
