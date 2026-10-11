process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_1234567890_test';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_1234567890_test';
process.env.FRONTEND_URL = 'http://localhost:3000';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');
const { signAccessToken, signRefreshToken } = require('../src/utils/jwt');

// Mock database pool
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
}));

// Import Express app after setting env and mocks
const app = require('../src/index');

describe('Auth Flow Endpoints & Security', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    db.connect.mockResolvedValue(mockClient);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201 with auth cookies', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // userCheck
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ user_id: 1, email: 'test@example.com', role: 'customer' }] }) // insert user
        .mockResolvedValueOnce({}) // insert customer
        .mockResolvedValueOnce({}) // insert refresh_token
        .mockResolvedValueOnce({}); // COMMIT

      const res = await request(app)
        .post('/api/auth/register')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          first_name: 'John',
          last_name: 'Doe',
          phone: '1234567890',
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Registration successful');
      expect(res.body.user).toEqual({
        user_id: 1,
        email: 'test@example.com',
        role: 'customer',
      });

      // Verify HttpOnly cookies set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('access_token='))).toBe(true);
      expect(cookies.some((c) => c.includes('refresh_token='))).toBe(true);
      expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);
    });

    it('should reject registration if email already exists with 409', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ exists: 1 }] });

      const res = await request(app)
        .post('/api/auth/register')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'duplicate@example.com',
          password: 'Password123!',
          first_name: 'Jane',
          last_name: 'Doe',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already exists');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user with valid credentials and return 200 with cookies', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPass123', 10);
      db.query
        .mockResolvedValueOnce({
          rows: [{ user_id: 2, email: 'user@example.com', password_hash: hashedPassword, role: 'customer' }],
        })
        .mockResolvedValueOnce({}); // insert refresh_token

      const res = await request(app)
        .post('/api/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'user@example.com',
          password: 'CorrectPass123',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.user.user_id).toBe(2);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('access_token='))).toBe(true);
      expect(cookies.some((c) => c.includes('refresh_token='))).toBe(true);
    });

    it('should return 401 when password does not match', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPass123', 10);
      db.query.mockResolvedValueOnce({
        rows: [{ user_id: 2, email: 'user@example.com', password_hash: hashedPassword, role: 'customer' }],
      });

      const res = await request(app)
        .post('/api/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 401 when user is not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/login')
        .set('x-skip-rate-limit', 'true')
        .send({
          email: 'unknown@example.com',
          password: 'SomePassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/refresh (Token Rotation)', () => {
    it('should rotate refresh token and issue new access & refresh tokens', async () => {
      const validRefreshToken = signRefreshToken({ user_id: 5 });
      const hashedStoredToken = await bcrypt.hash(validRefreshToken, 10);

      db.query
        .mockResolvedValueOnce({
          rows: [{ token_id: 101, token_hash: hashedStoredToken }],
        }) // find stored tokens
        .mockResolvedValueOnce({}) // delete old token
        .mockResolvedValueOnce({ rows: [{ role: 'customer' }] }) // get user role
        .mockResolvedValueOnce({}); // insert new rotated token

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('x-skip-rate-limit', 'true')
        .set('Cookie', [`refresh_token=${validRefreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Token refreshed');

      const cookies = res.headers['set-cookie'];
      expect(cookies.some((c) => c.includes('access_token='))).toBe(true);
      expect(cookies.some((c) => c.includes('refresh_token='))).toBe(true);
    });

    it('should return 401 when refresh token cookie is missing', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('x-skip-rate-limit', 'true');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid or expired refresh token');
    });

    it('should return 401 when refresh token signature is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('x-skip-rate-limit', 'true')
        .set('Cookie', ['refresh_token=invalid.token.signature']);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid or expired refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should delete token from DB and clear auth cookies', async () => {
      const validRefreshToken = signRefreshToken({ user_id: 3 });
      const hashedToken = await bcrypt.hash(validRefreshToken, 10);

      db.query
        .mockResolvedValueOnce({ rows: [{ token_id: 42, token_hash: hashedToken }] })
        .mockResolvedValueOnce({}); // DELETE

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`refresh_token=${validRefreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out');

      const cookies = res.headers['set-cookie'];
      expect(cookies.some((c) => c.includes('access_token=;'))).toBe(true);
      expect(cookies.some((c) => c.includes('refresh_token=;'))).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return authenticated user profile', async () => {
      const token = signAccessToken({ user_id: 9, role: 'customer' });
      db.query.mockResolvedValueOnce({
        rows: [{ user_id: 9, email: 'me@example.com', role: 'customer', first_name: 'Alice', last_name: 'Smith' }],
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`access_token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({
        user_id: 9,
        email: 'me@example.com',
        role: 'customer',
        first_name: 'Alice',
        last_name: 'Smith',
      });
    });

    it('should return 401 if access token cookie is missing', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Not authenticated');
    });
  });
});
